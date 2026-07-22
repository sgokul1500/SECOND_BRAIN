# Decisions

- Authentication uses direct email/password sign-up and sign-in; disable Confirm email in Supabase for this mode.
- Server routes use the authenticated Supabase session, so RLS remains effective. The service-role key is not used in request handlers.
- OpenRouter's `openrouter/free` model route is used server-side for classification and RAG. A local normalized 1,536-dimensional hash vector provides no-cost similarity linking; it is less semantically precise than a dedicated embedding API.
- URL extraction uses Readability; JavaScript-rendered or paywalled pages can fail gracefully.
- In-memory rate limiting is suitable for development but should be replaced with a shared store for strict multi-instance limits.
