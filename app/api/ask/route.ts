import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { embed } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Please sign in first.', { status: 401 });
  if (!rateLimit(`ask:${user.id}`, 15)) return new Response('Too many questions. Please wait a minute.', { status: 429 });
  try {
    const { question } = await request.json(); if (typeof question !== 'string' || !question.trim()) return new Response('Question is required.', { status: 400 });
    const vector = await embed(question); const { data: notes, error } = await supabase.rpc('match_items', { query_embedding: vector, match_user_id: user.id, match_threshold: 0, match_count: 8 }); if (error) throw error;
    const sources = notes ?? []; const context = sources.map((n: { title: string; summary: string; raw_content: string }, i: number) => `[${i + 1}] ${n.title}\n${n.summary ?? ''}\n${(n.raw_content ?? '').slice(0, 2400)}`).join('\n\n');
    const system = 'Answer ONLY using the provided notes. If they do not contain the answer, say so explicitly. Cite note titles inline.';
    const prompt = `Question: ${question}\n\nNotes:\n${context || '(No notes found)'}`;
    let stream: AsyncIterable<unknown>; let provider: 'anthropic' | 'openai' = 'anthropic';
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      stream = await client.messages.stream({ model: 'claude-sonnet-4-6', max_tokens: 1200, system, messages: [{ role: 'user', content: prompt }] });
    } catch (anthropicError) {
      if (!process.env.OPENAI_API_KEY) throw anthropicError;
      provider = 'openai';
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      stream = await client.chat.completions.create({ model: 'gpt-4.1-mini', stream: true, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] });
    }
    const encoder = new TextEncoder(); const body = new ReadableStream({ async start(controller) { controller.enqueue(encoder.encode(JSON.stringify({ sources }) + '\n')); for await (const streamEvent of stream) { const text = provider === 'anthropic' ? (() => { const event = streamEvent as { type?: string; delta?: { type?: string; text?: string } }; return event.type === 'content_block_delta' && event.delta?.type === 'text_delta' ? event.delta.text : undefined; })() : (streamEvent as { choices?: Array<{ delta?: { content?: string | null } }> }).choices?.[0]?.delta?.content ?? undefined; if (text) controller.enqueue(encoder.encode(text)); } controller.close(); } });
    return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Sources-Format': 'json-first-line' } });
  } catch (error) { return new Response(error instanceof Error ? error.message : 'Could not answer that question.', { status: 500 }); }
}
