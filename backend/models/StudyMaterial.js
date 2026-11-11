import mongoose from 'mongoose';

const studyMaterialSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    subjectName: {
      type: String,
      trim: true,
      default: 'General',
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    gridFsFileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    contentType: {
      type: String,
      enum: ['application/pdf'],
      default: 'application/pdf',
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    pageCount: {
      type: Number,
      required: true,
      min: 1,
    },
    extractedText: {
      type: String,
      required: true,
    },
    pages: {
      type: [{
        pageNumber: {
          type: Number,
          required: true,
          min: 1,
        },
        text: {
          type: String,
          required: true,
        },
      }],
      default: [],
    },
    textCharacters: {
      type: Number,
      required: true,
      min: 1,
    },
    ocrPageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    indexingStatus: {
      type: String,
      enum: ['pending', 'processing', 'indexed', 'failed', 'ready'],
      default: 'pending',
      index: true,
    },
    indexingError: {
      type: String,
      default: '',
      maxlength: 500,
    },
    indexingStartedAt: {
      type: Date,
      default: null,
    },
    embeddingModel: {
      type: String,
      default: '',
    },
    embeddingProvider: {
      type: String,
      default: '',
    },
    embeddingDimensions: {
      type: Number,
      default: null,
    },
    indexedAt: {
      type: Date,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

studyMaterialSchema.index({ student: 1, uploadedAt: -1 });

const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
export default StudyMaterial;
