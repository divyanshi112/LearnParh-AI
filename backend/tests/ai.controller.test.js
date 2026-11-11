import assert from 'node:assert/strict';
import test from 'node:test';
import { StudyMaterial } from '../models/index.js';
import { chat } from '../controllers/ai.controller.js';

test('rejects selected PDFs that do not belong to the authenticated student', async () => {
  const studentId = '507f1f77bcf86cd799439011';
  const foreignDocumentId = '507f1f77bcf86cd799439012';
  const originalFind = StudyMaterial.find;
  let receivedFilter;

  StudyMaterial.find = (filter) => {
    receivedFilter = filter;
    return {
      select() {
        return this;
      },
      async lean() {
        return [];
      },
    };
  };

  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  try {
    await chat({
      user: { id: studentId },
      body: { message: 'What does the PDF explain?', documentIds: [foreignDocumentId] },
    }, response, (error) => {
      throw error;
    });

    assert.equal(receivedFilter.student, studentId);
    assert.deepEqual(receivedFilter._id.$in, [foreignDocumentId]);
    assert.equal(response.statusCode, 404);
    assert.match(response.body.message, /unavailable/i);
  } finally {
    StudyMaterial.find = originalFind;
  }
});

test('returns a named re-index instruction for PDFs using a stale embedding model', async () => {
  const studentId = '507f1f77bcf86cd799439011';
  const documentId = '507f1f77bcf86cd799439012';
  const previousProvider = process.env.RAG_EMBEDDING_PROVIDER;
  const previousLocalModel = process.env.LOCAL_EMBEDDING_MODEL;
  const originalFind = StudyMaterial.find;
  process.env.RAG_EMBEDDING_PROVIDER = 'local';
  process.env.LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
  StudyMaterial.find = () => ({
    select() {
      return this;
    },
    async lean() {
      return [{
        _id: documentId,
        originalName: 'Old notes.pdf',
        indexingStatus: 'indexed',
        embeddingModel: 'gemini-embedding-001',
        embeddingProvider: 'gemini',
        embeddingDimensions: 768,
      }];
    },
  });

  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  try {
    await chat({
      user: { id: studentId },
      body: { message: 'What does the PDF explain?', documentIds: [documentId] },
    }, response, (error) => {
      throw error;
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body.documentIds, [documentId]);
    assert.match(response.body.message, /Re-index "Old notes\.pdf"/);
    assert.match(response.body.message, /Xenova\/all-MiniLM-L6-v2/);
  } finally {
    StudyMaterial.find = originalFind;
    if (previousProvider === undefined) delete process.env.RAG_EMBEDDING_PROVIDER;
    else process.env.RAG_EMBEDDING_PROVIDER = previousProvider;
    if (previousLocalModel === undefined) delete process.env.LOCAL_EMBEDDING_MODEL;
    else process.env.LOCAL_EMBEDDING_MODEL = previousLocalModel;
  }
});
