import JobTarget from '../models/JobTarget.js';
import { fail, toOid } from '../utils/core.js';
import { chatComplete } from '../ai/embeddingService.js';
import { OllamaUnavailableError } from '../ai/embeddingService.js';

const REQUIREMENT_CATEGORIES = [
  'language', 'framework', 'database', 'testing', 'devops', 'ai_ml',
  'security', 'performance', 'tools', 'soft_skills', 'education', 'experience', 'other',
];

export const extractionSchemaHint =
  '{"requirements":[{"statement":"<one concrete requirement sentence from the posting>","category":"<one of: ' +
  REQUIREMENT_CATEGORIES.join('|') + '">","weight":1|2|3,"skills":["<related tech>"]}],"extraSkills":["<skill keyword>"]}';

const SYSTEM = `You extract structured requirements from internship/job descriptions.
Rules:
1. Extract ONLY requirements explicitly present in the text. Never add your own assumptions or generic industry requirements.
2. Keep each statement short (max 25 words), self-contained, and quoting the posting's wording where possible.
3. Assign one category per requirement from the list, set weight: 3 = strongest signals, 2 = normal, 1 = minor/bonus.
4. List distinct technical skills mentioned.
5. If a requirement clearly bundles multiple skills, list it once and name the skills separately.
6. Reply with JSON ONLY in this exact shape: ${extractionSchemaHint}`;

export const runExtraction = async (rawText) => {
  let out;
  try {
    out = await chatComplete({
      system: SYSTEM,
      messages: [{ role: 'user', content: `JOB DESCRIPTION TEXT:\n"""\n${String(rawText).slice(0, 15000)}\n"""` }],
      temperature: 0.1,
      numPredict: 1200,
      format: 'json',
    });
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      return { ok: false, reason: 'model_unavailable', detail: err.message };
    }
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(out.content);
  } catch {
    return { ok: false, reason: 'parse_failed', detail: out.content.slice(0, 200) };
  }

  const requirements = Array.isArray(parsed.requirements) ? parsed.requirements : [];
  const validated = requirements
    .filter((r) => r && typeof r.statement === 'string' && r.statement.trim())
    .map((r) => ({
      statement: String(r.statement).trim().slice(0, 300),
      category: REQUIREMENT_CATEGORIES.includes(r.category) ? r.category : 'other',
      weight: [1, 2, 3].includes(Number(r.weight)) ? Number(r.weight) : 2,
      inferred: false, // requirements come from the posting; inference flag reserved for student edits
    }))
    .slice(0, 25);

  const skills = Array.isArray(parsed.extraSkills)
    ? parsed.extraSkills.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 30)
    : [];

  return { ok: true, requirements: validated, skills };
};

/** Persist extraction with provenance: everything here came from the posting
 *  text; the client marks student-added requirements inferred:true instead. */
export const persistExtraction = async (userId, jobTargetId, result) => {
  const doc = await JobTarget.findOne({ _id: toOid(jobTargetId), userId: toOid(userId) });
  if (!doc) fail(404, 'Job target not found');
  if (!result.ok) {
    doc.status = 'failed';
    doc.realizationError = result.detail || result.reason;
    await doc.save();
    return { ok: false };
  }
  doc.hardReqs = result.requirements;
  doc.discoveredSkills = result.skills.map((s) => ({ skill: s, inferred: false }));
  if (result.skills.length && !doc.consolidatedSkills?.length) doc.consolidatedSkills = result.skills;
  doc.status = 'ready';
  await doc.save();
  return { ok: true, doc };
};

export const extractForTarget = async (userId, jobTargetId) => {
  const doc = await JobTarget.findOne({ _id: toOid(jobTargetId), userId: toOid(userId) });
  if (!doc) fail(404, 'Job target not found');
  doc.status = 'processing';
  doc.realizationError = '';
  await doc.save();
  try {
    const result = await persistExtraction(userId, jobTargetId, await runExtraction(doc.rawDescription ?? ''));
    return result;
  } catch (err) {
    doc.status = 'failed';
    doc.realizationError = (err.message || 'extraction failed').slice(0, 500);
    await doc.save();
    return { ok: false };
  }
};

export default { runExtraction, extractForTarget };
