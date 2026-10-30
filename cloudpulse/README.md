# CloudPulse

Cloud monitoring and AI incident intelligence. See the build phases in the project spec.

## Status
- [x] Phase 1-2: architecture and plan
- [x] `packages/shared`: state machine, SSRF guard, redaction, schemas, env validation, logger (102 tests)
- [ ] Phase 3: web app UI foundation and authentication
- [ ] Phase 4+: monitor pipeline, dashboard, incidents, notifications (Resend), Gemini analysis, deployment

## Local
```bash
pnpm install
pnpm test        # runs every workspace's tests; no cloud services required
pnpm typecheck
```
Copy `.env.example` to `.env` and fill in placeholders. Use Application Default Credentials locally (`gcloud auth application-default login`).
