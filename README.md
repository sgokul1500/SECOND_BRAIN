# Second Brain

A private knowledge-management app built with Next.js, Supabase, OpenRouter, and an interactive knowledge graph.

## Features

- Capture notes, readable URLs, PDFs, Markdown, and text files.
- OpenRouter free-model routing creates titles, summaries, tags, PARA classification, and RAG answers.
- Local 1,536-dimensional normalized vectors provide no-cost similarity linking.
- Interactive graph, searchable item list, editing, deletion, and private RAG Q&A.
- Supabase Auth and RLS isolate every user's data.

## Setup

1. Install Node.js 20+, then run:

   ```powershell
   npm install
   npm run build
   npm run dev
   ```

2. Copy `.env.example` to `.env.local`. Set the Supabase project base URL and create a new `OPENROUTER_API_KEY` at OpenRouter. Use `OPENROUTER_MODEL=openrouter/free` for free-model routing.

3. Run [the Supabase migration](supabase/migrations/20260721000000_second_brain.sql), then confirm `items` and `links` exist.

4. In Supabase Dashboard, disable **Authentication → Providers → Email → Confirm email** for direct email/password sign-in.

## Vercel environment variables

Set these in Vercel for Production, Preview, and Development as appropriate:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY
OPENROUTER_MODEL=openrouter/free
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Never commit `.env.local`. After configuring variables, deploy with `npx vercel --prod`.
