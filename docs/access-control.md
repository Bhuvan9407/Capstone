# Access Control

Least-privilege matrix, session design, and enforcement points.

## Roles

| Role | Can | Cannot |
|---|---|---|
| **Student** | Own evidence CRUD, resume upload, job targets, grounded chat, agent runs, plan lifecycle, mentor invitations, grant scope control, own reviews (comment), own portfolio | Read anyone else's content; become mentor/admin via registration (role is server-assigned) |
| **Mentor** | Read **only grant-covered** evidence/resumes; open reviews on shared evidence; comment; give practice suggestions; read-only feedback on confirmed plans of granted students | See any student content without an active grant; react to unshared ids (403); do anything before admin verification |
| **Admin** | Mentor verification, abuse report processing, moderation (disable/enable public content), service health, audit trail | Read private student documents. Admins never get automatic access to private docs — by design (spec 4). Registration cannot create admins; admins are created via `npm run create-admin`. |

## Sessions

- `POST /api/auth/login` issues an opaque cookie `coach_sid` (HttpOnly, SameSite=Lax,
  secure in production). DB stores only its SHA-256 hash — DB compromise ≠ session theft.
- TTL from `SESSION_TTL_HOURS` (default 168h). `POST /api/auth/logout` revokes the row.
- Password change/reset revoke **all** user sessions.
- `GET /api/auth/me` is the source of truth for the client's role claim; the client
  never derives privileges from URL or state.

## Email verification gate

`requireVerifiedEmail` middleware protects every content route. Unverified accounts
can authenticate-adjacent actions only (`/auth/me`, logout). This also protects
mentors: invitation acceptance fails with 403 until verified.

**Sign-in requires a verified email** (`tester: alva.dsouza` note — pending mentor has
emailVerified but not `mentorVerified`; powers are gated separately, see below).

## CSRF

Double-submit pattern:
- `coach_csrf` cookie (JS-readable) + `X-CSRF-Token` header must match.
- Enforced on all mutating `/api` routes except `/auth/*` (login/register/forgot/
  verify/reset — no session yet), but `/auth/change-password` IS protected since a
  session exists there.
- Implemented in `middleware/csrf.js`; rejected mutations return 403.

## Enforcement points (server-side only)

| Point | Where |
|---|---|
| Ownership filter on every student read/write | service layer (`evidenceService`, `resumeRoutes`, etc.) |
| Retrieval scope filter before vector search | `ai/retrievalService.js` → `scopeFilter()` |
| Grant gates for every mentor read/comment | `mentorService.assertGrantAccess` + route-level membership checks |
| Tool executor re-checks session user | `preparationAgentService.js` executors |
| Zod schema validation of every request body | `middleware/validate.js` + `validators/index.js` |
| Zod validation of agent tool arguments before execution | `preparationAgentService.js` tool wrappers |
| Rate limiting (per-IP, tighter on auth) | `middleware/rateLimit.js` |
| Admin-only routes | `requireRole('admin')` |

## Grant lifecycle

1. Student invites mentor by email → `mentor_invitations` (7-day token).
2. Verified mentor accepts with the email token → creates an **empty** active grant.
3. Student assigns exact scope (evidence ids + resume ids) through `POST /api/grants`
   (validation confirms ownership of every id being shared).
4. Student can re-scope or revoke any time. Revocation (or grant `status: revoked`)
   ends API + retrieval access **immediately** (covered by test #5).

## Moderation vs privacy

- Abuse reports accept anonymous and signed-in reporters; targets validated as
  reachable content kinds only.
- `POST /admin/moderation` toggles **public visibility** (portfolio publish state,
  comment flag) — it does not expose private records to staff.
- All admin actions write to `audit_logs` (append-only trail).

## Client guards (defence in depth, not authorization)

`RequireAuth` + role wrappers in `client/src/App.jsx` read the role from `/auth/me`
and redirect role mismatches to that role's own home. This is UX, not security — the
server enforces everything.
