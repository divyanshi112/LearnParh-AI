import mongoose from 'mongoose';
import { LOCAL_EMBEDDING_DIMENSIONS } from '../services/embedding.service.js';

const localStudyMaterialChunkSchema = new mongoose.Schema(
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
          embedding.length === LOCAL_EMBEDDING_DIMENSIONS &&
          embedding.every(Number.isFinite)
        ),
        message: `Local study material embeddings must contain ${LOCAL_EMBEDDING_DIMENSIONS} finite values.`,
      },
    },
    embeddingModel: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'studyMaterialChunksLocal',
  }
);

localStudyMaterialChunkSchema.index(
  { studentId: 1, documentId: 1, chunkIndex: 1 },
  { unique: true }
);

const LocalStudyMaterialChunk = mongoose.model(
  'LocalStudyMaterialChunk',
  localStudyMaterialChunkSchema
);
export default LocalStudyMaterialChunk;
