# Decisions

- Supabase Auth uses direct email/password sign-up and sign-in. Keep Confirm email disabled in the Supabase Email provider so the app does not send confirmation or magic-link emails.
- Server routes use the authenticated Supabase session, so RLS remains effective. The service-role key is documented for operational use but is not used in request handlers.
- Claude is the preferred reasoning provider. OpenAI `gpt-4.1-mini` is a server-side fallback for classification and RAG when Claude is unavailable or its account has insufficient credit.
- Link extraction uses Readability; JavaScript-rendered or paywalled pages can fail gracefully.
- In-memory rate limiting is suitable for a single Vercel instance but should be replaced with Redis/Upstash for strict multi-instance rate limiting.
- Editing re-runs classification, embeddings, and similarity linking synchronously. A production queue can move that work to a background worker.
- The supplied Supabase URL in the brief included a duplicated `https:` prefix and `/rest/v1/`; `.env.example` uses the required project base URL format: `https://PROJECT_REF.supabase.co`.
