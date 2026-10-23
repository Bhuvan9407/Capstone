# Data Model

Mongoose models under `server/src/models/`. Conventions: ObjectId refs indexed at
every ownership edge, `{ timestamps: true }`, collection names snake_case plural.

## Identity

| Model | Purpose | Key fields |
|---|---|---|
| `users` | Accounts of all three roles | `name`, `email` (unique), `passwordHash` (Argon2id), `role` (`student`\|`mentor`\|`admin`), `emailVerified`, `status`, `institution`, mentor fields: `mentorBio`, `mentorExpertise`, `mentorVerified`, `mentorVerifiedBy`, `mentorVerifiedAt`, `headline`, `bio`, `portfolioSlug` |
| `sessions` | Opaque sessions | `userId`, `tokenHash` (SHA-256 of cookie), `userAgent`, `ip`, `expiresAt`, `revokedAt` |
| `auth_tokens` | Single-use ops tokens | `kind` (`verify_email`\|`reset_password`), `tokenHash`, `meta`, `expiresAt`, `usedAt` |

Registration (`POST /api/auth/register`) always creates `role: "student"`; the role
field is never client-assignable. Mentor accounts require admin verification before
any grant/invitation operation works.

## Evidence core

| Model | Purpose | Key fields |
|---|---|---|
| `evidence` | The student's documented record | `userId`, `kind` (`project`\|`tech_skill`\|`github_repo`\|`readme`\|`writeup`\|`portfolio_link`\|`certification`\|`achievement`\|`course`), `title`, `organization`, `description`, `repoUrl`, `demoUrl`, `techSkills[]`, `startedAt/endedAt`, `status` (`draft`\|`unverified`\|`claimed`\|`verified`), `statusNotes`, `fromResumeId`, `mentorFeedback[]` |
| `resumes` | Uploaded resumes + pipeline state | `userId`, `fileName`, `mimeType`, `sizeBytes`, `storageKey` (private dir), `status` (`uploaded`\|`extracting`\|`embedding`\|`ready`\|`failed`), `pageCount`, `extractedText`, `skills[]`, `error` |
| `chunks` | Retrieval units | `ownerId` (= userId, always), `resumeId` \| `documentId`, `text`, `embedding[]`, `index`, `updatedAt` |
| `documents` | Fifth doc type record | `userId`, `kind`, `status`, `storageKey` |
| `job_targets` | Real job postings | `userId`, `title`, `organization`, `city`, `rawDescription`, `discoveredSkills[]`, `consolidatedSkills[]`, `hardReqs[]` (`{statement, category, weight, inferred}`), `status` (`draft`\|`extracting`\|`awaiting_confirmation`\|`confirmed`), `realizationError` |

Requirements only become authoritative after `PATCH /api/job-targets/:id/confirm`,
where the student confirms the final list. `inferred: true` marks AI-extracted rows;
students may edit or deselect them before confirming.

## Plans

| Model | Purpose | Key fields |
|---|---|---|
| `practice_plans` | Weekly preparation plans | `userId`, `jobTargetId`, `status` (`draft`\|`ready`\|`confirmed`), `confirmedAt`, `input {hoursPerWeek, durationWeeks}`, `focusSkills[]`, `items[]` (`{skill, reqRef, durationHours, assignedWeek, deliverable, evidenceToRecord, completed, completedAt}`), `mentorFeedback[]` |
| `agent_runs` | Agent telemetry | `userId`, `jobTargetId`, `status` (`completed`\|`failed`\|`running`), `toolCalls[]` (`{name, input, status, ms, error}`), `proposedPlan`, `error`, `createdDraftPlanId` |

Draft → confirmed is a guarded `$set` on `{_id, userId, status:'draft'}`; only the
first request wins, so concurrent/duplicate confirms cannot create second plans.

## Sharing (mentors)

| Model | Purpose | Key fields |
|---|---|---|
| `mentor_invitations` | Student → mentor invite tokens | `studentId`, `mentorEmail`, `mentorUserId`, `tokenHash`, `note`, `status` (`pending`\|`accepted`\|`revoked`), `expiresAt` (7 days), `acceptedAt`, `grantId` |
| `mentor_grants` | THE sharing record | `studentId`, `mentorId`, `evidenceIds[]`, `resumeIds[]`, `note`, `status` (`active`\|`revoked`), `grantedVia` |

Every mentor read/comment path calls `assertGrantAccess`, which must find an
`active` grant covering the exact content id. Accepting an invitation creates an
**empty** grant; students assign scope themselves via `POST /api/grants`
(replace-upsert per student↔mentor pair). Revocation is immediate on all API and
retrieval paths.

## Feedback

| Model | Purpose | Key fields |
|---|---|---|
| `reviews` | Mentor review over shared evidence | `studentId`, `mentorId`, `grantId`, `title`, `evidenceIds[]` (subset of grant), `status` (`open`\|`completed`), `practiceSuggestionsGiven[]` |
| `comments` | Thread messages on a review | `reviewId`, `authorId`, `authorRole`, `body`, `evidenceId` (optional anchor) |

## Public content

| Model | Purpose | Key fields |
|---|---|---|
| `portfolios` | Public student portfolio | `userId` (unique), `slug` (unique sparse), `publicName`, `headline`, `intro`, `emailPublic`, `githubUrl`, `linkedinUrl`, `school`, `coursework[]`, `expertise[]`, `evidenceIds[]`, `isPublished` |
| `role_guides` | Public mentor-authored guides | `title` (unique), `headline`, `summary`, `skills[]`, `evidenceIdeas[]`, `sortOrder` |

The public portfolio projection (`GET /api/portfolios/:slug`) exposes an explicit
whitelist only — never user internals, drafts stay hidden everywhere.

## Governance

| Model | Purpose | Key fields |
|---|---|---|
| `abuse_reports` | Public + in-app reports | `reporterId` (nullable = anonymous), `targetKind` (`portfolio`\|`comment`\|`evidence`), `targetId`, `reason` (`abusive`\|`plagiarism`\|`privacy`\|`other`), `detail`, `status` (`open`\|`resolved`\|`dismissed`), `resolutionNote`, `resolvedBy/At` |
| `moderation_actions` | Disable/enable records | `contentType` (`portfolio`\|`comment`), `contentId`, `action` (`disable`\|`enable`), `reason`, `byId` |
| `audit_logs` | Append-only governance trail | `action` (e.g. `mentor.verified`, `abuse.processed`, `password.reset`), `actorId`, `targetType/Id`, `detail`, `ip`, `createdAt` |
| `conversations` / `messages` | Career chat history | `userId`, `title`; `messages`: `conversationId`, `userId`, `role`, `content`, `sources[]` |
| `dev_inbox` | Dev/test mail adapter | `to`, `subject`, `text`, `actionKind`, `actionUrl` |

## Isolation rules encoded in the schema

- Every student-owned document carries the owner id on the document itself; every
  query path filters by it — no cross-student reads even with valid ids.
- `chunks.ownerId` duplicates the resume owner so retrieval scope filtering is a
  single-field match even after joins.
- Grant scope is checked before any model call in mentor reads; the mentor role has
  no other path to student content, and admins have none by design.
