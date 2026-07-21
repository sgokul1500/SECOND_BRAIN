# Decisions

- Supabase Auth uses direct email/password sign-up and sign-in. Keep Confirm email disabled in the Supabase Email provider so the app does not send confirmation or magic-link emails.
- Server routes use the authenticated Supabase session, so RLS remains effective. The service-role key is documented for operational use but is not used in request handlers.
- Gemini API is used server-side for classification, RAG answers, and 1,536-dimensional embeddings. It is available on a rate-limited free tier; this implementation does not expose the API key to browsers.
- Link extraction uses Readability; JavaScript-rendered or paywalled pages can fail gracefully.
- In-memory rate limiting is suitable for a single Vercel instance but should be replaced with Redis/Upstash for strict multi-instance rate limiting.
- Editing re-runs classification, embeddings, and similarity linking synchronously. A production queue can move that work to a background worker.
- The supplied Supabase URL in the brief included a duplicated `https:` prefix and `/rest/v1/`; `.env.example` uses the required project base URL format: `https://PROJECT_REF.supabase.co`.
