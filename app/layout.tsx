import './globals.css'; import Link from 'next/link';
export const metadata = { title: 'Second Brain', description: 'Your private knowledge graph' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><header className="border-b border-slate-800 bg-slate-950/80"><nav className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-4"><Link href="/" className="mr-auto text-lg font-bold text-cyan-300">Second Brain</Link><Link href="/capture">Capture</Link><Link href="/items">Items</Link><Link href="/graph">Graph</Link><Link href="/ask">Ask</Link><Link href="/login" className="text-slate-400">Account</Link></nav></header><main className="mx-auto max-w-6xl px-4 py-8">{children}</main></body></html>; }

