# AI Evaluation Protocol

How the AI-assisted features were evaluated. **Honesty note:** this document is the
evaluation *protocol* — the exact queries to run and the expected behaviour. It does
not claim benchmark scores, latencies, or pass rates that were not measured. Where a
query depends on the running Ollama model, results vary by machine; the app's contract
is about *behaviour* (grounded never fabricated), not model eloquence.

## What every answer must satisfy

1. **Groundedness** — answers cite sources drawn only from the session user's own
   evidence/resumes/chunks, or fall back to the labelled insufficient-evidence reply.
2. **Honest fallbacks** — with Ollama offline: `503 MODEL_UNAVAILABLE` on extraction/
   chat/agent; with Atlas vector index absent: keyword retrieval labelled
   `mode:"keyword"` + user-visible notice.
3. **Coverage ≠ probability** — comparison labels describe *documented evidence*
   coverage, never hiring likelihood.
4. **Boundedness** — agent: max steps/time budget from config; every tool call
   validated by Zod and telemetered in `agent_runs`.

## Evaluation queries (18)

Run: seed data (`npm run seed`), login as priya.sharma@example.edu,

| # | Query / action | Endpoint or screen | Grounding source | Expected honest behaviour |
|---|---|---|---|---|
| 1 | Ask: "What backend projects of mine demonstrate Express?" | `POST /api/career-chat` | own evidence + resume chunks | Answer names only seeded projects; lists sources block |
| 2 | Ask a question about a skill you never documented (e.g. "What is my Kubernetes experience?") | `POST /api/career-chat` | retrieval returns ≤0 sources | "No grounded evidence" reply; no invented claim |
| 3 | Ask with Ollama stopped | `POST /api/career-chat` | — | 503 `MODEL_UNAVAILABLE` with actionable message |
| 4 | Ask after deleting the resume while evidence remains | `POST /api/career-chat` | evidence chunks only | Sources shrink; nothing references deleted resume |
| 5 | Another student's account asks about "student management system" | `POST /api/career-chat` (student 2) | **empty** scope | Ungrounded reply; the other student's evidence is never cited |
| 6 | Extract requirements from a full job posting | `POST /api/job-targets/:id/extract` | rawDescription → LLM | Requirements appear flagged `inferred`; nothing stored as confirmed |
| 7 | Extract with Ollama offline | same | — | 503, no fabricated requirement rows |
| 8 | Confirm requirements after deselecting one inferred row | `PATCH /api/job-targets/:id/confirm` | student's own edit | Confirmed set persists exactly minus deselected row |
| 9 | `GET /api/job-targets/:id/compare` — requirement backed by 2 evidence sources | matchingService | evidence + resume excerpts | Row labelled `supported`; excerpt quoted |
| 10 | compare — requirement with only weak/ambiguous support | same | weak excerpt | `partial` or `unverified`; never upgraded to supported |
| 11 | compare — requirement with no support | same | none | `missing`; honest gap, no "close enough" |
| 12 | Check coverage meta on compare response | same | — | `coverage.definition` present; UI shows "NOT a fit score" |
| 13 | Run agent on confirmed target 8h/wk × 4wk | `POST /api/preparation-agent` | tool `readRequirements` → confirmed reqs only | Draft plan; toolCalls all `success`; plan status `draft` |
| 14 | Agent with target that has **no** evidence matches | same | `findEvidence` returns empty | Gaps scheduled honestly; plan says everything is new practice |
| 15 | Agent with malformed targetId | same | — | 422 validation error before any tool runs |
| 16 | Agent run failure telemetry | `GET /api/preparation-agent/runs/:id` | agent_runs doc | Failed run has `error` recorded; never reported as success (test #15 in suite) |
| 17 | Keyword fallback labelling | any retrieval path with vector index unavailable | keyword match | Response carries `retrieval: { mode:"keyword", notice }` and UI renders notice |
| 18 | Plan item completion is student-side only | `PATCH /api/plans/:id/items/complete` | own plan | Mentor cannot mark items complete (plan feedback route is text-only) |

## Manual verification checklist

- [ ] With Ollama offline: chat, extraction and agent pages show explicit "model
      offline" states (no spinner-forever, no fake content).
- [ ] With Ollama online + vector index absent: retrieval notices say keyword mode.
- [ ] `npm run seed` fixtures produce the answers above without editing data.
- [ ] Agent telemetry row count equals the number of tool calls; statuses never lie.

## Test suite coverage of these behaviours

`server/tests/security.test.js` (16 tests, all passing) covers the security-relevant
subset: retrieval isolation (#5), grant revocation immediacy, session-pinned
ownership, tool-argument validation (#15), failed-tool honesty (#16), single-use
reset tokens, CSRF rejection, and concurrent plan confirmation idempotency.
