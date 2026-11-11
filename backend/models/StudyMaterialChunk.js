import mongoose from 'mongoose';
import { GEMINI_EMBEDDING_DIMENSIONS } from '../services/embedding.service.js';

const studyMaterialChunkSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyMaterial',
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    pageNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (embedding) => (
          embedding.length === GEMINI_EMBEDDING_DIMENSIONS &&
          embedding.every(Number.isFinite)
        ),
        message: `Study material embeddings must contain ${GEMINI_EMBEDDING_DIMENSIONS} finite values.`,
      },
    },
    embeddingModel: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'studyMaterialChunks',
  }
);

studyMaterialChunkSchema.index(
  { studentId: 1, documentId: 1, chunkIndex: 1 },
  { unique: true }
);

const StudyMaterialChunk = mongoose.model('StudyMaterialChunk', studyMaterialChunkSchema);
export default StudyMaterialChunk;
