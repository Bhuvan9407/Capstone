import { config } from '../config/index.js';

/**
 * Ollama embedding + generation client (plain HTTP so behavior is explicit and
 * testable; LangChain integrations sit in ai/chains/*).
 *
 * Configuration contract (see README "Ollama model installation"):
 *   config.ollama.embedModel / config.ollama.llmModel must be pulled locally,
 *   e.g.  ollama pull nomic-embed-text  &&  ollama pull llama3.1:8b
 */

export const EMBED_MODEL = config.ollama.embedModel;
export const LLM_MODEL = config.ollama.llmModel;
export let observedEmbedDim = Number(process.env.EMBED_DIM) || 768;

export const ollamaBase = () => config.ollama.baseUrl;

export class OllamaUnavailableError extends Error {
  constructor(message = 'Ollama service unavailable') {
    super(message);
    this.status = 503;
    this.code = 'OLLAMA_UNAVAILABLE';
    this.expose = true;
  }
}

const withTimeout = async (url, body, timeoutMs) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new OllamaUnavailableError(`Ollama ${res.status}: ${text.slice(0, 200)}`);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof OllamaUnavailableError) throw err;
    if (err.name === 'AbortError') throw new OllamaUnavailableError('Ollama request timed out');
    throw new OllamaUnavailableError(`Ollama unreachable: ${err.message}`);
  } finally {
    clearTimeout(t);
  }
};

export const trackDim = (dim) => {
  if (Number.isFinite(dim) && dim > 0) observedEmbedDim = dim;
  return observedEmbedDim;
};

export const embedTextSafe = async (text) => {
  if (!text || !text.trim()) return { vector: null, model: EMBED_MODEL };
  try {
    const json = await withTimeout(
      `${ollamaBase()}/api/embeddings`,
      { model: EMBED_MODEL, prompt: String(text).slice(0, 6000) },
      config.ollama.timeoutMs
    );
    const vector = json?.embedding;
    if (!Array.isArray(vector)) throw new OllamaUnavailableError('Ollama returned no embedding');
    trackDim(vector.length);
    return { vector, model: EMBED_MODEL, cached: Boolean(json.cached) };
  } catch (err) {
    // Honest degradation: no fabricated vector is stored.
    return { vector: null, model: EMBED_MODEL, error: err.message };
  }
};

export const chatComplete = async ({ system, messages, temperature = 0.3, numPredict = 600, format }) => {
  const payload = {
    model: LLM_MODEL,
    stream: false,
    options: { temperature, num_predict: numPredict },
    ...(format ? { format } : {}),
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  const json = await withTimeout(`${ollamaBase()}/api/chat`, payload, config.ollama.timeoutMs);
  if (!json?.message?.content) throw new OllamaUnavailableError('Ollama returned no message');
  return {
    content: json.message.content,
    model: json.model || LLM_MODEL,
    evalCount: json.eval_count,
    tookMs: json.total_duration ? Math.round(json.total_duration / 1e6) : undefined,
  };
};

export const ollamaHealthCheck = async () => {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${ollamaBase()}/api/tags`, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return { ok: false, detail: `status ${res.status}` };
    const json = await res.json();
    const names = (json.models || []).map((m) => m.name);
    return {
      ok: true,
      models: names,
      llmPresent: names.some((n) => n.startsWith(LLM_MODEL.split(':')[0])),
      embedPresent: names.some((n) => n.startsWith(EMBED_MODEL.split(':')[0])),
    };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
};

/** Atlas Vector Search index definition for the `chunks` collection. */
export const vectorIndexDefinition = (dims) => ({
  name: 'chunk_vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      { type: 'vector', path: 'embedding', numDimensions: dims, similarity: 'cosine' },
      { type: 'filter', path: 'ownerId' },
      { type: 'filter', path: 'resumeId' },
      { type: 'filter', path: 'evidenceId' },
    ],
  },
});