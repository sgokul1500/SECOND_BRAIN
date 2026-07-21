import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import pdf from 'pdf-parse';
export async function extractUrl(url: string) {
  const response = await fetch(url, { headers: { 'User-Agent': 'SecondBrain/1.0' }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Could not fetch URL (HTTP ${response.status}).`);
  const dom = new JSDOM(await response.text(), { url }); const article = new Readability(dom.window.document).parse();
  const content = article?.textContent?.replace(/\s+/g, ' ').trim(); if (!content) throw new Error('No readable article text was found at that URL.');
  return { content, title: article.title ?? new URL(url).hostname };
}
export async function extractFile(file: File) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) { const parsed = await pdf(Buffer.from(await file.arrayBuffer())); return parsed.text; }
  return await file.text();
}
