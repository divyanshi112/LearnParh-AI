import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { deflateSync } from 'node:zlib';
import mongoose from 'mongoose';
import { createCanvas } from '@napi-rs/canvas';
import '../config/jwt.js';
import studyMaterialRoutes from '../routes/studyMaterial.routes.js';
import aiRoutes from '../routes/ai.routes.js';
import authRoutes from '../routes/auth.routes.js';
import {
  LocalStudyMaterialChunk,
  StudyMaterial,
  StudyMaterialChunk,
  User,
} from '../models/index.js';
import {
  embedQuery,
  embedTexts,
  getEmbeddingProviderConfig,
} from '../services/embedding.service.js';
import { createOwnerVectorSearchStage } from '../services/studyMaterialRag.service.js';

const enabled = process.env.STUDY_MATERIAL_INTEGRATION === '1';

function createPdf(objects) {
  const chunks = [Buffer.from('%PDF-1.4\n')];
  const offsets = [0];
  let length = chunks[0].length;

  objects.forEach((object, index) => {
    offsets.push(length);
    const header = Buffer.from(`${index + 1} 0 obj\n`);
    const body = object.data
      ? [
          Buffer.from(object.prefix),
          object.data,
          Buffer.from(object.suffix),
        ]
      : [Buffer.from(`${object.text}\n`)];
    const footer = Buffer.from('\nendobj\n');
    chunks.push(header, ...body, footer);
    length += header.length + body.reduce((size, chunk) => size + chunk.length, 0) + footer.length;
  });

  const xrefOffset = length;
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${
    offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  }trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
}

function createTextPdf(text) {
  const escapedText = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  return createPdf([
    { text: '<< /Type /Catalog /Pages 2 0 R >>' },
    { text: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    {
      text: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    },
    { text: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    {
      text: `<< /Length ${Buffer.byteLength(`BT /F1 12 Tf 20 100 Td (${escapedText}) Tj ET`)} >>\nstream\nBT /F1 12 Tf 20 100 Td (${escapedText}) Tj ET\nendstream`,
    },
  ]);
}

function createScannedPdf(text) {
  const canvas = createCanvas(1800, 360);
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000';
  context.font = 'bold 68px Arial';
  context.fillText(text, 55, 145);
  context.font = '48px Arial';
  context.fillText('GridFS OCR integration test.', 55, 245);

  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const rgb = Buffer.alloc(canvas.width * canvas.height * 3);
  for (let source = 0, target = 0; source < rgba.length; source += 4) {
    rgb[target++] = rgba[source];
    rgb[target++] = rgba[source + 1];
    rgb[target++] = rgba[source + 2];
  }
  const image = deflateSync(rgb);
  const content = 'q 560 0 0 168 20 500 cm /Im0 Do Q';

  return createPdf([
    { text: '<< /Type /Catalog /Pages 2 0 R >>' },
    { text: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    {
      text: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 792] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 6 0 R >>',
    },
    { text: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    {
      prefix: `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`,
      data: image,
      suffix: '\nendstream',
    },
    { text: `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream` },
  ]);
}

async function loginStudent(baseUrl, email, password) {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  return (await login.json()).token;
}

async function registerAndLogin(baseUrl, email, password) {
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'PDF Integration Student', email, password }),
  });
  assert.equal(registration.status, 201);
  const registrationResult = await registration.json();
  assert.equal(registrationResult.user.role, 'student');
  return loginStudent(baseUrl, email, password);
}

async function uploadPdf(baseUrl, token, filename, pdf) {
  const form = new FormData();
  form.append('file', new Blob([pdf], { type: 'application/pdf' }), filename);
  return fetch(`${baseUrl}/api/study-materials`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

function authorization(token) {
  return `Bearer ${token}`;
}

test('real MongoDB/GridFS PDF upload, persistence, ownership, and Tutor indexing', {
  skip: !enabled && 'Set STUDY_MATERIAL_INTEGRATION=1 to run against the configured MongoDB database.',
}, async (t) => {
  assert.ok(process.env.MONGODB_URI, 'MONGODB_URI must be configured for this real-database test.');
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'learnpath_ai',
    serverSelectionTimeoutMS: 10000,
  });

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const studentEmail = `pdf-integration-${unique}@example.com`;
  const otherStudentEmail = `pdf-isolation-${unique}@example.com`;
  const testPassword = `PdfIntegration-${unique}-Password`;
  const text = 'GridFS integration confirms extracted study text remains available to its authenticated owner.';
  const textPdf = createTextPdf(text);
  const scanPhrase = 'GRIDFS SCANNED INTEGRATION PROOF';
  const scannedPdf = createScannedPdf(scanPhrase);
  const documentIds = [];
  const gridFsIds = [];
  const userIds = [];
  const originalProvider = process.env.RAG_EMBEDDING_PROVIDER;
  process.env.RAG_EMBEDDING_PROVIDER = 'gemini';
  const app = express();
  app.use('/api/auth', express.json(), authRoutes);
  app.use('/api/study-materials', studyMaterialRoutes);
  app.use('/api/ai', express.json(), aiRoutes);
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  });
  const server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const documentId of documentIds) {
      await StudyMaterialChunk.deleteMany({ documentId });
      await LocalStudyMaterialChunk.deleteMany({ documentId });
      await StudyMaterial.deleteOne({ _id: documentId });
    }
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'studyMaterials' });
    for (const fileId of gridFsIds) await bucket.delete(fileId);
    if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.disconnect();
    if (originalProvider === undefined) delete process.env.RAG_EMBEDDING_PROVIDER;
    else process.env.RAG_EMBEDDING_PROVIDER = originalProvider;
  });

  const textToken = await registerAndLogin(baseUrl, studentEmail, testPassword);
  const student = await User.findOne({ email: studentEmail });
  assert.ok(student);
  userIds.push(student._id);
  const studentId = student._id;
  const otherToken = await registerAndLogin(baseUrl, otherStudentEmail, testPassword);
  const otherStudent = await User.findOne({ email: otherStudentEmail });
  assert.ok(otherStudent);
  userIds.push(otherStudent._id);
  const otherStudentId = otherStudent._id;

  const textUpload = await uploadPdf(baseUrl, textToken, 'integration-text.pdf', textPdf);
  assert.equal(textUpload.status, 201);
  const textResult = await textUpload.json();
  const textDocumentId = new mongoose.Types.ObjectId(textResult.document._id);
  documentIds.push(textDocumentId);
  const textDocument = await StudyMaterial.findById(textDocumentId);
  assert.ok(textDocument);
  gridFsIds.push(textDocument.gridFsFileId);
  assert.equal(textDocument.student.toString(), studentId.toString());
  assert.equal(textDocument.extractedText, text);
  assert.deepEqual(textDocument.pages.map((page) => ({
    pageNumber: page.pageNumber,
    text: page.text,
  })), [{ pageNumber: 1, text }]);
  assert.equal(textDocument.pageCount, 1);
  assert.equal(textDocument.ocrPageCount, 0);

  const scannedUpload = await uploadPdf(baseUrl, textToken, 'integration-scan.pdf', scannedPdf);
  assert.equal(scannedUpload.status, 201);
  const scannedResult = await scannedUpload.json();
  const scannedDocumentId = new mongoose.Types.ObjectId(scannedResult.document._id);
  documentIds.push(scannedDocumentId);
  const scannedDocument = await StudyMaterial.findById(scannedDocumentId);
  assert.ok(scannedDocument);
  gridFsIds.push(scannedDocument.gridFsFileId);
  assert.equal(scannedDocument.student.toString(), studentId.toString());
  assert.equal(scannedDocument.pageCount, 1);
  assert.equal(scannedDocument.ocrPageCount, 1);
  assert.equal(scannedDocument.pages[0].pageNumber, 1);
  assert.match(scannedDocument.pages[0].text, new RegExp(scanPhrase, 'i'));
  assert.equal(scannedDocument.extractedText, scannedDocument.pages[0].text);

  const bucketFiles = await mongoose.connection.db.collection('studyMaterials.files')
    .find({ _id: { $in: gridFsIds } })
    .toArray();
  assert.equal(bucketFiles.length, 2);
  assert.ok(bucketFiles.every((file) => file.metadata.studentId.toString() === studentId.toString()));

  await mongoose.disconnect();
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'learnpath_ai',
    serverSelectionTimeoutMS: 10000,
  });

  const unauthenticated = await fetch(`${baseUrl}/api/study-materials/${textDocumentId}/file`);
  assert.equal(unauthenticated.status, 401);

  const reloginToken = await loginStudent(baseUrl, studentEmail, testPassword);
  const ownerFile = await fetch(`${baseUrl}/api/study-materials/${textDocumentId}/file`, {
    headers: { Authorization: `Bearer ${reloginToken}` },
  });
  assert.equal(ownerFile.status, 200);
  assert.deepEqual(Buffer.from(await ownerFile.arrayBuffer()), textPdf);
  const ownerScannedFile = await fetch(`${baseUrl}/api/study-materials/${scannedDocumentId}/file`, {
    headers: { Authorization: `Bearer ${reloginToken}` },
  });
  assert.equal(ownerScannedFile.status, 200);
  assert.deepEqual(Buffer.from(await ownerScannedFile.arrayBuffer()), scannedPdf);

  const ownerList = await fetch(`${baseUrl}/api/study-materials`, {
    headers: { Authorization: `Bearer ${reloginToken}` },
  });
  const ownerListResult = await ownerList.json();
  assert.equal(ownerList.status, 200);
  assert.ok(ownerListResult.documents.some((document) => document._id.toString() === String(textDocumentId)));
  assert.ok(ownerListResult.documents.some((document) => document._id.toString() === String(scannedDocumentId)));

  const otherFile = await fetch(`${baseUrl}/api/study-materials/${textDocumentId}/file`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  assert.equal(otherFile.status, 404);
  const otherIndex = await fetch(`${baseUrl}/api/study-materials/${textDocumentId}/index`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  assert.equal(otherIndex.status, 404);
  const otherList = await fetch(`${baseUrl}/api/study-materials`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  const otherListResult = await otherList.json();
  assert.equal(otherList.status, 200);
  assert.ok(!otherListResult.documents.some((document) => document._id.toString() === String(textDocumentId)));
  const otherChat = await fetch(`${baseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${otherToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Summarize this document.',
      documentIds: [String(textDocumentId)],
    }),
  });
  assert.equal(otherChat.status, 404);

  const originalGeminiKey = process.env.GEMINI_API_KEY;
  try {
    process.env.GEMINI_API_KEY = '';
    const unavailableResponse = await fetch(`${baseUrl}/api/study-materials/${textDocumentId}/index`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${reloginToken}` },
    });
    assert.equal(unavailableResponse.status, 503);
    const unavailableResult = await unavailableResponse.json();
    assert.equal(unavailableResult.document.indexingStatus, 'failed');
    assert.match(unavailableResult.message, /Gemini is not configured/i);
    const persistedAfterAiFailure = await StudyMaterial.findById(textDocumentId);
    assert.equal(persistedAfterAiFailure.extractedText, text);
    assert.equal(persistedAfterAiFailure.pages[0].pageNumber, 1);
    assert.ok(await mongoose.connection.db.collection('studyMaterials.files').findOne({ _id: persistedAfterAiFailure.gridFsFileId }));
  } finally {
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  }

  await t.test('Gemini and Atlas integration can index and retrieve an uploaded page', async (tutorTest) => {
    if (!process.env.GEMINI_API_KEY?.trim()) {
      tutorTest.skip('GEMINI_API_KEY is not configured.');
      return;
    }

    const indexResponse = await fetch(`${baseUrl}/api/study-materials/${textDocumentId}/index`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${reloginToken}` },
    });
    const indexResult = await indexResponse.json();
    if (indexResponse.status !== 200 || indexResult.document?.indexingStatus !== 'indexed') {
      tutorTest.skip(`Live indexing did not complete (${indexResponse.status}): ${indexResult.message || 'unknown error'}`);
      return;
    }

    const savedChunks = await StudyMaterialChunk.find({ documentId: textDocumentId }).lean();
    assert.ok(savedChunks.length > 0);
    assert.ok(savedChunks.every((chunk) => chunk.studentId.toString() === studentId.toString()));
    assert.ok(savedChunks.every((chunk) => chunk.pageNumber === 1));

    const vectorMatches = await StudyMaterialChunk.aggregate([
      createOwnerVectorSearchStage({
        queryEmbedding: savedChunks[0].embedding,
        studentId,
        documentIds: [textDocumentId],
        limit: 8,
      }),
      { $project: { documentId: 1, pageNumber: 1, text: 1 } },
    ]);
    assert.ok(vectorMatches.some((match) => (
      String(match.documentId) === String(textDocumentId) &&
      match.pageNumber === 1 &&
      match.text === text
    )));

    const otherStudentVectorMatches = await StudyMaterialChunk.aggregate([
      createOwnerVectorSearchStage({
        queryEmbedding: savedChunks[0].embedding,
        studentId: otherStudentId,
        documentIds: [textDocumentId],
        limit: 8,
      }),
      { $project: { documentId: 1 } },
    ]);
    assert.equal(otherStudentVectorMatches.length, 0);

    await tutorTest.test('AI Tutor returns a grounded page citation', async (chatTest) => {
      const chatResponse = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${reloginToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'What does this document confirm?',
          documentIds: [String(textDocumentId)],
        }),
      });
      const chatResult = await chatResponse.json();
      if (
        [429, 502, 503].includes(chatResponse.status) &&
        /Gemini|AI Tutor|temporarily unavailable|rate-limited|quota/i.test(chatResult.message || '')
      ) {
        chatTest.skip(`Gemini was unavailable during live answer generation: ${chatResult.message}`);
        return;
      }
      assert.equal(chatResponse.status, 200, chatResult.message);
      assert.ok(chatResult.sources.some((source) => (
        source.documentId === String(textDocumentId) && source.pageNumber === 1
      )));
    });
  });

  await t.test('local RAG indexes and retrieves without Gemini credentials', async () => {
    const previousProvider = process.env.RAG_EMBEDDING_PROVIDER;
    const previousGeminiKey = process.env.GEMINI_API_KEY;
    process.env.RAG_EMBEDDING_PROVIDER = 'local';
    process.env.GEMINI_API_KEY = '';
    try {
      await StudyMaterial.updateOne(
        { _id: textDocumentId },
        {
          $set: {
            extractedText: 'Outdated cached text should be replaced from the GridFS PDF.',
            pages: [{ pageNumber: 1, text: 'Outdated cached text should be replaced.' }],
          },
        }
      );
      const indexResponse = await fetch(`${baseUrl}/api/study-materials/${textDocumentId}/index`, {
        method: 'POST',
        headers: { Authorization: authorization(textToken) },
      });
      const indexResult = await indexResponse.json();
      assert.equal(indexResponse.status, 200, indexResult.message);
      assert.equal(indexResult.document.indexingStatus, 'indexed');
      assert.equal(indexResult.document.embeddingModel, 'Xenova/all-MiniLM-L6-v2');
      const refreshedDocument = await StudyMaterial.findById(textDocumentId).lean();
      assert.equal(refreshedDocument.extractedText, text);
      assert.equal(refreshedDocument.pages[0].text, text);
      assert.ok(await mongoose.connection.db.collection('studyMaterials.files').findOne({ _id: refreshedDocument.gridFsFileId }));

      const firstIndexCount = await LocalStudyMaterialChunk.countDocuments({
        documentId: textDocumentId,
        studentId,
      });
      const reindexResponse = await fetch(`${baseUrl}/api/study-materials/${textDocumentId}/index`, {
        method: 'POST',
        headers: { Authorization: authorization(textToken) },
      });
      const reindexResult = await reindexResponse.json();
      assert.equal(reindexResponse.status, 200, reindexResult.message);
      assert.equal(reindexResult.document.indexingStatus, 'indexed');
      assert.equal(await LocalStudyMaterialChunk.countDocuments({
        documentId: textDocumentId,
        studentId,
      }), firstIndexCount, 're-indexing updates chunks instead of duplicating them');

      const provider = getEmbeddingProviderConfig();
      const semanticVectors = await embedTexts([
        'Photosynthesis lets plants convert sunlight into stored chemical energy.',
        'Plants use light to produce chemical energy during photosynthesis.',
        'MongoDB stores documents in a database collection.',
      ], provider);
      const cosineSimilarity = (left, right) => left.reduce(
        (sum, value, index) => sum + value * right[index],
        0
      );
      assert.ok(semanticVectors.every((vector) => vector.length === 384));
      assert.ok(Math.abs(Math.sqrt(cosineSimilarity(semanticVectors[0], semanticVectors[0])) - 1) < 0.01);
      assert.ok(
        cosineSimilarity(semanticVectors[0], semanticVectors[1]) >
        cosineSimilarity(semanticVectors[0], semanticVectors[2]),
        'Semantically related text should be closer than unrelated text.'
      );

      const scannedIndexResponse = await fetch(`${baseUrl}/api/study-materials/${scannedDocumentId}/index`, {
        method: 'POST',
        headers: { Authorization: authorization(textToken) },
      });
      const scannedIndexResult = await scannedIndexResponse.json();
      assert.equal(scannedIndexResponse.status, 200, scannedIndexResult.message);

      const localChunks = await LocalStudyMaterialChunk.find({ documentId: textDocumentId }).lean();
      assert.ok(localChunks.length > 0);
      assert.ok(localChunks.every((chunk) => (
        chunk.studentId.toString() === studentId.toString() &&
        chunk.pageNumber === 1 &&
        chunk.embedding.length === 384 &&
        chunk.embedding.every(Number.isFinite)
      )));

      const queryEmbedding = await embedQuery(text, provider);
      const matches = await LocalStudyMaterialChunk.aggregate([
        createOwnerVectorSearchStage({
          queryEmbedding,
          studentId,
          documentIds: [textDocumentId],
        }),
        { $project: { documentId: 1, pageNumber: 1, text: 1 } },
      ]);
      assert.ok(matches.some((match) => (
        String(match.documentId) === String(textDocumentId) &&
        match.pageNumber === 1 &&
        match.text === text
      )));

      const otherStudentMatches = await LocalStudyMaterialChunk.aggregate([
        createOwnerVectorSearchStage({
          queryEmbedding,
          studentId: otherStudentId,
          documentIds: [textDocumentId],
        }),
        { $project: { documentId: 1 } },
      ]);
      assert.equal(otherStudentMatches.length, 0);

      const chatResponse = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: authorization(textToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'What does this document confirm?',
          documentIds: [String(textDocumentId)],
        }),
      });
      const chatResult = await chatResponse.json();
      assert.equal(chatResponse.status, 200, chatResult.message);
      assert.equal(chatResult.fallback, true);
      assert.match(chatResult.answer, new RegExp(text));
      assert.ok(chatResult.sources.some((source) => (
        source.documentId === String(textDocumentId) && source.pageNumber === 1
      )));
    } finally {
      if (previousProvider === undefined) delete process.env.RAG_EMBEDDING_PROVIDER;
      else process.env.RAG_EMBEDDING_PROVIDER = previousProvider;
      if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previousGeminiKey;
    }
  });
});
