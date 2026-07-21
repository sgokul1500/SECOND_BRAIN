'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logout from '@/components/logout';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'password' | 'signup' | 'magic';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const client = createClient();
    const redirectTo = `${location.origin}/auth/callback`;
    const result = mode === 'signup'
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
      : mode === 'magic'
        ? await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
        : await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message === 'email rate limit exceeded'
        ? 'Email sending is temporarily rate-limited. Wait before trying again, or sign in with an existing password.'
        : result.error.message);
      return;
    }
    if (mode === 'password' || result.data.session) {
      router.push('/');
      router.refresh();
    } else {
      setMessage('Check your inbox for the confirmation link.');
    }
  }

  const needsPassword = mode !== 'magic';
  return <div className="mx-auto max-w-md">
    <h1 className="text-3xl font-bold">Account</h1>
    <p className="muted mt-2">Sign in with a password, create an account, or request a magic link.</p>
    <div className="mt-6 flex gap-2">
      {([['password', 'Sign in'], ['signup', 'Create account'], ['magic', 'Magic link']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setMode(value); setMessage(''); }} className={mode === value ? '' : '!bg-slate-800 !text-slate-300'}>{label}</button>)}
    </div>
    <form onSubmit={submit} className="panel mt-3 space-y-3">
      <input className="w-full" type="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
      {needsPassword && <input className="w-full" type="password" required minLength={6} placeholder="Password (at least 6 characters)" value={password} onChange={(event) => setPassword(event.target.value)} />}
      <button className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'magic' ? 'Send magic link' : 'Sign in'}</button>
      {message && <p className="muted" role="status">{message}</p>}
    </form>
    <div className="mt-4"><Logout /></div>
  </div>;
}
