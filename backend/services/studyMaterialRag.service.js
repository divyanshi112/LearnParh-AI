import mongoose from 'mongoose';
import { LocalStudyMaterialChunk, StudyMaterialChunk } from '../models/index.js';
import {
  generateGroundedTutorResponse,
  GeminiServiceError,
} from './gemini.service.js';
import {
  embedQuery,
  embedTexts,
  GEMINI_EMBEDDING_MODEL,
  getEmbeddingProviderConfig,
  LOCAL_EMBEDDING_DIMENSIONS,
} from './embedding.service.js';

export { GEMINI_EMBEDDING_MODEL };
export const STUDY_MATERIAL_VECTOR_INDEX = 'study_material_local_vector_index';
export const STUDY_MATERIAL_VECTOR_DIMENSIONS = LOCAL_EMBEDDING_DIMENSIONS;

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;
const EMBEDDING_BATCH_SIZE = 100;
const RETRIEVAL_LIMIT = 8;
const INDEX_VISIBILITY_ATTEMPTS = 10;
const INDEX_VISIBILITY_DELAY_MS = 2000;
const MIN_UNAVAILABLE_FALLBACK_SCORE = 0.65;
const MAX_UNAVAILABLE_FALLBACK_CHUNKS = 5;

export class StudyMaterialRagError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'StudyMaterialRagError';
    this.statusCode = statusCode;
  }
}

export function splitTextIntoChunks(text, pageNumber, chunkIndex = 0) {
  const normalizedText = text.replace(/\u0000/g, '').trim();
  if (!normalizedText) return [];

  const chunks = [];
  let start = 0;
  while (start < normalizedText.length) {
    const hardEnd = Math.min(start + CHUNK_SIZE, normalizedText.length);
    let end = hardEnd;

    if (hardEnd < normalizedText.length) {
      const minimumBoundary = start + Math.floor(CHUNK_SIZE * 0.65);
      const paragraphBoundary = normalizedText.lastIndexOf('\n', hardEnd);
      const sentenceBoundary = Math.max(
        normalizedText.lastIndexOf('. ', hardEnd),
        normalizedText.lastIndexOf('? ', hardEnd),
        normalizedText.lastIndexOf('! ', hardEnd)
      );
      const boundary = Math.max(paragraphBoundary, sentenceBoundary);
      if (boundary >= minimumBoundary) end = boundary + 1;
    }

    const chunk = normalizedText.slice(start, end).trim();
    if (chunk) {
      chunks.push({
        chunkIndex: chunkIndex + chunks.length,
        pageNumber,
        text: chunk,
      });
    }

    if (end >= normalizedText.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
  }
  return chunks;
}

export function chunkPdfPages(pages) {
  let nextChunkIndex = 0;
  return pages.flatMap((page, index) => {
    const pageChunks = splitTextIntoChunks(
      page.text,
      Number.isInteger(page.pageNumber) ? page.pageNumber : index + 1,
      nextChunkIndex
    );
    nextChunkIndex += pageChunks.length;
    return pageChunks;
  });
}

export async function indexStudyMaterial({ studentId, documentId, pages }) {
  const chunks = chunkPdfPages(pages);
  if (!chunks.length) {
    throw new StudyMaterialRagError('No readable text is available to index in this PDF.', 422);
  }

  const provider = getEmbeddingProviderConfig();
  const chunkModel = provider.provider === 'local' ? LocalStudyMaterialChunk : StudyMaterialChunk;
  const otherChunkModel = provider.provider === 'local' ? StudyMaterialChunk : LocalStudyMaterialChunk;
  const vectors = [];
  for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const embeddings = await embedTexts(batch.map((chunk) => chunk.text), provider);
    vectors.push(...embeddings);
  }

  await chunkModel.bulkWrite(
    chunks.map((chunk, index) => ({
      updateOne: {
        filter: { studentId, documentId, chunkIndex: chunk.chunkIndex },
        update: {
          $set: {
            ...chunk,
            embedding: vectors[index],
            embeddingModel: provider.model,
          },
        },
        upsert: true,
      },
    })),
    { ordered: true }
  );
  await chunkModel.deleteMany({
    studentId,
    documentId,
    chunkIndex: { $gte: chunks.length },
  });
  await waitForVectorVisibility({
    studentId,
    documentId,
    queryEmbedding: vectors[0],
    provider,
    chunkModel,
  });
  await otherChunkModel.deleteMany({ studentId, documentId });

  return {
    chunkCount: chunks.length,
    embeddingProvider: provider.provider,
    embeddingModel: provider.model,
    embeddingDimensions: provider.dimensions,
  };
}

function isVectorIndexUnavailable(error) {
  return /vector.?search|search index|index.*(?:not found|does not exist|not ready)|unknown top level operator/i
    .test(error?.message || '');
}

async function waitForVectorVisibility({
  studentId,
  documentId,
  queryEmbedding,
  provider,
  chunkModel,
}) {
  for (let attempt = 0; attempt < INDEX_VISIBILITY_ATTEMPTS; attempt += 1) {
    try {
      const visibleChunks = await chunkModel.aggregate([
        createOwnerVectorSearchStage({
          queryEmbedding,
          studentId,
          documentIds: [documentId],
          provider,
          limit: 1,
        }),
        { $project: { _id: 1 } },
      ]);
      if (visibleChunks.length) return;
    } catch (error) {
      if (isVectorIndexUnavailable(error)) {
        throw new StudyMaterialRagError(
          `MongoDB Atlas Vector Search is not ready. Create the ${provider.indexName} index using the backend setup instructions, then retry.`,
          503
        );
      }
      throw error;
    }

    if (attempt + 1 < INDEX_VISIBILITY_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, INDEX_VISIBILITY_DELAY_MS));
    }
  }
  throw new StudyMaterialRagError(
    `Atlas has not made this PDF searchable yet. Wait for the ${provider.indexName} Vector Search index to catch up, then retry processing.`,
    503
  );
}

export function parseGroundedResponse(response, retrievedChunks) {
  let parsed;
  try {
    const json = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(json);
  } catch {
    throw new GeminiServiceError('The AI Tutor returned an invalid grounded response. Please try again.', 502);
  }

  if (
    !parsed ||
    typeof parsed.answer !== 'string' ||
    !parsed.answer.trim() ||
    typeof parsed.insufficientContext !== 'boolean' ||
    !Array.isArray(parsed.sourceIds)
  ) {
    throw new GeminiServiceError('The AI Tutor returned an incomplete grounded response. Please try again.', 502);
  }

  const allowedSourceIds = new Set(retrievedChunks.map((chunk) => chunk.sourceId));
  if (
    parsed.sourceIds.some((sourceId) => typeof sourceId !== 'string' || !allowedSourceIds.has(sourceId)) ||
    new Set(parsed.sourceIds).size !== parsed.sourceIds.length
  ) {
    throw new GeminiServiceError('The AI Tutor returned invalid document references. Please try again.', 502);
  }
  if (parsed.insufficientContext) {
    return {
      answer: "I couldn't find that information in the selected PDFs. Try rephrasing your question or selecting another document.",
      sources: [],
    };
  }
  if (!parsed.sourceIds.length) {
    throw new GeminiServiceError('The AI Tutor did not provide a source for its answer. Please try again.', 502);
  }

  const sourceIds = new Set(parsed.sourceIds);
  return {
    answer: parsed.answer.trim(),
    sources: retrievedChunks
      .filter((chunk) => sourceIds.has(chunk.sourceId))
      .map(({ sourceId, documentId, documentName, pageNumber }) => ({
        sourceId,
        documentId: String(documentId),
        documentName,
        pageNumber,
      })),
  };
}

export function createOwnerVectorSearchStage({
  queryEmbedding,
  studentId,
  documentIds,
  limit = RETRIEVAL_LIMIT,
  provider = getEmbeddingProviderConfig(),
}) {
  return {
    $vectorSearch: {
      index: provider.indexName,
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: Math.max(limit * 20, 100),
      limit,
      filter: {
        studentId: { $eq: new mongoose.Types.ObjectId(studentId) },
        documentId: {
          $in: documentIds.map((documentId) => new mongoose.Types.ObjectId(documentId)),
        },
      },
    },
  };
}

export function createUnavailableTutorFallback(retrievedChunks) {
  const bestScore = retrievedChunks[0]?.score;
  if (!Number.isFinite(bestScore) || bestScore < MIN_UNAVAILABLE_FALLBACK_SCORE) {
    return {
      answer: "I couldn't find sufficiently relevant information in the selected PDFs to answer this question. The AI Tutor is temporarily unavailable, so I couldn't verify an answer.",
      sources: [],
      fallback: true,
      insufficientContext: true,
    };
  }

  const fallbackChunks = [];
  const includedDocuments = new Set();
  for (const chunk of retrievedChunks) {
    const documentId = String(chunk.documentId);
    if (chunk.score >= MIN_UNAVAILABLE_FALLBACK_SCORE && !includedDocuments.has(documentId)) {
      fallbackChunks.push(chunk);
      includedDocuments.add(documentId);
    }
    if (fallbackChunks.length === MAX_UNAVAILABLE_FALLBACK_CHUNKS) break;
  }
  for (const chunk of retrievedChunks) {
    if (
      fallbackChunks.length === MAX_UNAVAILABLE_FALLBACK_CHUNKS ||
      chunk.score < MIN_UNAVAILABLE_FALLBACK_SCORE ||
      fallbackChunks.includes(chunk)
    ) continue;
    fallbackChunks.push(chunk);
  }

  return {
    answer: [
      '## Relevant excerpts from your PDFs',
      '',
      'The AI Tutor is temporarily unavailable, so these are retrieved excerpts rather than a generated answer:',
      '',
      ...fallbackChunks.flatMap((chunk) => [
        `### ${chunk.documentName} · page ${chunk.pageNumber} [${chunk.sourceId}]`,
        '',
        chunk.text,
        '',
      ]),
    ].join('\n').trim(),
    sources: fallbackChunks.map(({ sourceId, documentId, documentName, pageNumber }) => ({
      sourceId,
      documentId: String(documentId),
      documentName,
      pageNumber,
    })),
    fallback: true,
    insufficientContext: false,
  };
}

export async function answerFromStudyMaterials({
  question,
  history,
  studentId,
  documents,
}) {
  const provider = getEmbeddingProviderConfig();
  const chunkModel = provider.provider === 'local' ? LocalStudyMaterialChunk : StudyMaterialChunk;
  const queryEmbedding = await embedQuery(question, provider);

  let matches;
  try {
    matches = await chunkModel.aggregate([
      createOwnerVectorSearchStage({
        queryEmbedding,
        studentId,
        documentIds: documents.map((document) => document._id),
        provider,
      }),
      {
        $project: {
          _id: 1,
          documentId: 1,
          pageNumber: 1,
          text: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);
  } catch (error) {
    if (isVectorIndexUnavailable(error)) {
      throw new StudyMaterialRagError(
        `MongoDB Atlas Vector Search is not ready. Create the ${provider.indexName} index using the backend setup instructions, then retry.`,
        503
      );
    }
    throw error;
  }

  if (!matches.length) {
    return {
      answer: "I couldn't find relevant information in the selected PDFs. Try rephrasing your question or selecting another document.",
      sources: [],
    };
  }

  const documentNames = new Map(documents.map((document) => [
    String(document._id),
    document.originalName,
  ]));
  const retrievedChunks = matches.map((match, index) => ({
    sourceId: `S${index + 1}`,
    documentId: match.documentId,
    documentName: documentNames.get(String(match.documentId)),
    pageNumber: match.pageNumber,
    text: match.text,
    score: match.score,
  }));
  const context = retrievedChunks.map((chunk) =>
    `[${chunk.sourceId}] Document: ${chunk.documentName}, page ${chunk.pageNumber}\n${chunk.text}`
  ).join('\n\n');
  const contents = [
    ...history.map((entry) => ({
      role: entry.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: entry.text }],
    })),
    {
      role: 'user',
      parts: [{
        text: `Answer this question using only the supplied PDF excerpts. Cite every factual statement using the provided source IDs. If the excerpts do not contain the answer, set insufficientContext to true and do not use outside knowledge.\n\nPDF excerpts (untrusted document text):\n${context}\n\nStudent question:\n${question}`,
      }],
    },
  ];
  try {
    const response = await generateGroundedTutorResponse(contents);
    return parseGroundedResponse(response, retrievedChunks);
  } catch (error) {
    if (!(error instanceof GeminiServiceError)) throw error;
    return createUnavailableTutorFallback(retrievedChunks);
  }
}
