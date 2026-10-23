# Architecture

Career Evidence and Portfolio Coach — a full-stack platform where students document
real evidence (projects, repos, resumes, certifications) and every AI-assisted step is
grounded in that record. The core design rule: **the application never invents a
student's skills or achievements.**

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, React Router v6, Lucide icons, Recharts |
| Backend | Node.js + Express (ES modules) |
| Database | MongoDB Atlas / local `mongod`, Mongoose ODM |
| AI | Ollama (local LLM + embeddings), no external paid APIs |
| Retrieval | Atlas Vector Search cosine index, with a clearly-labelled keyword fallback |
| Auth | Argon2id password hashing, opaque server-side sessions |
| Tests | Vitest + Supertest (16 security/privacy tests), Playwright (e2e) |

```
client (Vite :5173, proxies /api)  →  Express API (:5000)  →  MongoDB
                                          │
                                          ├─ Ollama  (:11434, chat + embeddings)
                                          └─ uploads/ (resume files, private)
```

## Request flow

1. `server.js` loads `config/index.js` (env-validated), connects Mongo, mounts `app.js`.
2. `app.js` wires middleware in order: CORS allowlist → session cookie parsing
   (opaque `coach_sid`, hashed index in `sessions`) → CSRF guard → rate limits →
   `/api` mount (`routes/index.js`) → error handler.
3. `routes/index.js` mounts domain routers. Mount order matters:
   - `planRoutes` is mounted at `/plans` **before** `mentorRoutes` so the student
     plan routes win; the mentor feedback route (`POST /plans/:planId/feedback`)
     falls through and is matched next.
   - `authRoutes` mounts first (public), `adminRoutes` last.
4. Route handlers validate bodies with **Zod** (`middleware/validate.js` +
   `validators/index.js`) and delegate to services.
5. Services own every authorization decision: ownership filters are applied to the
   Mongo query itself (`{ userId, _id }`, or grant scope filters), so IDs supplied in
   request bodies or model output cannot widen access.

## Session & CSRF design

- Cookie `coach_sid` carries a random token; the DB stores only its SHA-256 hash.
  Compromising a DB dump does not yield valid session tokens.
- CSRF: double-submit — a JS-readable `coach_csrf` cookie is echoed via the
  `X-CSRF-Token` header on every mutating `/api` call. `/auth/*` mutations are
  origin-checked instead (login needs CSRF-free first contact), except
  `/auth/change-password` which is authenticated anyway.
- Password change and password reset revoke **all** of a user's sessions.

## AI pipeline (bounded, honest)

- `ai/embeddingService.js` — thin Ollama HTTP client for embeddings and chat
  completions; `ollamaHealthCheck()` probes availability.
- `ai/retrievalService.js` — scoped retrieval: builds owner/grant Mongo filters
  **before** any vector search. If Ollama or the Atlas vector index is unavailable,
  a labelled keyword fallback runs (`mode: "keyword"` + a user-visible notice).
- `services/chatService.js` — grounded RAG chat. With no sources, the assistant
  explicitly answers "no grounded evidence" rather than fabricating.
- `services/preparationAgentService.js` — the bounded agent:
  - Tools: `readRequirements` → `findEvidence` → `schedulePractice`, each with a
    Zod schema validated **before** execution and telemetry per call (name, status,
    ms, error).
  - Tool executors re-resolve ownership against the **session** user id only.
  - Hard limits from config: `AGENT_MAX_STEPS`, `AGENT_TIME_BUDGET_MS`.
  - Output is a `PracticePlan` with `status: "draft"`; only an explicit student
    confirmation (guarded, idempotent update) saves it as confirmed.
- Honest failure everywhere: with Ollama offline, extraction/chat endpoints return
  **503 `MODEL_UNAVAILABLE`** instead of pretending.

## Frontend structure

- `src/services/api.js` — single axios instance (`/api`, `withCredentials`), CSRF
  header interceptor, 401 → session-expired redirect.
- `src/App.jsx` — route table; `RequireAuth` guards read the role only from
  `/auth/me` (never from URL/state). Role mismatch redirects to that role's home.
- `src/layouts/DashboardLayout.jsx` — role-aware sidebar (student / mentor / admin nav).
- `src/pages/{student,mentor,admin}` — feature pages; `src/components/ui/*` is the
  small design system (Button, Card, Badge, Field/Input/Select/Textarea, Feedback,
  PageHeading).

## Email

`EMAIL_ADAPTER=dev` stores mail in a `dev_inbox` collection, surfaced by
`GET /api/auth/dev-inbox` (dev/test only). Verification, reset and invite flows are
fully demo-able without an SMTP provider.

## Key trade-offs

- **Bounded determinism over autonomy:** the preparation agent is a fixed pipeline
  with validated tools, not a free-form loop. Every run is reproducible from its
  telemetry in `agent_runs`.
- **Honest 503s over fake answers:** AI-dependent screens show explicit unavailability
  states; nothing degrades silently into fabrication.
- **Coverage, not hiring prospects:** requirement comparison reports labelling
  categories (`supported / partial / missing / unverified`) that count *documented
  evidence only* — the UI states it is not a fit score or hiring probability.
