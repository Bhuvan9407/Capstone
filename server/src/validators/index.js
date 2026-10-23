import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(120)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'Include letters and numbers');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name too short').max(80),
  email: z.string().trim().email().max(160),
  password: passwordSchema,
  institution: z.string().trim().max(120).optional().or(z.literal('')),
  role: z.literal('student').catch('student'), // never assignable from the client
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1, 'Enter your password').max(120),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(120),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(160),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  newPassword: passwordSchema,
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  headline: z.string().trim().max(140).optional(),
  bio: z.string().trim().max(800).optional(),
  institution: z.string().trim().max(120).optional(),
});

const evidenceBase = z.object({
  kind: z.enum(['project', 'tech_skill', 'github_repo', 'readme', 'writeup', 'portfolio_link', 'certification', 'achievement', 'course']),
  title: z.string().trim().min(2).max(140),
  organization: z.string().trim().max(140).optional().default(''),
  description: z.string().trim().max(4000).optional().default(''),
  repoUrl: z.string().trim().url().max(500).optional().or(z.literal('')).default(''),
  demoUrl: z.string().trim().url().max(500).optional().or(z.literal('')).default(''),
  techSkills: z.array(z.string().trim().min(1).max(40)).max(30).optional().default([]),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  status: z.enum(['draft', 'unverified', 'claimed', 'verified']).optional().default('unverified'),
  statusNotes: z.string().trim().max(500).optional().default(''),
});

export const evidenceSchema = evidenceBase.refine(
  (v) => !v.endedAt || !v.startedAt || v.endedAt >= v.startedAt,
  {
    message: 'endedAt must be after startedAt',
    path: ['endedAt'],
  }
);

export const evidencePatchSchema = evidenceBase.partial();

export const jobTargetCreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  organization: z.string().trim().max(120).optional().default(''),
  city: z.string().trim().max(120).optional().default(''),
  jobDescription: z.string().trim().min(10, 'Paste the full job posting text').max(20000),
});

export const jobTargetPatchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  organization: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  jobDescription: z.string().trim().min(10).max(20000).optional(),
});

export const requirementConfirmSchema = z.object({
  consolidatedSkills: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  requirements: z
    .array(
      z.object({
        statement: z.string().trim().min(2).max(300),
        category: z.enum(['language', 'framework', 'database', 'testing', 'devops', 'ai_ml', 'security', 'performance', 'tools', 'soft_skills', 'education', 'experience', 'other']),
        weight: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().default(2),
        inferred: z.boolean().optional().default(false),
      })
    )
    .min(1, 'Confirm at least one requirement')
    .max(25),
});

export const chatSchema = z.object({
  question: z.string().trim().min(3, 'Ask a question').max(4000),
  conversationId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  topK: z.coerce.number().int().min(1).max(10).optional().default(6),
});

export const preparationAgentSchema = z.object({
  jobTargetId: z.string().regex(/^[a-f\d]{24}$/i, 'jobTargetId must be a 24-char id'),
  hoursPerWeek: z.coerce.number().min(2).max(40).optional().default(8),
  weeks: z.coerce.number().int().min(1).max(12).optional().default(4),
});

export const planUpdateSchema = z.object({
  items: z
    .array(
      z.object({
        skill: z.string().trim().max(80),
        reqRef: z.object({ statement: z.string().max(300).optional(), category: z.string().max(40).optional() }).optional(),
        durationHours: z.number().min(0.5).max(20),
        assignedWeek: z.coerce.number().int().min(1).max(24),
        deliverable: z.string().max(300).optional().default(''),
        evidenceToRecord: z.string().max(300).optional().default(''),
      })
    )
    .max(50)
    .optional(),
  input: z
    .object({
      hoursPerWeek: z.number().min(1).max(60),
      durationWeeks: z.number().int().min(1).max(24),
    })
    .optional(),
});

export const planItemCompleteSchema = z.object({
  itemIndex: z.coerce.number().int().min(0).max(50),
  completed: z.boolean(),
});

export const mentorInviteSchema = z.object({
  mentorEmail: z.string().trim().email().max(160),
  note: z.string().trim().max(400).optional().default(''),
});

export const inviteAcceptSchema = z.object({
  token: z.string().min(10).max(200),
});

export const grantUpsertSchema = z.object({
  mentorId: z.string().regex(/^[a-f\d]{24}$/i),
  evidenceIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(200).optional().default([]),
  resumeIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(50).optional().default([]),
  note: z.string().max(400).optional().default(''),
});

export const joinSchema = loginSchema.extend({ token: z.string() });

export const reviewCreateSchema = z.object({
  studentId: z.string().regex(/^[a-f\d]{24}$/i),
  grantId: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string().trim().min(2).max(160),
  evidenceIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(200).optional().default([]),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment first').max(4000),
  evidenceId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
});

export const suggestionSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

export const portfolioVisibilitySchema = z.object({
  action: z.enum(['publish', 'unpublish']),
  changes: z
    .object({
      publicName: z.string().trim().min(2).max(80),
      headline: z.string().trim().max(160).default(''),
      intro: z.string().trim().max(1200).default(''),
      emailPublic: z.string().trim().max(120).default(''),
      githubUrl: z.string().trim().max(300).default(''),
      linkedinUrl: z.string().trim().max(300).default(''),
      school: z.string().trim().max(140).default(''),
      coursework: z.array(z.string().max(80)).max(40).default([]),
      expertise: z.array(z.string().max(40)).max(40).default([]),
      evidenceIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(200).default([]),
    })
    .partial()
    .optional(),
});

export const abuseReportSchema = z.object({
  targetKind: z.enum(['portfolio', 'comment', 'evidence']),
  targetId: z.string().regex(/^[a-f\d]{24}$/i),
  reason: z.enum(['abusive', 'plagiarism', 'privacy', 'other']),
  detail: z.string().trim().min(10).max(2000),
});

export const adminVerifyMentorSchema = z.object({
  mentorId: z.string().regex(/^[a-f\d]{24}$/i),
  verified: z.boolean().default(true),
});

export const adminProcessReportSchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']),
  resolutionNote: z.string().max(1000).optional().default(''),
});

export const adminModerationSchema = z.object({
  action: z.enum(['disable', 'enable']),
  reason: z.string().trim().max(500).optional().default(''),
});
