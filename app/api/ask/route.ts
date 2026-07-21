import { createClient } from '@/lib/supabase/server';
import { answerFromNotes, embed } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Please sign in first.', { status: 401 });
  if (!rateLimit(`ask:${user.id}`, 15)) return new Response('Too many questions. Please wait a minute.', { status: 429 });
  try {
    const { question } = await request.json();
    if (typeof question !== 'string' || !question.trim()) return new Response('Question is required.', { status: 400 });
    const vector = await embed(question);
    const { data: notes, error } = await supabase.rpc('match_items', { query_embedding: vector, match_user_id: user.id, match_threshold: 0, match_count: 8 });
    if (error) throw error;
    const sources = notes ?? [];
    const context = sources.map((note: { title: string; summary: string; raw_content: string }, index: number) => `[${index + 1}] ${note.title}\n${note.summary ?? ''}\n${(note.raw_content ?? '').slice(0, 2400)}`).join('\n\n');
    const answer = await answerFromNotes('Answer ONLY using the provided notes. If they do not contain the answer, say so explicitly. Cite note titles inline.', `Question: ${question}\n\nNotes:\n${context || '(No notes found)'}`);
    const encoder = new TextEncoder();
    const body = new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(JSON.stringify({ sources }) + '\n' + answer)); controller.close(); } });
    return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Sources-Format': 'json-first-line' } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Could not answer that question.', { status: 500 });
  }
}
