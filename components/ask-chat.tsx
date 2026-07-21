'use client';

import Link from 'next/link';
import { useState } from 'react';

type Source = { id: string; title: string; summary: string };

export default function AskChat() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setAnswer('');
    setSources([]);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!response.ok || !response.body) {
        setAnswer(await response.text());
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let headerBuffer = '';
      let receivedHeader = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (receivedHeader) {
          setAnswer((current) => current + chunk);
          continue;
        }
        headerBuffer += chunk;
        const newline = headerBuffer.indexOf('\n');
        if (newline < 0) continue;
        try {
          setSources(JSON.parse(headerBuffer.slice(0, newline)).sources as Source[]);
        } catch {
          // An answer is still useful if source metadata cannot be parsed.
        }
        setAnswer((current) => current + headerBuffer.slice(newline + 1));
        headerBuffer = '';
        receivedHeader = true;
      }
    } catch {
      setAnswer('Could not reach the answer service. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-5">
    <form onSubmit={ask} className="panel flex gap-2">
      <input className="min-w-0 flex-1" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What have I saved about?" required />
      <button disabled={busy}>{busy ? 'Thinking…' : 'Ask'}</button>
    </form>
    {answer && <section className="panel">
      <h2 className="font-semibold text-cyan-200">Answer</h2>
      <p className="mt-3 whitespace-pre-wrap leading-7">{answer}</p>
      {sources.length > 0 && <div className="mt-5 border-t border-slate-800 pt-4">
        <p className="muted mb-2">Sources searched</p>
        {sources.map((source) => <Link key={source.id} href={`/items/${source.id}`} className="block py-1 text-sm text-cyan-300 hover:underline">{source.title}</Link>)}
      </div>}
    </section>}
  </div>;
}
