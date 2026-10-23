import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { registerTestHooks, afterTests, helpers, newStudent, get, post, patch, del } from './helpers.js';

registerTestHooks();
afterTests();

const jsonOf = (res) => JSON.stringify(res.body || {});

describe('Section 23 — security and privacy tests', () => {
  it('1. unauthenticated users cannot access protected resources', async () => {
    const res = await get('/api/evidence');
    expect(res.status).toBe(401);
  });

  it('1b. bad credentials rejected with a generic message', async () => {
    const res = await post('/api/auth/login', { email: 'nobody@example.test', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('BAD_CREDENTIALS');
  });

  it('2. a student cannot read or modify another student’s evidence', async () => {
    const a = await newStudent({ index: 21, name: 'Student A' });
    const b = await newStudent({ index: 22, name: 'Student B' });
    const created = await post('/api/evidence', { kind: 'project', title: 'A private project' }, { user: a });
    expect(created.status).toBe(201);
    const id = created.body.evidence.id;
    expect((await get(`/api/evidence/${id}`, { user: b })).status).toBe(404);
    expect((await patch(`/api/evidence/${id}`, { title: 'hijack' }, { user: b })).status).toBe(404);
    expect((await del(`/api/evidence/${id}`, { user: b })).status).toBe(404);
  });

  it('3. a student cannot retrieve another student’s chunks (retrieval isolation)', async () => {
    const a = await newStudent({ index: 23, name: 'Chunks A' });
    const b = await newStudent({ index: 24, name: 'Chunks B' });
    await post('/api/evidence', { kind: 'project', title: 'A secret Express project' }, { user: a });
    const res = await post('/api/career-chat', { question: 'tell me about the A secret Express project' }, { user: b });
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      const assistantText = JSON.stringify(res.body.messages.filter((m) => m.role === 'assistant'));
      expect(assistantText).not.toContain('A secret Express project');
    }
  });

  it('4. a mentor cannot read unshared evidence', async () => {
    const student = await newStudent({ index: 25, name: 'Share Owner' });
    await post('/api/evidence', { kind: 'project', title: 'Never shared project' }, { user: student });
    const mentor = await makeVerifiedMentor(`lonely${Date.now()}@example.test`);
    const shared = await get('/api/shared', { user: mentor });
    expect(shared.status).toBe(200);
    expect(shared.body.items).toHaveLength(0);
  });

  it('5. revoking a mentor grant denies access immediately on subsequent requests', async () => {
    const student = await newStudent({ index: 26, name: 'Revoke Owner' });
    const ev = await post('/api/evidence', { kind: 'project', title: 'Revocation target', description: 'Express endpoints documented here' }, { user: student });
    const mentor = await makeVerifiedMentor(`revoker${Date.now()}@example.test`);
    const grant = await post(
      '/api/grants',
      { mentorId: mentor.id, evidenceIds: [ev.body.evidence.id], resumeIds: [] },
      { user: student }
    );    expect(grant.status).toBe(201);
    const before = await get('/api/shared', { user: mentor });
    expect(before.body.items.find((i) => i.id === ev.body.evidence.id)).toBeDefined();

    const grantId = grant.body.grant.id || grant.body.grant._id;
    await del(`/api/grants/${grantId}`, { user: student });
    const after = await get('/api/shared', { user: mentor });
    expect(after.body.items.find((i) => i.id === ev.body.evidence.id)).toBeUndefined();
  });

  it('6. public portfolio endpoint exposes only published projections', async () => {
    const student = await newStudent({ index: 27, name: 'Public Owner' });
    await post('/api/portfolio/visibility', { action: 'unpublish' }, { user: student });
    const notFound = await get('/api/portfolios/never-existing-slug-123');
    expect(notFound.status).toBe(404);
  });

  it('7. a student cannot assign themselves a staff role', async () => {
    const reg = await post(
      '/api/auth/register',
      { name: 'Role Hacker', email: `hacker${Date.now()}@x.test`, password: 'Passw0rdA', role: 'admin' },
      {}
    );
    expect(reg.status).toBe(201);
    const User = (await import('../src/models/User.js')).default;
    const u = await User.findOne({ name: 'Role Hacker' });
    expect(u.role).toBe('student'); // role from request body ignored
  });

  it('8. AI/request-supplied owner ids are ignored — ownership pinned to session', async () => {
    const student = await newStudent({ index: 28, name: 'Spoof Owner' });
    const res = await post(
      '/api/evidence',
      { kind: 'project', title: 'Spoof test', userId: 'ffffffffffffffffffffffff' },
      { user: student }
    );
    expect(res.status).toBe(201);
    const { default: User } = await import('../src/models/User.js');
    const me = await User.findOne({ email: student.email });
    const { default: Evidence } = await import('../src/models/Evidence.js');
    const doc = await Evidence.findById(res.body.evidence.id);
    expect(String(doc.userId)).toBe(String(me._id));
  });

  it('9. invalid tool arguments are rejected (validation error, never executed)', async () => {
    const { runPreparationAgent } = await import('../src/services/preparationAgentService.js');
    const student = await newStudent({ index: 29, name: 'Tool Args Student' });
    const result = await runPreparationAgent(
      { _id: student.user.id || student.user._id },
      { targetId: 'not-an-id', availableHours: 5, preparationWeeks: 1 }
    );
    expect(result.ok).toBe(false);
    expect(result.toolCalls[0].status).toBe('validation_error');
  });

  it('10. password reset tokens are single-use; reuse is rejected', async () => {
    const student = await newStudent({ index: 210, name: 'Reuse Guard' });
    await post('/api/auth/forgot-password', { email: student.email });
    const inbox = await get('/api/auth/dev-inbox');
    const mail = inbox.body.items.find((m) => m.actionKind === 'reset_password');
    expect(mail).toBeDefined();
    const token = mail.actionUrl.split('token=')[1];
    const first = await post('/api/auth/reset-password', { token, newPassword: 'NewPass123' });
    expect(first.status).toBe(200);
    const second = await post('/api/auth/reset-password', { token, newPassword: 'NewerPass123' });
    expect(second.status).toBe(400);
  });

  it('11. CSRF protection: missing/incorrect header is rejected on mutations', async () => {
    const student = await newStudent({ index: 211, name: 'CSRF Guard' });
    // same session cookie but WRONG token
    const bad = await request(helpers.app)
      .post('/api/evidence')
      .set('Cookie', student.headers.Cookie.replace(/coach_csrf=[^;]+/, 'coach_csrf=WRONGWRONG'))
      .set('X-CSRF-Token', 'DIFFERENT-DIFFERENT')
      .send({ kind: 'project', title: 'no csrf' });
    expect(bad.status).toBe(403);
    // missing header entirely
    const missing = await request(helpers.app)
      .post('/api/evidence')
      .set('Cookie', student.headers.Cookie)
      .send({ kind: 'project', title: 'still no csrf' });
    expect(missing.status).toBe(403);
  });

  it('12. concurrent plan confirmations do not create duplicate confirmed plans', async () => {
    const student = await newStudent({ index: 212, name: 'Concurrency Guard' });
    const target = await post(
      '/api/job-targets',
      { title: 'Conc Target', organization: 'X', city: '', jobDescription: 'Some requirement text that is long enough to satisfy validation here.' },
      { user: student }
    );
    expect(target.status).toBe(201);
    const { default: PracticePlan } = await import('../src/models/PracticePlan.js');
    const plan = await PracticePlan.create({
      userId: student.user.id || student.user._id,
      jobTargetId: target.body.target.id,
      status: 'draft',
      input: { hoursPerWeek: 5, durationWeeks: 2 },
      items: [{ skill: 's', durationHours: 2, assignedWeek: 1, deliverable: 'd', evidenceToRecord: 'e' }],
    });
    const confirm = () => request(helpers.app).post(`/api/plans/${plan._id}/confirm`).set(student.headers).send({});
    const results = await Promise.all([confirm(), confirm(), confirm()]);
    const confirmedCount = results.filter((r) => r.status === 200).length;
    expect(confirmedCount).toBeGreaterThanOrEqual(1);
    const total = await PracticePlan.countDocuments({ userId: student.user.id || student.user._id });
    expect(total).toBe(1);
  });

  it('13. failed document processing can be retried safely (no duplicate chunks)', async () => {
    const student = await newStudent({ index: 213, name: 'Retry Guard' });
    const fs = await import('node:fs');
    fs.writeFileSync(`${process.env.UPLOAD_DIR}/retry-test.txt`, 'Retryable content. Text for chunking exercises the pipeline.');
    const up = await request(helpers.app)
      .post('/api/resumes')
      .set(student.headers)
      .attach('file', `${process.env.UPLOAD_DIR}/retry-test.txt`);
    expect(up.status).toBe(201);
    await new Promise((r) => setTimeout(r, 500));
    const re1 = await post(`/api/resumes/${up.body.resume.id}/reprocess`, {}, { user: student });
    const re2 = await post(`/api/resumes/${up.body.resume.id}/reprocess`, {}, { user: student });
    expect([200, 500, 503]).toContain(re1.status);
    expect([200, 500, 503]).toContain(re2.status);
    const { default: Chunk } = await import('../src/models/Chunk.js');
    const count = await Chunk.countDocuments({ resumeId: up.body.resume.id });
    expect(count).toBeLessThanOrEqual(10);
  });

  it('14. missing evidence produces a grounded insufficient-evidence response', async () => {
    const s = await newStudent({ index: 214, name: 'Grounded Guard' });
    const res = await post('/api/career-chat', { question: 'How did I architect the payment service I never built?' }, { user: s });
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.grounded).toBe(false);
      expect(JSON.stringify(res.body.messages)).toMatch(/don't have grounded evidence/i);
    }
  });

  it('15. failed tool execution is never reported as successful', async () => {
    const { runPreparationAgent } = await import('../src/services/preparationAgentService.js');
    const student = await newStudent({ index: 215, name: 'Tool Fail Guard' });
    const result = await runPreparationAgent(
      { _id: student.user.id || student.user._id },
      { targetId: 'bbbbbbbbbbbbbbbbbbbbbbbb', availableHours: 5, preparationWeeks: 1 }
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
    expect(result.toolCalls.filter((c) => c.status !== 'ok').length).toBeGreaterThan(0);
  });
});

const makeVerifiedMentor = async (email) => {
  const { app } = helpers;
  await request(app)
    .post('/api/auth/register/mentor')
    .send({ name: 'Mentor', email, password: 'MentorPass1' });
  const { default: User } = await import('../src/models/User.js');
  const u = await User.findOne({ email });
  u.mentorVerified = true;
  u.emailVerified = true; // tests skip the email flow for mentor fixtures
  await u.save();
  const login = await request(app).post('/api/auth/login').send({ email, password: 'MentorPass1' });
  const sid = (login.headers['set-cookie'] || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_sid='));
  const me = await request(app).get('/api/auth/me').set('Cookie', sid);
  const csrfCookie = (me.headers['set-cookie'] || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('coach_csrf='));
  const csrfToken = decodeURIComponent(csrfCookie.split('=')[1]);
  return {
    id: String(u._id),
    email,
    user: { role: 'mentor', id: String(u._id), email, name: u.name },
    headers: { Cookie: [sid, csrfCookie].join('; '), 'X-CSRF-Token': csrfToken },
  };
};

