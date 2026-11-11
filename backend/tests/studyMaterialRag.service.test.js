import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { GeminiServiceError } from '../services/gemini.service.js';
import {
  chunkPdfPages,
  createOwnerVectorSearchStage,
  createUnavailableTutorFallback,
  parseGroundedResponse,
} from '../services/studyMaterialRag.service.js';
import {
  getEmbeddingProviderConfig,
  isEmbeddingConfigCompatible,
} from '../services/embedding.service.js';

test('splits document text into overlapping chunks with page attribution', () => {
  const text = 'A'.repeat(2600);
  const chunks = chunkPdfPages([
    { pageNumber: 4, text: '' },
    { pageNumber: 5, text },
  ]);

  assert.ok(chunks.length > 2);
  assert.equal(chunks[0].pageNumber, 5);
  assert.equal(chunks[0].chunkIndex, 0);
  assert.ok(chunks.every((chunk) => chunk.text.length <= 1200));
  assert.ok(chunks[0].text.includes(chunks[1].text.slice(0, 200)));
  assert.deepEqual(chunks.map((chunk) => chunk.chunkIndex), chunks.map((_, index) => index));
});

test('constrains vector retrieval to the authenticated student and selected documents', () => {
  const studentId = '507f1f77bcf86cd799439011';
  const documentId = '507f1f77bcf86cd799439012';
  const stage = createOwnerVectorSearchStage({
    queryEmbedding: Array(384).fill(0.25),
    studentId,
    documentIds: [documentId],
  });

  assert.equal(stage.$vectorSearch.filter.studentId.$eq.toString(), studentId);
  assert.deepEqual(
    stage.$vectorSearch.filter.documentId.$in.map(String),
    [documentId]
  );
  assert.equal(stage.$vectorSearch.index, 'study_material_local_vector_index');
  assert.equal(stage.$vectorSearch.queryVector.length, 384);
});

test('keeps the existing Gemini vector collection isolated when that provider is selected', () => {
  const previousProvider = process.env.RAG_EMBEDDING_PROVIDER;
  process.env.RAG_EMBEDDING_PROVIDER = 'gemini';
  try {
    const stage = createOwnerVectorSearchStage({
      queryEmbedding: Array(768).fill(0.25),
      studentId: '507f1f77bcf86cd799439011',
      documentIds: ['507f1f77bcf86cd799439012'],
    });
    assert.equal(stage.$vectorSearch.index, 'study_material_vector_index');
    assert.equal(stage.$vectorSearch.queryVector.length, 768);
  } finally {
    if (previousProvider === undefined) delete process.env.RAG_EMBEDDING_PROVIDER;
    else process.env.RAG_EMBEDDING_PROVIDER = previousProvider;
  }
});

test('records compatible provider, model, and dimensions for both indexed documents and queries', () => {
  const previousProvider = process.env.RAG_EMBEDDING_PROVIDER;
  const previousLocalModel = process.env.LOCAL_EMBEDDING_MODEL;
  process.env.RAG_EMBEDDING_PROVIDER = 'local';
  process.env.LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
  try {
    const config = getEmbeddingProviderConfig();
    assert.equal(config.provider, 'local');
    assert.equal(config.model, 'Xenova/all-MiniLM-L6-v2');
    assert.equal(config.dimensions, 384);
    assert.ok(isEmbeddingConfigCompatible({
      embeddingProvider: config.provider,
      embeddingModel: config.model,
      embeddingDimensions: config.dimensions,
    }, config));
    assert.ok(!isEmbeddingConfigCompatible({
      embeddingProvider: 'gemini',
      embeddingModel: config.model,
      embeddingDimensions: config.dimensions,
    }, config));
    assert.ok(!isEmbeddingConfigCompatible({
      embeddingProvider: config.provider,
      embeddingModel: config.model,
      embeddingDimensions: 768,
    }, config));
    assert.ok(isEmbeddingConfigCompatible({
      embeddingModel: config.model,
    }, config), 'legacy records with the same model remain compatible');
  } finally {
    if (previousProvider === undefined) delete process.env.RAG_EMBEDDING_PROVIDER;
    else process.env.RAG_EMBEDDING_PROVIDER = previousProvider;
    if (previousLocalModel === undefined) delete process.env.LOCAL_EMBEDDING_MODEL;
    else process.env.LOCAL_EMBEDDING_MODEL = previousLocalModel;
  }
});

test('accepts only citations that belong to retrieved chunks', () => {
  const documentId = new mongoose.Types.ObjectId();
  const retrieved = [{
    sourceId: 'S1',
    documentId,
    documentName: 'Operating Systems.pdf',
    pageNumber: 8,
  }];
  const markdownAnswer = '## Process scheduling\n\n- The PDF explains how processes are selected. [S1]\n\n**Quick revision:** scheduling selects the next process.';
  const answer = parseGroundedResponse(
    JSON.stringify({
      answer: markdownAnswer,
      insufficientContext: false,
      sourceIds: ['S1'],
    }),
    retrieved
  );

  assert.equal(answer.answer, markdownAnswer);
  assert.deepEqual(answer.sources, [{
    sourceId: 'S1',
    documentId: String(documentId),
    documentName: 'Operating Systems.pdf',
    pageNumber: 8,
  }]);

  assert.throws(
    () => parseGroundedResponse(
      JSON.stringify({
        answer: 'Unsupported source.',
        insufficientContext: false,
        sourceIds: ['S2'],
      }),
      retrieved
    ),
    GeminiServiceError
  );
});

test('returns an explicit abstention without citing irrelevant chunks', () => {
  const result = parseGroundedResponse(
    JSON.stringify({
      answer: 'Not sure.',
      insufficientContext: true,
      sourceIds: [],
    }),
    [{ sourceId: 'S1', documentId: new mongoose.Types.ObjectId(), documentName: 'Notes.pdf', pageNumber: 1 }]
  );

  assert.match(result.answer, /couldn't find that information/i);
  assert.deepEqual(result.sources, []);
});

test('abstains from low-relevance excerpts when Gemini is unavailable', () => {
  const result = createUnavailableTutorFallback([
    {
      sourceId: 'S1',
      documentId: new mongoose.Types.ObjectId(),
      documentName: 'RFC.pdf',
      pageNumber: 61,
      text: 'Content-Language describes the intended audience.',
      score: 0.57,
    },
  ]);

  assert.equal(result.fallback, true);
  assert.equal(result.insufficientContext, true);
  assert.match(result.answer, /couldn't find sufficiently relevant information/i);
  assert.deepEqual(result.sources, []);
});

test('shows relevant cited excerpts, without claiming they are a generated answer, during Gemini outage', () => {
  const documentId = new mongoose.Types.ObjectId();
  const result = createUnavailableTutorFallback([
    {
      sourceId: 'S1',
      documentId,
      documentName: 'Apollo.pdf',
      pageNumber: 3,
      text: 'Astronauts left a message on the lunar surface.',
      score: 0.76,
    },
  ]);

  assert.equal(result.fallback, true);
  assert.equal(result.insufficientContext, false);
  assert.match(result.answer, /retrieved excerpts rather than a generated answer/i);
  assert.match(result.answer, /lunar surface/);
  assert.deepEqual(result.sources, [{
    sourceId: 'S1',
    documentId: String(documentId),
    documentName: 'Apollo.pdf',
    pageNumber: 3,
  }]);
});

test('preserves relevant excerpts from multiple selected documents during Gemini outage', () => {
  const firstDocumentId = new mongoose.Types.ObjectId();
  const secondDocumentId = new mongoose.Types.ObjectId();
  const retrieved = [
    { sourceId: 'S1', documentId: firstDocumentId, documentName: 'RFC.pdf', pageNumber: 145, text: 'HTTP status codes.', score: 0.83 },
    { sourceId: 'S2', documentId: firstDocumentId, documentName: 'RFC.pdf', pageNumber: 125, text: 'Status-code classes.', score: 0.82 },
    { sourceId: 'S3', documentId: firstDocumentId, documentName: 'RFC.pdf', pageNumber: 126, text: 'Response status.', score: 0.81 },
    { sourceId: 'S4', documentId: secondDocumentId, documentName: 'Apollo.pdf', pageNumber: 3, text: 'Message on the lunar surface.', score: 0.74 },
  ];

  const result = createUnavailableTutorFallback(retrieved);

  assert.deepEqual(result.sources.map((source) => source.documentName), [
    'RFC.pdf',
    'Apollo.pdf',
    'RFC.pdf',
    'RFC.pdf',
  ]);
});

test('includes a relevant chunk ranked just below the first three fallback matches', () => {
  const documentId = new mongoose.Types.ObjectId();
  const result = createUnavailableTutorFallback([
    { sourceId: 'S1', documentId, documentName: 'RFC.pdf', pageNumber: 145, text: 'Status-code registration.', score: 0.89 },
    { sourceId: 'S2', documentId, documentName: 'RFC.pdf', pageNumber: 125, text: 'General status-code overview.', score: 0.88 },
    { sourceId: 'S3', documentId, documentName: 'RFC.pdf', pageNumber: 125, text: 'Handling unrecognized codes.', score: 0.87 },
    { sourceId: 'S4', documentId, documentName: 'RFC.pdf', pageNumber: 125, text: '2xx successful: the request was successfully received, understood, and accepted.', score: 0.86 },
    { sourceId: 'S5', documentId, documentName: 'RFC.pdf', pageNumber: 127, text: 'Protocol switching details.', score: 0.83 },
  ]);

  assert.match(result.answer, /2xx successful: the request was successfully received/i);
  assert.ok(result.sources.some((source) => source.sourceId === 'S4'));
  assert.equal(result.sources.length, 5);
});
