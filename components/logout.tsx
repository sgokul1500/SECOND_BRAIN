'use client'; import { createClient } from '@/lib/supabase/client'; import { useRouter } from 'next/navigation';
export default function Logout() { const router = useRouter(); return <button className="!bg-slate-800 !text-slate-200" onClick={async () => { await createClient().auth.signOut(); router.push('/login'); router.refresh(); }}>Sign out</button>; }

