import mongoose from 'mongoose';
import Chunk from '../models/Chunk.js';
import Evidence from '../models/Evidence.js';
import Resume from '../models/Resume.js';
import { config } from '../config/index.js';
import { embedTextSafe, EMBED_MODEL } from './embeddingService.js';

/**
 * Authorization-scoped retrieval.
 *
 * SECURITY: the owner/grant filters are applied in the database query before
 * anything reaches the language model. The model can never widen access.
 *
 * Modes:
 *  - "vector":  Atlas Vector Search $knnBeta / $vectorSearch when the index
 *               named in docs/architecture.md has been created and Ollama is up.
 *  - "keyword": deterministic dev fallback (clearly labelled, always reports
 *               mode:"keyword", never claims real vector retrieval).
 */

export const modeInfo = () => ({
  vectorEnabled: Boolean(process.env.ATLAS_VECTOR_ENABLED) && process.env.NODE_ENV !== 'test',
  fallbackLabel: 'keyword',
});

const toOid = (id) =>
  id ? new mongoose.Types.ObjectId(String(id)) : null;

/** Build the access filter for a user plus any mentor grants into their materials. */
export const scopeFilter = ({ userId, grantIds = [] }) => {
  const self = toOid(userId);
  const oidGrants = grantIds.map(toOid).filter(Boolean);
  return {
    $or: [
      { ownerId: self },
      { evidenceId: { $in: oidGrants } },
      { resumeId: { $in: oidGrants } },
    ],
  };
};

export const canonicalGrantIds = async ({ userId, asMentor = false }) => {
  if (asMentor) {
    const MentorGrant = (await import('../models/index.js')).MentorGrant;
    const grants = await MentorGrant.find({ mentorId: userId, status: 'active' }).lean();
    return {
      evidenceIds: grants.flatMap((g) => g.evidenceIds || []).map(String),
      resumeIds: grants.flatMap((g) => g.resumeIds || []).map(String),
    };
  }
  const [ev, rs] = await Promise.all([
    Evidence.find({ userId }).select('_id').lean(),
    Resume.find({ userId }).select('_id').lean(),
  ]);
  return { evidenceIds: ev.map((d) => String(d._id)), resumeIds: rs.map((d) => String(d._id)) };
};

export const retrieveChunks = async ({ userId, query, grants = {}, topK = config.retrieval.topK, forceKeyword = false }) => {
  const base = scopeFilter({ userId, grantIds: [...(grants.evidenceIds || []), ...(grants.resumeIds || [])] });

  // 1. Vector mode ------------------------------------------------------------
  if (!forceKeyword && modeInfo().vectorEnabled) {
    const embedded = await embedTextSafe(query);
    if (embedded.vector) {
      try {
        const pipeline = [
          {
            $vectorSearch: {
              index: 'chunk_vector_index',
              path: 'embedding',
              queryVector: embedded.vector,
              numCandidates: Math.max(topK * 20, 60),
              limit: topK,
              filter: base,
            },
          },
          {
            $project: {
              text: 1,
              idx: 1,
              sectionTitle: 1,
              resumeId: 1,
              evidenceId: 1,
              docId: 1,
              embeddingModel: 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ];
        const coll = mongoose.connection.collection('chunks');
        const results = await coll.aggregate(pipeline).toArray();
        if (results.length) {
          return { mode: 'vector', embeddingModel: EMBED_MODEL, results: shape(results) };
        }
      } catch (err) {
        if (!config.isTest) console.error('[retrieval] vector search failed, falling back:', err.message);
      }
    }
  }

  // 2. Keyword fallback (deterministic, dev-labelled) --------------------------
  const words = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 2)
    .slice(0, 30);

  if (!words.length) return { mode: 'keyword', embeddingModel: EMBED_MODEL, results: [] };

  const candidates = await Chunk.find(base)
    .select('text idx sectionTitle resumeId evidenceId docId')
    .limit(600)
    .lean();

  const scored = candidates.map((c) => {
    const text = (c.text || '').toLowerCase();
    let score = 0;
    for (const w of words) {
      if (text.includes(w)) score += w.length > 6 ? 2 : 1;
    }
    return { ...c, score };
  });

  const results = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return {
    mode: 'keyword',
    embeddingModel: EMBED_MODEL,
    results: shape(results),
    notice: 'Development keyword fallback — real vector retrieval was not performed.',
  };
};

const shape = (rows) =>
  rows.map((r) => ({
    chunkId: String(r._id),
    text: r.text,
    score: r.score ?? 0,
    sectionTitle: r.sectionTitle || null,
    resumeId: r.resumeId ? String(r.resumeId) : null,
    evidenceId: r.evidenceId ? String(r.evidenceId) : null,
    docId: r.docId ? String(r.docId) : null,
  }));
