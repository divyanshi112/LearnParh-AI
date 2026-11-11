import { generateTutorResponse, GeminiServiceError } from '../services/gemini.service.js';
import { StudyMaterial } from '../models/index.js';
import {
  answerFromStudyMaterials,
  StudyMaterialRagError,
} from '../services/studyMaterialRag.service.js';
import {
  getEmbeddingProviderConfig,
  isEmbeddingConfigCompatible,
} from '../services/embedding.service.js';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_SELECTED_DOCUMENTS = 20;

function validateChatHistory(history) {
  if (history === undefined) return [];
  if (!Array.isArray(history) || history.length > MAX_HISTORY_MESSAGES) return null;

  const validatedHistory = [];
  for (const entry of history) {
    if (
      !entry ||
      !['user', 'assistant'].includes(entry.role) ||
      typeof entry.text !== 'string' ||
      !entry.text.trim() ||
      entry.text.trim().length > MAX_MESSAGE_LENGTH
    ) {
      return null;
    }
    validatedHistory.push({ role: entry.role, text: entry.text.trim() });
  }
  return validatedHistory;
}

export async function chat(req, res, next) {
  const { message, documentIds } = req.body;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'A non-empty message is required.' });
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    });
  }

  const history = validateChatHistory(req.body.history);
  if (!history) {
    return res.status(400).json({
      success: false,
      message: `Conversation history must contain up to ${MAX_HISTORY_MESSAGES} valid messages.`,
    });
  }
  if (documentIds !== undefined && !Array.isArray(documentIds)) {
    return res.status(400).json({ success: false, message: 'Selected document IDs must be an array.' });
  }
  const selectedIds = [...new Set(documentIds || [])];
  if (
    selectedIds.length > MAX_SELECTED_DOCUMENTS ||
    selectedIds.some((id) => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))
  ) {
    return res.status(400).json({
      success: false,
      message: `Select up to ${MAX_SELECTED_DOCUMENTS} valid study materials.`,
    });
  }

  try {
    if (selectedIds.length) {
      const documents = await StudyMaterial.find({
        _id: { $in: selectedIds },
        student: req.user.id,
      })
        .select('_id originalName indexingStatus indexingError embeddingModel embeddingProvider embeddingDimensions')
        .lean();
      if (documents.length !== selectedIds.length) {
        return res.status(404).json({
          success: false,
          message: 'One or more selected PDFs are unavailable. Refresh your study materials and select documents you own.',
        });
      }
      const provider = getEmbeddingProviderConfig();
      const staleDocuments = documents.filter((document) => (
        (Boolean(document.embeddingModel) || ['ready', 'indexed'].includes(document.indexingStatus)) &&
        !isEmbeddingConfigCompatible(document, provider)
      ));
      if (staleDocuments.length) {
        return res.status(409).json({
          success: false,
          documentIds: staleDocuments.map(({ _id }) => String(_id)),
          message: `Re-index ${staleDocuments.map(({ originalName }) => `"${originalName}"`).join(', ')} with ${provider.model} before asking questions.`,
        });
      }
      const notIndexed = documents.filter((document) => (
        !['ready', 'indexed'].includes(document.indexingStatus)
      ));
      if (notIndexed.length) {
        const failedDocument = notIndexed.find(({ indexingStatus }) => indexingStatus === 'failed');
        const message = failedDocument
          ? `${failedDocument.originalName} could not be indexed: ${failedDocument.indexingError || 'retry indexing from My PDFs.'}`
          : notIndexed.some(({ indexingStatus }) => indexingStatus === 'processing')
            ? 'A selected PDF is still being indexed. Wait for processing to finish, then try again.'
            : 'A selected PDF is not indexed yet. Use Re-index in My PDFs, then try again.';
        return res.status(409).json({
          success: false,
          documentIds: notIndexed.map(({ _id }) => String(_id)),
          message,
        });
      }

      const result = await answerFromStudyMaterials({
        question: message.trim(),
        history,
        studentId: req.user.id,
        documents,
      });
      return res.status(200).json({ success: true, ...result });
    }

    const conversation = [
      ...history.map((entry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: entry.text }],
      })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];
    const response = await generateTutorResponse(conversation);
    return res.status(200).json({ success: true, response, sources: [] });
  } catch (error) {
    if (error instanceof GeminiServiceError || error instanceof StudyMaterialRagError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return next(error);
  }
}
