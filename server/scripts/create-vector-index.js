/**
 * Creates the MongoDB Atlas Vector Search index for the `chunks` collection.
 * The number of dimensions must match the ACTUAL embedding size produced by
 * your configured embedding model — the script inspects it by embedding a
 * sample text first (requires Ollama running).
 *
 * Usage: npm run vector-index    (requires MONGO_URI pointing at Atlas)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo, config } from '../src/config/index.js';
import { embedTextSafe, vectorIndexDefinition, observedEmbedDim } from '../src/ai/embeddingService.js';

const run = async () => {
  await connectMongo();
  console.log('[vector] embedding a sample text to measure the real dimension…');
  const result = await embedTextSafe('dimension probe sample text');
  if (!result.vector) {
    console.error(
      `[vector] Could not measure dimension — is Ollama up at ${config.ollama.baseUrl}? ` +
        `Proceeding with the current/default dimension value (${observedEmbedDim}).`
    );
  }
  const dims = result.vector?.length || observedEmbedDim;
  console.log(`[vector] Using ${dims} dimensions.`);

  const db = mongoose.connection;
  const collectionName = 'chunks';
  try {
    await db.command({
      createSearchIndexes: collectionName,
      indexes: [vectorIndexDefinition(dims)],
    });
    console.log(`[vector] Index "chunk_vector_index" created on ${collectionName}. Atlas may take a few minutes to build.`);
  } catch (err) {
    if (String(err?.codeName || err?.message).includes('IndexAlreadyExists')) {
      console.log('[vector] Index already exists.');
    } else {
      console.error('[vector] Failed to create the search index:', err.message);
      console.error('Note: this requires a MongoDB Atlas M10+ cluster (Atlas Vector Search).');
      console.error('Local MongoDB does not support vectorSearch indexes — use the keyword fallback in development.');
      process.exit(1);
    }
  }
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
