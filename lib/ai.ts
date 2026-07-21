import type { ParaCategory } from './types';

export type Classification = { title: string; summary: string; tags: string[]; para_category: ParaCategory; para_reasoning: string };

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; embeddings?: Array<{ values: number[] }>; embedding?: { values: number[] }; error?: { message?: string } };

async function openRouterRequest(path: string, body: Record<string, unknown>, json = false) {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in environment variables. Please add it to your .env.local file.');
  }
  console.log('OpenRouter request - Key exists:', !!openrouterKey, 'Key length:', openrouterKey.length);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openrouterKey}` },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: (body as any).contents?.[0]?.parts?.[0]?.text ?? JSON.stringify(body) }],
      max_tokens: 1200,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? `OpenRouter request failed (HTTP ${response.status}).`);
  return payload as any;
}

async function groqRequest(path: string, body: Record<string, unknown>, json = false) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY is not configured on the server.');
  const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: (body as any).contents?.[0]?.parts?.[0]?.text ?? JSON.stringify(body) }],
      max_tokens: 1200,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? `Groq request failed (HTTP ${response.status}).`);
  return payload as any;
}

async function generate(prompt: string, json = false) {
  const res = await openRouterRequest('', { contents: [{ role: 'user', parts: [{ text: prompt }] }] }, json);
  const text = (res as any).choices?.[0]?.message?.content ?? (res as any).choices?.[0]?.text ?? '';
  if (!text) throw new Error('AI returned no usable text.');
  return text;
}

export async function classify(content: string, suppliedTitle?: string) {
  const prompt = `You are a personal knowledge management assistant. Given the note content below, respond with valid JSON only:\n{"title":string,"summary":string,"tags":string[],"para_category":"project"|"area"|"resource"|"archive","para_reasoning":string}\nUse 3-6 lowercase tags. PARA: project has a specific outcome/deadline; area is an ongoing responsibility; resource is future reference; archive is inactive/completed.\nContent:\n"""\n${content.slice(0, 24000)}\n"""`;
  const parsed = JSON.parse(await generate(prompt, true)) as Classification;
  if (suppliedTitle) parsed.title = suppliedTitle;
  return parsed;
}

export async function embed(text: string) {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    const resp = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openrouterKey}` },
      body: JSON.stringify({ model: process.env.OPENROUTER_EMBEDDING_MODEL ?? 'text-embedding-3-large', input: text.slice(0, 30000) }),
    });
    const payload = await resp.json();
    if (!resp.ok) throw new Error(payload.error?.message ?? `OpenRouter embedding failed (HTTP ${resp.status}).`);
    const vector = payload.data?.[0]?.embedding ?? payload.data?.[0]?.vector;
    if (!vector || !Array.isArray(vector)) throw new Error('OpenRouter returned an invalid embedding vector.');
    return vector as number[];
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY is not configured on the server.');
  const response = await fetch('https://api.groq.com/openai/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', input: text.slice(0, 30000) }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? `Groq embedding failed (HTTP ${response.status}).`);
  const vector = payload.data?.[0]?.embedding;
  if (!vector || !Array.isArray(vector)) throw new Error('Groq returned an invalid embedding vector.');
  return vector as number[];
}

export async function answerFromNotes(system: string, prompt: string) {
  return generate(`${system}\n\n${prompt}`);
}
