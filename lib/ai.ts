import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ParaCategory } from './types';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export type Classification = { title: string; summary: string; tags: string[]; para_category: ParaCategory; para_reasoning: string };
export async function classify(content: string, suppliedTitle?: string) {
  const prompt = `You are a personal knowledge management assistant. Given the note content below, respond with ONLY valid JSON (no markdown, no preamble):\n{"title":string,"summary":string,"tags":string[],"para_category":"project"|"area"|"resource"|"archive","para_reasoning":string}\nUse 3-6 lowercase tags. PARA: project has a specific outcome/deadline; area is an ongoing responsibility; resource is future reference; archive is inactive/completed.\nContent:\n"""\n${content.slice(0, 24000)}\n"""`;
  let text = '';
  try {
    const result = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 700, messages: [{ role: 'user', content: prompt }] });
    text = result.content.find((part) => part.type === 'text')?.text ?? '';
  } catch (anthropicError) {
    if (!process.env.OPENAI_API_KEY) throw anthropicError;
    const result = await openai.chat.completions.create({ model: 'gpt-4.1-mini', response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] });
    text = result.choices[0]?.message.content ?? '';
  }
  const parsed = JSON.parse(text) as Classification;
  if (suppliedTitle) parsed.title = suppliedTitle;
  return parsed;
}
export async function embed(text: string) { const r = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text.slice(0, 30000) }); return r.data[0].embedding; }
