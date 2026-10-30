# CloudPulse

Cloud monitoring and AI incident intelligence. See the build phases in the project spec.

## Status
- [x] Phase 1-2: architecture and plan
- [x] `packages/shared`: state machine, SSRF guard, redaction, schemas, env validation, logger (102 tests)
- [x] Phase 3 foundation: Next.js home page and app routing
- [ ] Phase 3: authentication and dashboard UI
- [ ] Phase 4+: monitor pipeline, dashboard, incidents, notifications (Resend), Gemini analysis, deployment

## Local
```bash
pnpm install
pnpm dev        # starts the Next.js app at http://localhost:3000
pnpm test        # runs every workspace's tests; no cloud services required
pnpm typecheck
pnpm build
```
Copy `.env.example` to `.env` and fill in placeholders. Use Application Default Credentials locally (`gcloud auth application-default login`).

## Vercel
Set the project Root Directory to `cloudpulse` (the folder containing this package.json) and use the Next.js framework preset.
