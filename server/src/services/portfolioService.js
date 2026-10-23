import Portfolio, { PORTFOLIO_FIELDS } from '../models/Portfolio.js';
import Evidence from '../models/Evidence.js';
import User from '../models/User.js';
import { toOid, fail } from '../utils/core.js';

/**
 * Public portfolio projection (spec section 17).
 * The public endpoint returns ONLY this projection's explicit fields — never a
 * user/resume/document/evidence internal record, private chat data or grants.
 */

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 48) || 'portfolio';

export const getOwnPortfolio = async (userId) => {
  let doc = await Portfolio.findOne({ userId: toOid(userId) });
  if (!doc) doc = await Portfolio.create({ userId, publicName: 'Public portfolio' });
  return doc;
};

export const updatePortfolio = async (user, patch) => {
  const doc = await getOwnPortfolio(user._id);
  const allowed = [
    'publicName',
    'headline',
    'intro',
    'emailPublic',
    'githubUrl',
    'linkedinUrl',
    'school',
    'coursework',
    'expertise',
    'evidenceIds',
    'isPublished',
  ];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  for (const k of ['publicName', 'headline', 'intro', 'emailPublic', 'githubUrl', 'linkedinUrl', 'school']) {
    if (typeof clean[k] === 'string') clean[k] = clean[k].slice(0, k === 'intro' ? 1200 : 300);
  }
  if (typeof clean.isPublished === 'boolean' && clean.isPublished && !doc.slug) {
    let base = slugify(clean.publicName || user.name);
    let slug = base;
    let n = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await Portfolio.exists({ slug, userId: { $ne: user._id } })) {
      slug = `${base}-${++n}`.slice(0, 60);
      if (n > 99) break;
    }
    doc.slug = slug;
  }
  if (clean.evidenceIds) {
    // Only the student's own evidence may be projected.
    const owned = await Evidence.distinct('_id', { userId: user._id });
    const ownedSet = new Set(owned.map(String));
    clean.evidenceIds = (clean.evidenceIds || []).filter((id) => ownedSet.has(String(id)));
  }
  Object.assign(doc, clean);
  await doc.save();
  // Keep the user's public handle in sync.
  await User.updateOne({ _id: user._id }, { portfolioSlug: doc.slug });
  return doc;
};

export const isPublishedBy = (userId) =>
  Portfolio.exists({ userId: toOid(userId), isPublished: true });

/** The shape returned by GET /api/portfolios/:slug. */
export const publicProjection = async (slug) => {
  const doc = await Portfolio.findOne({ slug: String(slug).toLowerCase(), isPublished: true })
    .populate({
      path: 'evidenceIds',
      match: { status: { $ne: 'draft' } },
      select: 'kind title organization description repoUrl demoUrl techSkills startedAt endedAt status',
    })
    .lean();
  if (!doc) fail(404, 'Portfolio not found or not published');
  const owner = await User.findById(doc.userId).select('name createdAt').lean();
  return {
    // Also exposed so public visitors can file an abuse report against it.
    id: String(doc._id),
    slug: doc.slug,
    displayName: doc.publicName,
    headline: doc.headline,
    intro: doc.intro,
    emailPublic: doc.emailPublic,
    githubUrl: doc.githubUrl,
    linkedinUrl: doc.linkedinUrl,
    school: doc.school,
    coursework: doc.coursework || [],
    expertise: doc.expertise || [],
    evidence: (doc.evidenceIds || []).map((e) => ({
      id: e._id,
      kind: e.kind,
      title: e.title,
      organization: e.organization,
      description: e.description,
      repoUrl: e.repoUrl,
      demoUrl: e.demoUrl,
      techSkills: e.techSkills,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
    })),
    memberSince: owner?.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const PORTFOLIO_PUBLIC_FIELDS = [
  'slug', 'displayName', 'headline', 'intro', 'emailPublic', 'githubUrl', 'linkedinUrl',
  'school', 'coursework', 'expertise', 'evidence', 'memberSince', 'updatedAt',
];
