/**
 * Synthetic demonstration fixture seed. All personal data is synthetic.
 * Passwords are deterministic for local demo ONLY (never for production).
 *
 * Creates:
 *  - 1 student (Priya Sharma) + 1 unverified/pending mentor + 1 verified mentor + 1 admin
 *  - Multiple evidence entries + resume fixture + job target w/ confirmed reqs
 *  - Mentor invitation (accepted) + sharing grants + review + comments
 *  - Confirmed practice plan + portfolio (one published, one unpublished field)
 *
 * Usage:
 *   npm run seed           (adds or refreshes fixtures)
 *   npm run seed -- --clear
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { connectMongo } from '../src/config/index.js';
import { User, Evidence, Resume, JobTarget, PracticePlan, Portfolio, MentorGrant, Review, Comment, RoleGuide, DevInbox } from '../src/models/index.js';

const PASSWORD = 'DemoPass123';

const clear = async () => {
  await Promise.all([
    User.deleteMany({}), Evidence.deleteMany({}), Resume.deleteMany({}), JobTarget.deleteMany({}),
    PracticePlan.deleteMany({}), Portfolio.deleteMany({}), MentorGrant.deleteMany({}),
    MentorInvitation.deleteMany({}), Review.deleteMany({}), Comment.deleteMany({}),
    RoleGuide.deleteMany({}), DevInbox.deleteMany({}),
  ]);
};

const upsertUser = async (doc) => {
  // Upsert so re-running the seed repairs demo accounts (e.g. verification flags).
  return User.findOneAndUpdate({ email: doc.email }, { $set: doc }, { upsert: true, new: true });
};

const run = async () => {
  await connectMongo();
  if (process.argv.includes('--clear')) {
    await clear();
    console.log('[seed] database cleared');
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await argon2.hash(PASSWORD);

  // 1. Accounts --------------------------------------------------------------
  const student = await upsertUser({
    name: 'Priya Sharma',
    email: 'priya.sharma@example.edu',
    passwordHash,
    role: 'student',
    emailVerified: true,
    institution: 'Sunrise Institute of Technology',
  });
  const mentor = await upsertUser({
    name: 'Rahul Mehta',
    email: 'rahul.mehta@example.org',
    passwordHash,
    role: 'mentor',
    mentorVerified: true,
    emailVerified: true,
    mentorBio: 'Backend engineer (9 yrs, fintech)',
    mentorExpertise: ['Express', 'MongoDB', 'REST', 'Testing'],
  });
  const pendingMentor = await upsertUser({
    name: 'Alva Dsouza',
    email: 'alva.dsouza@example.org',
    passwordHash,
    role: 'mentor',
    mentorVerified: false,
    emailVerified: true, // can sign in; verification gates mentor powers, not sign-in
    mentorBio: 'QA engineer',
  });
  await upsertUser({
    name: 'Dr. Anita Rao',
    email: 'anita.rao@example.edu',
    passwordHash,
    role: 'admin',
    emailVerified: true,
  });

  // 2. Evidence --------------------------------------------------------------
  const evidence = {
    studentSystem: await Evidence.findOneAndUpdate(
      { userId: student._id, title: 'Student Management System (Express + MongoDB)' },
      {
        userId: student._id,
        kind: 'project',
        title: 'Student Management System (Express + MongoDB)',
        organization: 'Sunrise Institute of Technology',
        description:
          'A multi-page management app for students and attendance. Exposes REST endpoints for listing, creating, editing and deleting student records, with validation and a Mongo-backed persistence layer. Generates weekly attendance summaries.',
        repoUrl: 'https://github.com/priya-demo/student-management-system',
        techSkills: ['Express', 'MongoDB', 'Mongoose', 'JavaScript', 'REST'],
        status: 'unverified',
        startedAt: new Date('2025-06-01'),
        endedAt: new Date('2025-09-15'),
      },
      { upsert: true, new: true }
    ),
    authExperiment: await Evidence.findOneAndUpdate(
      { userId: student._id, title: 'Auth Experiments — JWT + sessions notebook' },
      {
        userId: student._id,
        kind: 'writeup',
        title: 'Auth Experiments — JWT + sessions notebook',
        description:
          'Personal write-up comparing token vs session state handling. Documents login flows and why cookies need CSRF pairing. Documentation only — no deployed implementation yet.',
        techSkills: ['Authentication', 'JWT', 'Sessions', 'Security'],
        status: 'draft',
      },
      { upsert: true, new: true }
    ),
  };

  // 3. Resume fixture (text-only, no real upload) ------------------------------
  const resumeText = `PRIYA SHARMA — Computer Science undergraduate
SKILLS: JavaScript, Express, MongoDB, Git, HTML/CSS basic
PROJECTS:
- Student Management System: Express REST endpoints, Mongo persistence, request validations.
- Auth notebooks: JWT vs session cookies, CSRF notes.
COURSEWORK: Data Structures, DBMS, Web Technology.`;
  const resume = await Resume.findOneAndUpdate(
    { userId: student._id, fileName: 'priya-sharma-resume.txt' },
    {
      userId: student._id,
      fileName: 'priya-sharma-resume.txt',
      mimeType: 'text/plain',
      sizeBytes: resumeText.length,
      extractedText: resumeText,
      error: null,
      status: 'ready',
      skills: ['JavaScript', 'Express', 'MongoDB', 'Git', 'HTML', 'CSS'],
    },
    { upsert: true, new: true }
  );

  // 4. Job target with confirmed requirements ----------------------------------
  const jdText = `Internship — Backend Development Intern, NimbusWorks
We are looking for a backend development intern who has built REST APIs.
REQUIRED:
- Strong Express(Node.js) REST API skills; building data routes and request validation.
- MongoDB data modelling, queries, and indexing.
- Testing: written automated tests for authorization flows.
- Git workflow basics.
NICE TO HAVE: Docker, basic deployment experience.`;
  const target = await JobTarget.findOneAndUpdate(
    { userId: student._id, title: 'Backend Development Intern' },
    {
      userId: student._id,
      title: 'Backend Development Intern',
      organization: 'NimbusWorks',
      city: 'Bengaluru (hybrid)',
      status: 'ready',
      rawDescription: jdText,
      consolidatedSkills: ['Express', 'MongoDB', 'Mongoose', 'Authorization Testing', 'Git', 'REST', 'Docker'],
      discoveredSkills: [],
      hardReqs: [
        { statement: 'Express (Node.js) REST APIs, building data routes with validation', category: 'framework', weight: 3, inferred: false },
        { statement: 'MongoDB data modelling, queries and indexing', category: 'database', weight: 3, inferred: false },
        { statement: 'Automated tests for authorization flows', category: 'security', weight: 2, inferred: false },
        { statement: 'Git workflow basics', category: 'tools', weight: 2, inferred: false },
        { statement: 'Basic deployment experience (nice to have)', category: 'devops', weight: 1, inferred: false },
      ],
    },
    { upsert: true, new: true }
  );

  // 5. Accepted mentor invitation + sharing grant -------------------------------
  const grant = await MentorGrant.findOneAndUpdate(
    { studentId: student._id, mentorId: mentor._id },
    {
      studentId: student._id,
      mentorId: mentor._id,
      evidenceIds: [evidence.studentSystem._id],
      resumeIds: [resume._id],
      status: 'active',
      grantedVia: 'seed',
      note: 'Please review my Express project and resume.',
    },
    { upsert: true, new: true }
  );

  // 6. Review + comment --------------------------------------------------------
  let review = await Review.findOne({ mentorId: mentor._id, studentId: student._id });
  if (!review) {
    review = await Review.create({
      mentorId: mentor._id,
      studentId: student._id,
      grantId: grant._id,
      title: 'Backend internship readiness (Express project review)',
      status: 'open',
      suggestedImprovements: ['Write REST endpoint tests', 'Add authorization checks demo'],
    });
  }
  const mentorComment = await Comment.findOne({ reviewId: review._id, authorId: mentor._id });
  if (!mentorComment) {
    await Comment.create({
      reviewId: review._id,
      authorId: mentor._id,
      authorRole: 'mentor',
      body: "The Student Management System README documents Express endpoints well. Add one integration test for the student create route — great interview talking point.",
      evidenceId: evidence.studentSystem._id,
    });
  }

  // 7. Plan + portfolio --------------------------------------------------------
  await PracticePlan.findOneAndUpdate(
    { userId: student._id, jobTargetId: target._id },
    {
      userId: student._id,
      jobTargetId: target._id,
      status: 'confirmed',
      confirmedAt: new Date(),
      input: { hoursPerWeek: 8, durationWeeks: 4 },
      focusSkills: ['AuthorizationTesting', 'Deployment', 'MongoDB', 'Docker', 'Testing'],
      items: [
        { skill: 'MongoDB', assignedWeek: 1, durationHours: 3, deliverable: 'Add indexes and seed data to the Student Management System; record queries tried.' },
        { skill: 'Authorization Testing', assignedWeek: 2, durationHours: 4, deliverable: 'Add integration tests covering authorization outcomes; record a snippet in the README.' },
        { skill: 'Testing', assignedWeek: 3, durationHours: 4, deliverable: 'Write Jest/Supertest tests for the /students endpoints.' },
        { skill: 'Docker', assignedWeek: 4, durationHours: 4, deliverable: 'Containerize the app; document the Dockerfile and run steps.' },
      ],
    },
    { upsert: true, new: true }
  );

  await Portfolio.findOneAndUpdate(
    { userId: student._id },
    {
      userId: student._id,
      publicName: 'Priya Sharma',
      isPublished: true,
      headline: 'Aspiring backend developer',
      intro: 'Final-year BE student focused on Node.js + MongoDB projects. Student Management System available for review.',
      school: student.institution,
      coursework: ['DBMS', 'Web Technology'],
      expertise: ['Express', 'MongoDB'],
      evidenceIds: [evidence.studentSystem._id],
    },
    { upsert: true, new: true }
  );

  await Portfolio.findOneAndUpdate(
    { userId: pendingMentor._id },
    {
      userId: pendingMentor._id,
      publicName: 'UnpublishedDraft — Alva Dsouza',
      isPublished: false,
      headline: 'QA mentor (not public)',
      intro: 'This is an unpublished portfolio used to test that private drafts never leak publicly.',
    },
    { upsert: true, new: true }
  );

  // 8. Role guides --------------------------------------------------------------
  await RoleGuide.deleteMany({});
  await RoleGuide.create([
    {
      title: 'Backend Developer Intern',
      headline: 'What companies look for and how to prove it',
      summary: 'REST API design, data modelling, testing, deployment; document each project with concrete endpoints and test files.',
      skills: ['Express', 'MongoDB', 'Testing', 'Git', 'Docker'],
      evidenceIdeas: ['API project with README', 'Integration tests', 'Seed scripts'],
      sortOrder: 1,
    },
    {
      title: 'Frontend Developer Intern',
      headline: 'Component quality plus user-visible polish',
      summary: 'Component structure, state management, accessibility, testing; ship a small product live and record decisions.',
      skills: ['React', 'TypeScript', 'Tailwind', 'Vite', 'Playwright'],
      evidenceIdeas: ['Component library', 'A11y fix log', 'Deployed app link'],
      sortOrder: 2,
    },
    {
      title: 'Quality / QA Intern',
      headline: 'Who breaks the happy path',
      summary: 'Manual + automation flows, bug reports, coverage thinking; document test strategies and what your tests actually protect.',
      skills: ['Testing', 'Playwright', 'Cypress', 'Jira'],
      evidenceIdeas: ['Test plan doc', 'E2E suite', 'Bug report samples'],
      sortOrder: 3,
    },
  ]);

  console.log('[seed] demo data ready. Accounts:');
  console.log('  STUDENT  priya.sharma@example.edu   /', PASSWORD);
  console.log('  MENTOR   rahul.mehta@example.org    /', PASSWORD + '  (verified)');
  console.log('  ADMIN    anita.rao@example.edu      /', PASSWORD);
  console.log('  PENDING  alva.dsouza@example.org    /', PASSWORD + '  (mentor, unverified)');
};

export const seedAll = run;

const invokedDirectly = () =>
  ['seed.js', '\\seed.js', '/seed.js'].some((s) => process.argv[1]?.endsWith(s));

if (invokedDirectly()) {
  run()
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error('[seed] failed:', err);
      process.exit(1);
    });
}
