import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { classify, embed } from '@/lib/ai';
import { extractFile, extractUrl } from '@/lib/extract';
import { rateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  if (!rateLimit(`capture:${user.id}`, 10)) return NextResponse.json({ error: 'Too many captures. Please wait a minute.' }, { status: 429 });
  try {
    const form = await request.formData(); const kind = String(form.get('kind') ?? 'note'); let rawContent = ''; let title = String(form.get('title') ?? '').trim() || undefined; let sourceUrl: string | undefined; let filePath: string | undefined;
    if (kind === 'link') { sourceUrl = String(form.get('url') ?? ''); if (!URL.canParse(sourceUrl)) throw new Error('Enter a valid URL.'); const extracted = await extractUrl(sourceUrl); rawContent = extracted.content; title ||= extracted.title; }
    else if (kind === 'file') { const file = form.get('file'); if (!(file instanceof File) || !file.size) throw new Error('Choose a PDF, Markdown, or text file.'); if (file.size > 12 * 1024 * 1024) throw new Error('Files must be smaller than 12 MB.'); rawContent = await extractFile(file); title ||= file.name; const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); filePath = `${user.id}/${crypto.randomUUID()}-${safeName}`; const { error } = await supabase.storage.from('uploads').upload(filePath, file, { contentType: file.type || 'text/plain' }); if (error) throw error; }
    else rawContent = String(form.get('content') ?? '').trim();
    if (!rawContent.trim()) throw new Error('There was no text to save.');
    const metadata = await classify(rawContent, title); const vector = await embed(`${metadata.title}\n${metadata.summary}\n${rawContent}`);
    const { data: item, error } = await supabase.from('items').insert({ user_id: user.id, type: kind === 'link' ? 'link' : kind === 'file' ? (filePath?.endsWith('.pdf') ? 'pdf' : 'file') : 'note', raw_content: rawContent, source_url: sourceUrl, file_path: filePath, ...metadata, embedding: vector }).select().single();
    if (error) throw error;
    const { data: matches, error: searchError } = await supabase.rpc('match_items', { query_embedding: vector, match_user_id: user.id, match_threshold: 0.72, match_count: 6 });
    if (searchError) throw searchError;
    const candidates = (matches ?? []).filter((match: { id: string }) => match.id !== item.id).slice(0, 5);
    const rows = candidates.map((match: { id: string; similarity: number }) => ({ source_id: item.id, target_id: match.id, similarity: match.similarity }));
    const { data: links, error: linkError } = rows.length ? await supabase.from('links').upsert(rows, { onConflict: 'source_id,target_id' }).select() : { data: [], error: null };
    if (linkError) throw linkError;
    return NextResponse.json({ item, links: links ?? [] }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Capture failed. Try again.' }, { status: 400 }); }
}
