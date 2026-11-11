import path from 'node:path';
import { tmpdir } from 'node:os';

export const LOCAL_EMBEDDING_DIMENSIONS = 384;
export const DEFAULT_LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const GEMINI_EMBEDDING_DIMENSIONS = 768;

const localPipelinePromises = new Map();

export function getEmbeddingProviderConfig() {
  const provider = process.env.RAG_EMBEDDING_PROVIDER?.trim().toLowerCase() || 'local';
  if (provider === 'local') {
    return {
      provider,
      model: process.env.LOCAL_EMBEDDING_MODEL?.trim() || DEFAULT_LOCAL_EMBEDDING_MODEL,
      dimensions: LOCAL_EMBEDDING_DIMENSIONS,
      collectionName: 'studyMaterialChunksLocal',
      indexName: 'study_material_local_vector_index',
    };
  }
  if (provider === 'gemini') {
    return {
      provider,
      model: GEMINI_EMBEDDING_MODEL,
      dimensions: GEMINI_EMBEDDING_DIMENSIONS,
      collectionName: 'studyMaterialChunks',
      indexName: 'study_material_vector_index',
    };
  }
  throw new Error(`Unsupported RAG_EMBEDDING_PROVIDER "${provider}". Use "local" or "gemini".`);
}

export function isEmbeddingConfigCompatible(document, providerConfig = getEmbeddingProviderConfig()) {
  return document.embeddingModel === providerConfig.model
    && (!document.embeddingProvider || document.embeddingProvider === providerConfig.provider)
    && (document.embeddingDimensions == null || document.embeddingDimensions === providerConfig.dimensions);
}

async function getLocalPipeline(model) {
  if (!localPipelinePromises.has(model)) {
    const pipelinePromise = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', model, {
        device: 'cpu',
        dtype: 'q8',
        cache_dir: process.env.TRANSFORMERS_CACHE_DIR?.trim()
          || path.join(tmpdir(), 'learnpath-ai-transformers'),
      }))
      .catch((error) => {
        localPipelinePromises.delete(model);
        throw new Error(`Local embedding model "${model}" could not be loaded: ${error.message}`, { cause: error });
      });
    localPipelinePromises.set(model, pipelinePromise);
  }
  return localPipelinePromises.get(model);
}

function validateEmbeddings(embeddings, texts, { model, dimensions }) {
  if (
    !Array.isArray(embeddings) ||
    embeddings.length !== texts.length ||
    embeddings.some((vector) => (
      !Array.isArray(vector) ||
      vector.length !== dimensions ||
      vector.some((value) => !Number.isFinite(value))
    ))
  ) {
    throw new Error(`Embedding provider "${model}" returned invalid vectors; expected ${dimensions} finite values per text.`);
  }
  return embeddings;
}

async function embedLocally(texts, config) {
  const extractor = await getLocalPipeline(config.model);
  const embeddings = [];
  const batchSize = 8;

  for (let offset = 0; offset < texts.length; offset += batchSize) {
    const batch = texts.slice(offset, offset + batchSize);
    const result = await extractor(batch, { pooling: 'mean', normalize: true });
    const vectors = result.tolist();
    embeddings.push(...vectors);
  }

  return validateEmbeddings(embeddings, texts, config);
}

export async function embedTexts(texts, providerConfig = getEmbeddingProviderConfig()) {
  if (!Array.isArray(texts) || texts.length === 0 || texts.some((text) => typeof text !== 'string' || !text.trim())) {
    throw new TypeError('Embeddings require a non-empty array of text values.');
  }

  if (providerConfig.provider === 'local') return embedLocally(texts, providerConfig);

  const { generateTextEmbeddings } = await import('./gemini.service.js');
  const embeddings = await generateTextEmbeddings(texts, 'RETRIEVAL_DOCUMENT', providerConfig);
  return validateEmbeddings(embeddings, texts, providerConfig);
}

export async function embedQuery(text, providerConfig = getEmbeddingProviderConfig()) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('Question embedding requires non-empty text.');
  }

  if (providerConfig.provider === 'gemini') {
    const { generateTextEmbeddings } = await import('./gemini.service.js');
    const [embedding] = await generateTextEmbeddings([text], 'RETRIEVAL_QUERY', providerConfig);
    return validateEmbeddings([embedding], [text], providerConfig)[0];
  }
  return (await embedLocally([text], providerConfig))[0];
}
