import mongoose from 'mongoose';
import Resume from '../models/Resume.js';
import Evidence from '../models/Evidence.js';
import JobTarget from '../models/JobTarget.js';
import { retrieveChunks } from '../ai/retrievalService.js';
import { canonicalGrantIds } from '../ai/retrievalService.js';

const toOid = (id) => (id ? new mongoose.Types.ObjectId(String(id)) : null);

export const MATCH_CATEGORIES = ['supported', 'partial', 'missing', 'unverified'];

/** Compare every confirmed requirement of one target against the student's own
 *  evidence. Deterministic keyword rule first, semantic retrieval second; AI
 *  only writes short explanations over REAL retrieved excerpts — it cannot
 *  invent supporting evidence. */
export const compareRequirements = async (user, targetId) => {
  const target = await JobTarget.findOne({ _id: toOid(targetId), userId: user._id }).lean();
  if (!target) return null;
  const grants = await canonicalGrantIds({ userId: user._id });

  const [evidenceDocs, resumeDocs] = await Promise.all([
    Evidence.find({ userId: user._id }).lean(),
    Resume.find({ userId: user._id }).lean(),
  ]);

  const evidenceById = new Map(evidenceDocs.map((e) => [String(e._id), e]));
  const resumeById = new Map(resumeDocs.map((r) => [String(r._id), r]));

  const rows = await Promise.all(
    (target.hardReqs || []).map(async (req) => {
      const statement = req?.statement || '';
      const retrieved = await retrieveChunks({
        userId: user._id,
        query: statement,
        grants,
        topK: 4,
      });

      const supporting = [];
      for (const hit of retrieved.results || []) {
        if (hit.evidenceId && evidenceById.has(hit.evidenceId)) {
          supporting.push({
            source: 'evidence',
            id: hit.evidenceId,
            title: evidenceById.get(hit.evidenceId).title,
            kind: evidenceById.get(hit.evidenceId).kind,
            excerpt: hit.text.slice(0, 500),
          });
        } else if (hit.resumeId && resumeById.has(hit.resumeId)) {
          supporting.push({
            source: 'resume',
            id: hit.resumeId,
            title: resumeById.get(hit.resumeId).fileName,
            kind: 'resume',
            excerpt: hit.text.slice(0, 500),
          });
        }
      }
      return { requirement: { ...req, inferred: Boolean(req.inferred) }, support: supporting };
    })
  );

  const status = assignmentStatus(rows);
  const coverage = coverageDefinitionMeta(rows);
  return { target, rows: rows.map((r, i) => ({ ...r, category: status[i] })), coverage };
};

const assignmentStatus = (rows) =>
  rows.map(({ support }) => {
    if (!support.length) return 'missing';
    const evidenceBased = support.filter((s) => s.source === 'evidence');
    if (evidenceBased.length >= 1 && support.length >= 2) return 'supported';
    if (evidenceBased.length === 1) return 'supported';
    // Only the resume mentions it: plausible, but it needs the student's own
    // verification — never call a resume keyword a proven capability.
    if (support.some((s) => s.excerpt.length >= 80)) return 'partial';
    return 'unverified';
  });

const coverageDefinitionMeta = (rows) => {
  const supported = rows.filter((r) => r.category === 'supported').length;
  const partial = rows.filter((r) => r.category === 'partial').length;
  const missing = rows.filter((r) => r.category === 'missing').length;
  const total = rows.length;
  return {
    definition:
      'Evidence coverage = (#requirements with ≥1 supporting source + 0.5 × requirements with weak/ambiguous support) ÷ total requirements. This counts DOCUMENTED evidence only — it is not a hiring probability, skills score, or fit ranking.',
    counts: { supported, partial, missing, total },
    ratio: total ? Number(((supported + 0.5 * partial) / total).toFixed(2)) : 0,
  };
};

export const statusFor = assignmentStatus;
