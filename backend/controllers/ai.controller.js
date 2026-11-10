import { generateTutorResponse, GeminiServiceError } from '../services/gemini.service.js';

const MAX_MESSAGE_LENGTH = 4000;

export async function chat(req, res, next) {
  const { message } = req.body;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'A non-empty message is required.' });
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    });
  }

  try {
    const response = await generateTutorResponse(message.trim());
    return res.status(200).json({ success: true, response });
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return next(error);
  }
}
