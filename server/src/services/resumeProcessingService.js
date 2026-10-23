import Resume from '../models/Resume.js';
import Chunk from '../models/Chunk.js';
import { fail } from '../utils/core.js';
import { extractTextFrom, extractSkillsFromText } from './textExtractService.js';
import { embedTextSafe } from '../ai/embeddingService.js';

const CHUNK_SIZE = 1000;

/** Split text into paragraph-preserving chunks. */
export const chunkText = (text, size = CHUNK_SIZE) => {
  if (!text) return [];
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = '';
  for (const p of paragraphs) {
    if ((buf + '\n\n' + p).length > size && buf) {
      chunks.push(buf.trim());
      buf = '';
    }
    if (p.length > size * 1.5) {
      // Very long paragraph: split on sentences as an approximation of sections.
      const sentences = p.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [p];
      for (const s of sentences) {
        if ((buf + ' ' + s).length > size && buf) {
          chunks.push(buf.trim());
          buf = '';
        }
        buf += (buf ? ' ' : '') + s.trim();
      }
    } else {
      buf += (buf ? '\n\n' : '') + p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.map((text2, idx) => ({ idx, text: text2 }));
};

/** Full pipeline for one resume: extract -> chunk -> embed -> ready. Idempotent:
 *  existing chunks for this resume are removed before re-embedding (no duplicates). */
export const processResume = async (resumeId, { withEmbeddings = true } = {}) => {
  const resume = await Resume.findById(resumeId);
  if (!resume) fail(404, 'Resume not found');

  resume.status = 'extracting';
  resume.error = '';
  await resume.save();

  let chunks;
  try {
    const extracted = await extractTextFrom(resume.mimeType, resume.storageKey);
    resume.extractedText = extracted.text;
    resume.pageCount = extracted.pages;
    resume.skills = extractSkillsFromText(extracted.text);
    chunks = chunkText(extracted.text);
  } catch (err) {
    resume.status = 'failed';
    resume.error = (err.message || 'Extraction failed').slice(0, 600);
    await resume.save();
    throw err;
  }

  // Replace any previous chunks for this resume version (safe retry).
  await Chunk.deleteMany({ resumeId: resume._id, ownerId: resume.userId });

  if (!withEmbeddings) {
    resume.status = 'ready';
    await resume.save();
    return { total: chunks.length, embedded: 0, ollamaAvailable: false };
  }

  resume.status = 'embedding';
  await resume.save();

  let embedded = 0;
  let ollamaOk = true;
  for (const chunk of chunks) {
    const result = await embedTextSafe(chunk.text);
    const doc = {
      ownerId: resume.userId,
      resumeId: resume._id,
      idx: chunk.idx,
      text: chunk.text,
      embeddingModel: result.model || '',
      embeddedAt: result.vector ? new Date() : null,
    };
    if (result.vector) {
      doc.embedding = result.vector;
      doc.docId = null; // omitted below — Chunk.docId is only used for attachment docs
      delete doc.docId;
    }
    await Chunk.create(doc);
    if (result.vector) embedded += 1;
    else ollamaOk = false;
  }

  resume.status = 'ready';
  await resume.save();
  return { total: chunks.length, embedded, ollamaOk };
};
