import 'dotenv/config';
import mongoose from 'mongoose';
import { isDeepStrictEqual } from 'node:util';
import connectDB from '../config/db.js';
import { LocalStudyMaterialChunk, StudyMaterialChunk } from '../models/index.js';
import { getEmbeddingProviderConfig } from '../services/embedding.service.js';

const provider = getEmbeddingProviderConfig();
const chunkModel = provider.provider === 'local' ? LocalStudyMaterialChunk : StudyMaterialChunk;
const indexDefinition = {
  fields: [
    {
      type: 'vector',
      path: 'embedding',
      numDimensions: provider.dimensions,
      similarity: 'cosine',
    },
    { type: 'filter', path: 'studentId' },
    { type: 'filter', path: 'documentId' },
  ],
};

try {
  await connectDB();
  try {
    await chunkModel.createCollection();
  } catch (error) {
    if (error.code !== 48) throw error;
  }
  const indexes = await chunkModel.collection.listSearchIndexes().toArray();
  const existingIndex = indexes.find((index) => index.name === provider.indexName);
  if (existingIndex) {
    if (existingIndex.type !== 'vectorSearch') {
      throw new Error(`An Atlas index named "${provider.indexName}" exists but is not a vector index.`);
    }
    if (!isDeepStrictEqual(existingIndex.latestDefinition, indexDefinition)) {
      await chunkModel.collection.updateSearchIndex(
        provider.indexName,
        indexDefinition
      );
      console.log(`[Study Materials] Updated "${provider.indexName}" to the required vector definition.`);
    } else {
      console.log(`[Study Materials] Vector index "${provider.indexName}" already has the required definition.`);
    }
  } else {
    await chunkModel.collection.createSearchIndex({
      name: provider.indexName,
      type: 'vectorSearch',
      definition: indexDefinition,
    });
    console.log(`[Study Materials] Requested creation of "${provider.indexName}".`);
  }

  const deadline = Date.now() + 180_000;
  let indexReady = false;
  while (Date.now() < deadline) {
    const [currentIndex] = await chunkModel.collection
      .listSearchIndexes(provider.indexName)
      .toArray();
    if (currentIndex?.queryable && currentIndex.status === 'READY') {
      console.log(`[Study Materials] Vector index "${provider.indexName}" is ready.`);
      indexReady = true;
      break;
    }
    if (currentIndex?.status === 'FAILED') {
      throw new Error(`Atlas failed to build "${provider.indexName}".`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (!indexReady) {
    throw new Error(`Atlas did not make "${provider.indexName}" queryable within 3 minutes.`);
  }
} catch (error) {
  console.error(`[Study Materials] Could not create the ${provider.indexName} Atlas Vector Search index:`, error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
