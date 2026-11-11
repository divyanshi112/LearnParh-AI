import express from 'express';
import multer from 'multer';
import {
  deleteStudyMaterial,
  handleUploadError,
  indexStudyMaterialDocument,
  listStudyMaterials,
  uploadStudyMaterial,
  viewStudyMaterial,
} from '../controllers/studyMaterial.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { MAX_STUDY_MATERIAL_BYTES } from '../services/studyMaterial.service.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_STUDY_MATERIAL_BYTES,
    files: 1,
    fields: 1,
  },
});
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.use(authenticateToken);
router.get('/', asyncRoute(listStudyMaterials));
router.post('/', upload.single('file'), handleUploadError, asyncRoute(uploadStudyMaterial));
router.post('/:documentId/index', asyncRoute(indexStudyMaterialDocument));
router.get('/:documentId/file', asyncRoute(viewStudyMaterial));
router.delete('/:documentId', asyncRoute(deleteStudyMaterial));

export default router;
