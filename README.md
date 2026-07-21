# Second Brain

A private knowledge-management app built with Next.js, Supabase, Claude, OpenAI embeddings, and an interactive graph.

## Features

- Capture notes, readable URLs, PDFs, Markdown, and text files.
- Claude produces titles, summaries, tags, and PARA classification reasoning.
- OpenAI embeddings find related notes and create graph edges at a 0.72 similarity threshold.
- Interactive filterable knowledge graph, item editing/deletion, and RAG Q&A with streamed answers and source links.
- Supabase Auth and row-level security isolate every user's data.

## Local setup

1. Install Node.js 20 or newer, then run:

   ```powershell
   npm install
   npm run build
   npm run dev
   ```

2. Copy `.env.example` to `.env.local` and fill values. The Supabase URL must be the project base URL, such as `https://PROJECT_REF.supabase.co` — not its REST endpoint.

3. In Supabase SQL Editor, run [`supabase/migrations/20260721000000_second_brain.sql`](supabase/migrations/20260721000000_second_brain.sql), or with a linked CLI:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. Confirm the `items` and `links` tables exist:

   ```sql
   select table_name from information_schema.tables where table_schema = 'public' and table_name in ('items', 'links');
   
   ```

5. In Supabase Dashboard → Authentication → URL Configuration, add `http://localhost:3000` and your Vercel URL as redirect URLs.

## GitHub and Vercel deployment

```powershell
git add .
git status --short # Verify .env.local is absent
git commit -m "Build Second Brain"
git remote add origin https://github.com/YOUR_ACCOUNT/second-brain.git
git push -u origin main
npx vercel login
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add ANTHROPIC_API_KEY production
npx vercel env add OPENAI_API_KEY production
npx vercel --prod
```

Paste each secret only when prompted. Finally verify the returned URL:

```powershell
curl.exe -I https://YOUR_DEPLOYMENT.vercel.app
```

## Screenshot / GIF

Add a product screenshot or walkthrough GIF here after deployment.
