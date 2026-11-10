import { GoogleGenAI } from '@google/genai';

let client;
let configuredApiKey;

export class GeminiServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
  }
}

function getUpstreamErrorDetails(error) {
  let payload = error?.error;
  if (!payload && typeof error?.message === 'string') {
    try {
      payload = JSON.parse(error.message);
    } catch {
      payload = null;
    }
  }

  const apiError = payload?.error ?? payload;
  const httpStatus = Number(error?.status ?? error?.statusCode ?? apiError?.code);
  return {
    httpStatus: Number.isFinite(httpStatus) ? httpStatus : null,
    code: typeof apiError?.status === 'string'
      ? apiError.status
      : typeof error?.code === 'string'
        ? error.code
        : null,
    message: typeof apiError?.message === 'string'
      ? apiError.message
      : String(error?.message ?? 'Unknown Gemini error'),
  };
}

function redactSensitiveData(message, apiKey) {
  let safeMessage = String(message);
  if (apiKey) safeMessage = safeMessage.split(apiKey).join('[REDACTED]');
  return safeMessage
    .replace(/\bAIza[\w-]{20,}\b/g, '[REDACTED]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[REDACTED]')
    .slice(0, 500);
}

function getClientAndModel() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();
  const missingConfiguration = [];

  if (!apiKey) missingConfiguration.push('GEMINI_API_KEY');
  if (!model) missingConfiguration.push('GEMINI_MODEL');
  if (missingConfiguration.length) {
    throw new GeminiServiceError(
      `Gemini is not configured. Set ${missingConfiguration.join(' and ')} in the backend environment.`,
      503,
    );
  }

  if (!client || configuredApiKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    configuredApiKey = apiKey;
  }

  return { client, model };
}

export async function generateTutorResponse(message) {
  const { client: gemini, model } = getClientAndModel();

  try {
    const result = await gemini.models.generateContent({
      model,
      contents: message,
    });
    const response = result.text?.trim();
    if (!response) {
      throw new GeminiServiceError('Gemini returned an empty response. Please try again.', 502);
    }
    return response;
  } catch (error) {
    if (error instanceof GeminiServiceError) throw error;

    const details = getUpstreamErrorDetails(error);
    const safeMessage = redactSensitiveData(details.message, process.env.GEMINI_API_KEY?.trim());
    console.error('[Gemini] Request failed', JSON.stringify({
      httpStatus: details.httpStatus,
      errorCode: details.code,
      message: safeMessage,
    }));

    const diagnostic = `${details.code ?? ''} ${details.message}`.toLowerCase();
    if (/quota|billing|daily limit/.test(diagnostic)) {
      throw new GeminiServiceError('Gemini API quota is exhausted. Check the quota and billing for the backend API key.', 429);
    }
    if (/api_key_invalid|api[_ ]key.*(?:invalid|not valid)|invalid.*api[_ ]key|permission_denied|unauthenticated/.test(diagnostic)
      || details.httpStatus === 401
      || details.httpStatus === 403) {
      throw new GeminiServiceError('Gemini rejected the backend API key or its permissions. Check GEMINI_API_KEY.', 503);
    }
    if (details.httpStatus === 404 || /not_found|model.*not found|not supported for generatecontent/.test(diagnostic)) {
      throw new GeminiServiceError('The configured Gemini model is unavailable for generateContent. Update GEMINI_MODEL to an available model.', 503);
    }
    if (details.httpStatus === 400 || /invalid_argument|malformed/.test(diagnostic)) {
      throw new GeminiServiceError('Gemini rejected the request format. Check the message and Gemini request configuration.', 400);
    }
    if (details.httpStatus === 429 || /resource_exhausted|rate.?limit/.test(diagnostic)) {
      throw new GeminiServiceError('Gemini is rate-limited right now. Please wait and try again.', 429);
    }
    if (details.httpStatus !== null && details.httpStatus >= 500) {
      throw new GeminiServiceError('Gemini is temporarily unavailable. Please try again shortly.', 503);
    }

    throw new GeminiServiceError('Gemini could not generate a response. Check the backend logs for the upstream error details.', 502);
  }
}
