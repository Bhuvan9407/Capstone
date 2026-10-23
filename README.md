# Career Evidence and Portfolio Coach

A full-stack student career platform built around one principle: **everything the app
says about you is backed by evidence you documented yourself.** It never invents
skills, never fabricates achievements, and always says so honestly when it cannot
produce a grounded answer.

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS, React Router, Lucide, Recharts |
| Backend | Node.js, Express (ES modules), Zod validation, Argon2id, opaque sessions |
| Database | MongoDB (Atlas or local), Mongoose |
| AI | Ollama (local LLM + embeddings), QA-rated bounded agent with Zod-validated tools |
| Tests | Vitest + Supertest — **16/16 security & privacy tests passing**; Playwright for e2e |

## Feature map

- **Evidence Library** — projects, repos, readmes, write-ups, certifications with
  status provenance (`draft / unverified / claimed / verified`).
- **Resume pipeline** — upload → extract → embed with real processing states; retry
  replaces chunks (no duplicates); failures stay marked as failures.
- **Job Targets** — paste a real posting; AI extraction only *pre-fills*, the student
  confirms the final requirement list.
- **Requirements Compare** — every requirement labelled `supported / partial /
  missing / unverified` from documented evidence only. Deliberately labelled
  **"NOT a fit score"** — it is evidence coverage, not a hiring probability.
- **Career Chat** — grounded RAG over your own documents with citations; with no
  sources it answers "no grounded evidence" rather than inventing.
- **Preparation agent** — bounded pipeline (`readRequirements → findEvidence →
  schedulePractice`) producing a **draft** plan; explicit confirmation makes it
  official (idempotent, concurrency-safe).
- **Mentors** — invite by email, then grant exactly which items they can read; revoke
  cuts API + access immediately. Mentors cannot see anything unshared.
- **Portfolios** — explicit publish / unpublish; only a whitelisted projection is ever
  public; draft evidence never appears.
- **Admin** — mentor verification, abuse reports, moderation, service health, audit
  trail. Admins have **no automatic access** to student private documents.

## Quickstart

```bash
# 1. Install
npm install --prefix server
npm install --prefix client

# 2. Configure: copy .env.example → server/.env and fill in
#    - MONGO_URI (Atlas string, or mongodb://127.0.0.1:27017/career-coach)
#    - SESSION_SECRET (long random string)
#    - Ollama defaults point at http://localhost:11434

# 3. Seed demo data (students, mentors, admin, evidence, target, plan, review)
cd server && npm run seed

# 4. Run
npm run dev --prefix server   # API on :5000
npm run dev --prefix client   # app on :5173 (proxies /api to :5000)
```

### Demo accounts (from seed)

| Role | Email | Password |
|---|---|---|
| Student | `priya.sharma@example.edu` | `DemoPass123` |
| Mentor (verified) | `rahul.mehta@example.org` | `DemoPass123` |
| Admin | `anita.rao@example.edu` | `DemoPass123` |
| Mentor (pending — for the admin verification queue) | `alva.dsouza@example.org` | `DemoPass123` |

Registration always creates **students**; mentors self-register separately and wait
for admin verification. In dev there is no SMTP — verification / reset / invitation
mail is captured by the dev-inbox adapter (`GET /api/auth/dev-inbox`, also surfaced in
the UI on the Verify Email / Forgot Password pages).

## Ollama + vector setup (optional but recommended)

1. Install [Ollama](https://ollama.com) and pull models:
   ```bash
   ollama pull llama3.1:8b
   ollama pull nomic-embed-text
   ```
2. Atlas only: create the vector index on `chunks` once
   ```bash
   cd server && npm run vector-index
   ```
   (or run `scripts/create-vector-index.js` against your cluster with search-capable tier).
3. Without Ollama, the app still runs: chat / extraction / agent answers become
   explicit **503 MODEL_UNAVAILABLE** states instead of fabricated content, and
   retrieval falls back to a labelled keyword mode when the vector index is absent.

## Environment

See `.env.example` for the full list. Highlights: `MONGO_URI`, `SESSION_SECRET`,
`SESSION_TTL_HOURS`, `EMAIL_ADAPTER=dev`, `UPLOAD_*`, `OLLAMA_*`, `RETRIEVAL_*`,
`AGENT_MAX_STEPS` / `AGENT_TIME_BUDGET_MS`, `COOKIE_SECURE`.

## Scripts

| Location | Script | Purpose |
|---|---|---|
| server | `npm run dev` | API server (port 5000) with watch |
| server | `npm run seed` | Upsert demo data (safe to re-run; `--clear` wipes) |
| server | `npm run create-admin` | Bootstrap an admin account interactively |
| server | `npm run vector-index` | Create the Atlas Vector Search index definition |
| server | `npm test` | Vitest suite (`tests/security.test.js`) |
| client | `npm run dev` / `build` | Vite dev server / production build |
| client | `npm run test:e2e` | Playwright specs |

## Tests

```bash
cd server
npx vitest run tests/security.test.js
```

Latest verified run (this machine, Oct 2026): **16 tests passed**, ~9s test time
(mongodb-memory-server per run). The suite covers: cross-student evidence and
retrieval isolation, mentor grant scoping + immediate revocation, session-pinned
ownership for AI endpoints, agent tool-argument validation and failed-tool honesty,
single-use reset tokens, CSRF rejection on mutations, and concurrent plan
confirmation idempotency.

## Project structure

```
client/                 React + Vite app (pages for student / mentor / admin + public)
server/
  src/                  config, middleware (auth/csrf/validate/rateLimit/error),
                        models (22), routes, services, ai (embedding + retrieval)
  scripts/              seed.js, create-admin.js, create-vector-index.js
  tests/                security.test.js + helpers
docs/                   architecture.md · data-model.md · access-control.md · ai-evaluation.md
postman/collection.json full API workspace (cookie-based auth, CSRF note inside)
```

## Security highlights

- Opaque sessions stored **hashed** in Mongo; HttpOnly, SameSite cookies.
- Double-submit CSRF envelope on all mutating API calls.
- Ownership filters live inside service/DB queries, never trust client-sent ids
  (covered by tests).
- Zod validation on every request body **and** every agent tool argument.
- Role/pending-mentor gating: `mentorVerified` required for any mentor power.
- Password change/reset revoke all sessions; reset tokens are single-use.
- Rate limits on auth routes; CORS allowlist (no wildcard).
- Admin is a maintenance role only — no automatic private-data access.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — layers, request flow, AI pipeline.
- [`docs/data-model.md`](docs/data-model.md) — all 22 models and relations.
- [`docs/access-control.md`](docs/access-control.md) — role matrix, sessions, CSRF, grants.
- [`docs/ai-evaluation.md`](docs/ai-evaluation.md) — 18-query AI evaluation protocol
  (documented expectations, not claimed scores).
