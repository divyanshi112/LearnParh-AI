import mongoose from 'mongoose';
import { LocalStudyMaterialChunk, StudyMaterial, StudyMaterialChunk, Subject } from '../models/index.js';
import { GeminiServiceError } from '../services/gemini.service.js';
import {
  indexStudyMaterial,
  StudyMaterialRagError,
} from '../services/studyMaterialRag.service.js';
import {
  getEmbeddingProviderConfig,
  isEmbeddingConfigCompatible,
} from '../services/embedding.service.js';
import {
  deleteStoredPdf,
  extractPdfText,
  isPdfBuffer,
  MAX_STUDY_MATERIAL_BYTES,
  readStoredPdf,
  streamStoredPdf,
  storePdf,
} from '../services/studyMaterial.service.js';

const SAFE_FILENAME_CHARS = /[^\w.\- ()]/g;

function safeFilename(filename) {
  const basename = String(filename || 'study-material.pdf').split(/[\\/]/).pop();
  const cleaned = basename.replace(/[\r\n"]/g, '').replace(SAFE_FILENAME_CHARS, '_').slice(0, 200);
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

function toPublicDocument(document) {
  const provider = getEmbeddingProviderConfig();
  const isLegacyIndexed = document.indexingStatus === 'ready';
  const needsReindexing = (
    Boolean(document.embeddingModel) || ['ready', 'indexed'].includes(document.indexingStatus)
  )
    && !isEmbeddingConfigCompatible(document, provider);
  const indexingStatus = needsReindexing
    ? 'pending'
    : isLegacyIndexed
      ? 'indexed'
      : document.indexingStatus;
  return {
    _id: document._id,
    subject: document.subject,
    subjectName: document.subjectName,
    originalName: document.originalName,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    pageCount: document.pageCount,
    textCharacters: document.textCharacters,
    ocrPageCount: document.ocrPageCount || 0,
    uploadedAt: document.uploadedAt,
    indexingStatus,
    needsReindexing,
    indexingError: needsReindexing
      ? `This PDF was indexed with ${document.embeddingModel || 'an older embedding configuration'}; re-index it with ${provider.model} before using it.`
      : document.indexingError,
    embeddingModel: document.embeddingModel,
    embeddingProvider: document.embeddingProvider,
    embeddingDimensions: document.embeddingDimensions,
    indexedAt: document.indexedAt,
  };
}

async function setIndexingFailure(document, error) {
  const message = error instanceof GeminiServiceError
    || error instanceof StudyMaterialRagError
    || Number.isInteger(error?.statusCode)
    ? error.message
    : /local embedding model/i.test(error?.message || '')
      ? 'The local embedding model could not be loaded. Check backend model availability and network access, then retry indexing.'
      : 'PDF processing failed. Retry indexing or upload the file again.';
  if (message !== error.message) {
    console.error('[Study Materials] Indexing failed', error.message);
  }
  document.indexingStatus = 'failed';
  document.indexingError = message.slice(0, 500);
  document.indexingStartedAt = null;
  await document.save();
  return message;
}

export async function listStudyMaterials(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only students can access study materials.' });
  }
  const provider = getEmbeddingProviderConfig();
  await StudyMaterial.updateMany(
    {
      student: req.user.id,
      indexingStatus: { $in: ['ready', 'indexed'] },
      $or: [
        { embeddingModel: { $ne: provider.model } },
        { embeddingProvider: { $exists: true, $ne: provider.provider } },
        { embeddingDimensions: { $type: 'number', $ne: provider.dimensions } },
      ],
    },
    {
      $set: {
        indexingStatus: 'pending',
        indexingError: `This PDF needs to be re-indexed with ${provider.model}.`,
      },
    }
  );
  await StudyMaterial.updateMany(
    { student: req.user.id, indexingStatus: 'ready' },
    { $set: { indexingStatus: 'indexed' } }
  );

  const documents = await StudyMaterial.find({ student: req.user.id })
    .select('subject subjectName originalName contentType sizeBytes pageCount textCharacters ocrPageCount uploadedAt createdAt indexingStatus indexingError embeddingModel embeddingProvider embeddingDimensions indexedAt')
    .sort({ uploadedAt: -1 })
    .lean();
  return res.json({ success: true, documents });
}

export async function uploadStudyMaterial(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only students can upload study materials.' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Choose a PDF file to upload.' });
  }
  if (!isPdfBuffer(req.file.buffer)) {
    return res.status(415).json({ success: false, message: 'The uploaded file is not a valid PDF.' });
  }
  let subject = null;
  if (req.body.subjectId) {
    if (!mongoose.Types.ObjectId.isValid(req.body.subjectId)) {
      return res.status(400).json({ success: false, message: 'Select a valid study-plan subject.' });
    }
    subject = await Subject.findOne({ _id: req.body.subjectId, student: req.user.id })
      .select('name')
      .lean();
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Study-plan subject not found.' });
    }
  }

  let extracted;
  try {
    extracted = await extractPdfText(req.file.buffer);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('[Study Materials] PDF parsing failed', error.message);
    return res.status(422).json({
      success: false,
      message: 'This PDF could not be read. Check that it is not damaged or password-protected.',
    });
  }

  const filename = safeFilename(req.file.originalname);
  const gridFsFileId = await storePdf(
    req.file.buffer,
    filename,
    req.user.id,
    subject ? String(subject._id) : null
  );
  let document;
  try {
    document = await StudyMaterial.create({
      student: req.user.id,
      ...(subject ? { subject: subject._id } : {}),
      subjectName: subject?.name || 'General',
      originalName: filename,
      gridFsFileId,
      contentType: 'application/pdf',
      sizeBytes: req.file.size,
      pageCount: extracted.pageCount,
      extractedText: extracted.text,
      pages: extracted.pages,
      textCharacters: extracted.text.length,
      ocrPageCount: extracted.ocrPageCount,
      indexingStatus: 'pending',
    });
  } catch {
    await deleteStoredPdf(gridFsFileId);
    throw error;
  }

  return res.status(201).json({
    success: true,
    document: toPublicDocument(document),
  });
}

export async function indexStudyMaterialDocument(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only students can process study materials.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.documentId)) {
    return res.status(400).json({ success: false, message: 'Invalid study material ID.' });
  }

  const document = await StudyMaterial.findOneAndUpdate(
    {
      _id: req.params.documentId,
      student: req.user.id,
      $or: [
        { indexingStatus: { $ne: 'processing' } },
        { indexingStartedAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } },
        { indexingStartedAt: { $exists: false } },
        { indexingStartedAt: null },
      ],
    },
    {
      $set: {
        indexingStatus: 'processing',
        indexingError: '',
        indexingStartedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
  if (!document) {
    const ownedDocument = await StudyMaterial.findOne({
      _id: req.params.documentId,
      student: req.user.id,
    }).select('indexingStatus');
    if (!ownedDocument) {
      return res.status(404).json({ success: false, message: 'Study material not found.' });
    }
    return res.status(409).json({ success: false, message: 'This document is already being processed.' });
  }

  try {
    let pdf;
    try {
      pdf = await readStoredPdf(document.gridFsFileId);
    } catch (error) {
      throw new StudyMaterialRagError(
        'The original PDF could not be retrieved from storage. The existing document and metadata were retained; check storage availability and retry.',
        404
      );
    }
    const extracted = await extractPdfText(pdf);
    document.extractedText = extracted.text;
    document.pages = extracted.pages;
    document.textCharacters = extracted.text.length;
    document.pageCount = extracted.pageCount;
    document.ocrPageCount = extracted.ocrPageCount;
    const indexed = await indexStudyMaterial({
      studentId: document.student,
      documentId: document._id,
      pages: extracted.pages,
    });
    document.indexingStatus = 'indexed';
    document.indexingError = '';
    document.embeddingProvider = indexed.embeddingProvider;
    document.embeddingModel = indexed.embeddingModel;
    document.embeddingDimensions = indexed.embeddingDimensions;
    document.indexedAt = new Date();
    document.indexingStartedAt = null;
    await document.save();
    return res.json({
      success: true,
      document: toPublicDocument(document),
      chunkCount: indexed.chunkCount,
    });
  } catch (error) {
    const message = await setIndexingFailure(document, error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message,
      document: toPublicDocument(document),
    });
  }
}

export async function viewStudyMaterial(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only students can access study materials.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.documentId)) {
    return res.status(400).json({ success: false, message: 'Invalid study material ID.' });
  }

  const document = await StudyMaterial.findOne({
    _id: req.params.documentId,
    student: req.user.id,
  }).select('gridFsFileId originalName contentType sizeBytes');
  if (!document) {
    return res.status(404).json({ success: false, message: 'Study material not found.' });
  }

  const filename = safeFilename(document.originalName);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Length': document.sizeBytes,
    'Content-Disposition': `inline; filename="${filename}"`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': 'sandbox',
    'Cache-Control': 'private, no-store',
  });
  const downloadStream = streamStoredPdf(document.gridFsFileId);
  downloadStream.on('error', (error) => {
    if (!res.headersSent) {
      res.status(404).json({ success: false, message: 'The stored PDF file is unavailable.' });
    } else {
      res.destroy(error);
    }
  });
  downloadStream.pipe(res);
}

export async function deleteStudyMaterial(req, res) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only students can delete study materials.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.documentId)) {
    return res.status(400).json({ success: false, message: 'Invalid study material ID.' });
  }

  const document = await StudyMaterial.findOne({
    _id: req.params.documentId,
    student: req.user.id,
  });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Study material not found.' });
  }

  await StudyMaterialChunk.deleteMany({
    studentId: req.user.id,
    documentId: document._id,
  });
  await LocalStudyMaterialChunk.deleteMany({
    studentId: req.user.id,
    documentId: document._id,
  });
  await deleteStoredPdf(document.gridFsFileId);
  await document.deleteOne();
  return res.json({ success: true, message: 'Study material deleted.' });
}

export function handleUploadError(error, req, res, next) {
  if (error instanceof Error && error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `PDF files must be ${Math.floor(MAX_STUDY_MATERIAL_BYTES / (1024 * 1024))} MB or smaller.`,
      });
    }
    return res.status(400).json({ success: false, message: 'Upload one PDF file at a time.' });
  }
  return next(error);
}
