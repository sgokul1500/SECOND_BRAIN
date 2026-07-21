'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logout from '@/components/logout';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
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
    const result = mode === 'signup'
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (result.data.session) {
      router.push('/');
      router.refresh();
      return;
    }
    setMessage('Account created. Disable Confirm email in Supabase Authentication → Providers → Email, then sign in with this email and password.');
  }

  return <div className="mx-auto max-w-md">
    <h1 className="text-3xl font-bold">Account</h1>
    <p className="muted mt-2">Create an account once, then sign in using your email and password.</p>
    <div className="mt-6 flex gap-2">
      {([['signin', 'Sign in'], ['signup', 'Create account']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setMode(value); setMessage(''); }} className={mode === value ? '' : '!bg-slate-800 !text-slate-300'}>{label}</button>)}
    </div>
    <form onSubmit={submit} className="panel mt-3 space-y-3">
      <input className="w-full" type="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input className="w-full" type="password" required minLength={6} placeholder="Password (at least 6 characters)" value={password} onChange={(event) => setPassword(event.target.value)} />
      <button className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      {message && <p className="muted" role="status">{message}</p>}
    </form>
    <div className="mt-4"><Logout /></div>
  </div>;
}
