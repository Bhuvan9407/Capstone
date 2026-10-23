import { readFileText, readPdfText, sniffType } from './storageService.js';
import { fail } from '../utils/core.js';

/** Extract text from an uploaded (already-stored) file.
 *  Never executes content or follows instructions inside documents. */
export const extractTextFrom = async (mimeType, storageKey) => {
  const actual = sniffType(storageKey);
  if (actual === 'unknown/binary') {
    fail(415, 'File content does not match an accepted type');
  }
  if (mimeType === 'application/pdf' || actual === 'application/pdf') {
    const { text, pages } = await readPdfText(storageKey);
    return { text: text.replace(/\u0000/g, '').slice(0, 50000), pages, hasPageRefs: true };
  }
  if (mimeType === 'text/plain' || actual === 'text/plain') {
    const text = readFileText(storageKey).slice(0, 50000);
    return { text, pages: 1, hasPageRefs: false };
  }
  fail(415, 'Unsupported document type. Upload a text-based PDF or TXT file.');
  return null;
};

const SKILL_DICTIONARY = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Mongoose',
  'PostgreSQL', 'MySQL', 'Redis', 'Python', 'Django', 'Flask', 'FastAPI', 'Java',
  'Spring', 'Go', 'Rust', 'Ruby', 'Rails', 'PHP', 'Laravel', 'HTML', 'CSS',
  'Tailwind', 'Bootstrap', 'Vue', 'Angular', 'Next.js', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'CI/CD', 'Git', 'GraphQL', 'REST', 'WebSockets',
  'Jest', 'Vitest', 'Playwright', 'Cypress', 'Pytest', 'NumPy', 'pandas',
  'TensorFlow', 'PyTorch', 'scikit-learn', 'Kafka', 'RabbitMQ', 'Linux', 'Agile',
];

/** Extracts only skills literally present in the document text — nothing is
 *  inferred or invented from job descriptions. */
export const extractSkillsFromText = (text) => {
  if (!text) return [];
  const lower = text.toLowerCase();
  return SKILL_DICTIONARY.filter((s) => lower.includes(s.toLowerCase())).slice(0, 40);
};
