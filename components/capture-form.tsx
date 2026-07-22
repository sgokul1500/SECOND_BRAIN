'use client';
import { useState } from 'react'; import { useRouter } from 'next/navigation';
export default function CaptureForm() { const [kind, setKind] = useState<'note'|'link'|'file'>('note'); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const router = useRouter();
 async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		setBusy(true);
		setMessage('Extracting, organizing, embedding, and linking…');
		try {
			const response = await fetch('/api/capture', { method: 'POST', body: new FormData(form) });
			let payload: any = {};
			try {
				payload = await response.json();
			} catch (err) {
				// invalid JSON response
				throw new Error(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
			}
			if (!response.ok) return setMessage(payload.error ?? 'Capture failed.');
			setMessage(`Saved “${payload.item.title}” with ${payload.links.length} new link(s).`);
			form.reset();
			router.refresh();
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Fetch failed');
		} finally {
			setBusy(false);
		}
	}
 return <form onSubmit={submit} className="panel space-y-4"><div className="flex flex-wrap gap-2">{(['note','link','file'] as const).map((value) => <button type="button" key={value} onClick={() => setKind(value)} className={kind === value ? '' : '!bg-slate-800 !text-slate-300'}>{value}</button>)}</div><input type="hidden" name="kind" value={kind} /><input name="title" placeholder="Optional title" className="w-full" />{kind === 'note' && <textarea name="content" required rows={7} className="w-full" placeholder="Write a thought, meeting note, or idea…" />}{kind === 'link' && <input name="url" required type="url" className="w-full" placeholder="https://example.com/article" />}{kind === 'file' && <input name="file" required type="file" accept=".pdf,.md,.txt,application/pdf,text/plain,text/markdown" className="w-full" />}<button disabled={busy} type="submit">{busy ? 'Processing…' : 'Save to brain'}</button>{message && <p className="muted" role="status">{message}</p>}</form>; }
