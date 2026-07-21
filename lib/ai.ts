import type { ParaCategory } from './types';

export type Classification = { title: string; summary: string; tags: string[]; para_category: ParaCategory; para_reasoning: string };

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; embeddings?: Array<{ values: number[] }>; embedding?: { values: number[] }; error?: { message?: string } };

async function geminiRequest(path: string, body: Record<string, unknown>) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as GeminiResponse;
  if (!response.ok) throw new Error(payload.error?.message ?? `Gemini request failed (HTTP ${response.status}).`);
  return payload;
}

async function generate(prompt: string, json = false) {
  const response = await geminiRequest('models/gemini-2.5-flash-lite:generateContent', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { ...(json ? { responseMimeType: 'application/json' } : {}), maxOutputTokens: 1200 },
  });
  const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  if (!text) throw new Error('Gemini returned no usable text.');
  return text;
}

export async function classify(content: string, suppliedTitle?: string) {
  const prompt = `You are a personal knowledge management assistant. Given the note content below, respond with valid JSON only:\n{"title":string,"summary":string,"tags":string[],"para_category":"project"|"area"|"resource"|"archive","para_reasoning":string}\nUse 3-6 lowercase tags. PARA: project has a specific outcome/deadline; area is an ongoing responsibility; resource is future reference; archive is inactive/completed.\nContent:\n"""\n${content.slice(0, 24000)}\n"""`;
  const parsed = JSON.parse(await generate(prompt, true)) as Classification;
  if (suppliedTitle) parsed.title = suppliedTitle;
  return parsed;
}

export async function embed(text: string) {
  const response = await geminiRequest('models/gemini-embedding-2:embedContent', {
    content: { parts: [{ text: text.slice(0, 30000) }] },
    output_dimensionality: 1536,
  });
  const vector = response.embeddings?.[0]?.values ?? response.embedding?.values;
  if (!vector || vector.length !== 1536) throw new Error('Gemini returned an invalid embedding vector.');
  return vector;
}

export async function answerFromNotes(system: string, prompt: string) {
  return generate(`${system}\n\n${prompt}`);
}
