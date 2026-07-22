import type { ParaCategory } from './types';

export type Classification = { title: string; summary: string; tags: string[]; para_category: ParaCategory; para_reasoning: string };

type OpenRouterResponse = { choices?: Array<{ message?: { content?: string | null } }>; error?: { message?: string } };
const VECTOR_DIMENSIONS = 1536;

async function openRouterChat(prompt: string) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error('OpenRouter is not configured. Add OPENROUTER_API_KEY to the server environment.');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000', 'X-Title': 'Second Brain' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free', messages: [{ role: 'user', content: prompt }], max_tokens: 1200 }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => ({})) as OpenRouterResponse;
  if (!response.ok) {
    if (response.status === 401 || /authentication|api key|authorization/i.test(payload.error?.message ?? '')) throw new Error('OpenRouter rejected the API key. Create a new key at openrouter.ai/keys and replace OPENROUTER_API_KEY.');
    if (response.status === 429) throw new Error('OpenRouter free-tier rate limit reached. Please try again shortly.');
    throw new Error(payload.error?.message ?? `OpenRouter request failed (HTTP ${response.status}).`);
  }
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenRouter returned no usable text.');
  return text;
}

function parseJson<T>(text: string) { return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()) as T; }

// A deterministic, normalized local vector avoids paid embedding API calls.
function localEmbedding(text: string) {
  const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) ?? [];
  for (const token of tokens) { let hash = 2166136261; for (let index = 0; index < token.length; index++) hash = Math.imul(hash ^ token.charCodeAt(index), 16777619); const slot = (hash >>> 0) % VECTOR_DIMENSIONS; vector[slot] += (hash & 1) === 0 ? 1 : -1; }
  const magnitude = Math.hypot(...vector);
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}

export async function classify(content: string, suppliedTitle?: string) {
  const prompt = `You are a personal knowledge management assistant. Return only valid JSON with this exact shape:\n{"title":string,"summary":string,"tags":string[],"para_category":"project"|"area"|"resource"|"archive","para_reasoning":string}\nUse 3-6 lowercase tags. PARA: project has a specific outcome/deadline; area is an ongoing responsibility; resource is future reference; archive is inactive/completed.\nContent:\n"""\n${content.slice(0, 24000)}\n"""`;
  const parsed = parseJson<Classification>(await openRouterChat(prompt));
  if (suppliedTitle) parsed.title = suppliedTitle;
  return parsed;
}

export async function embed(text: string) { return localEmbedding(text.slice(0, 30000)); }
export async function answerFromNotes(system: string, prompt: string) { return openRouterChat(`${system}\n\n${prompt}`); }
