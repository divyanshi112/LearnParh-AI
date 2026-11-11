import mongoose from 'mongoose';
import { PDFParse } from 'pdf-parse';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import englishLanguage from '@tesseract.js-data/eng';

export const MAX_STUDY_MATERIAL_BYTES = 10 * 1024 * 1024;
export const MAX_STUDY_MATERIAL_PAGES = 500;
export const MAX_EXTRACTED_TEXT_BYTES = 8 * 1024 * 1024;

const MIN_TEXT_CHARACTERS_PER_PAGE = 32;
const MIN_TEXT_WORDS_PER_PAGE = 5;
const OCR_BATCH_SIZE = 4;
const OCR_RENDER_WIDTH = 1400;
const PDF_SIGNATURE = Buffer.from('%PDF-');
const TESSERACT_CACHE_PATH = path.join(tmpdir(), 'learnpath-ai-tesseract');

function pdfError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function getPdfParseError(error) {
  if (/password|encrypted/i.test(error?.message || '')) {
    return pdfError('Password-protected PDFs are not supported. Remove the password and upload the PDF again.', 422);
  }
  return pdfError('This PDF is damaged or uses an unsupported format. Check the file and upload it again.', 422);
}

async function createTesseractWorker() {
  try {
    const { createWorker } = await import('tesseract.js');
    await mkdir(TESSERACT_CACHE_PATH, { recursive: true });
    return await createWorker('eng', undefined, {
      langPath: englishLanguage.langPath,
      cachePath: TESSERACT_CACHE_PATH,
      logger: () => {},
    });
  } catch (error) {
    console.error('[Study Materials] Tesseract worker initialization failed', error.message);
    throw pdfError('Local OCR could not be initialized. Check that the backend can access the English OCR data, then retry.', 503);
  }
}

export function isPdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) return false;
  const header = buffer.subarray(0, Math.min(buffer.length, 1024));
  return header.indexOf(PDF_SIGNATURE) >= 0;
}

export function isPdfPageTextInsufficient(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const wordCount = normalized.split(' ').filter(Boolean).length;
  return normalized.length < MIN_TEXT_CHARACTERS_PER_PAGE || wordCount < MIN_TEXT_WORDS_PER_PAGE;
}

export function applyOcrPageText(pages, ocrResults) {
  const ocrByPage = new Map(ocrResults.map((page) => [page.pageNumber, page.text]));
  return pages.map((page) => {
    const extractedText = page.text.trim();
    const ocrText = (ocrByPage.get(page.pageNumber) || '').trim();
    if (!ocrText || extractedText.includes(ocrText)) return page;
    if (!extractedText || ocrText.includes(extractedText)) return { ...page, text: ocrText };
    return { ...page, text: `${extractedText}\n${ocrText}` };
  });
}

function getStudyMaterialBucket() {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error('MongoDB is not connected.');
  }
  return new mongoose.mongo.GridFSBucket(database, { bucketName: 'studyMaterials' });
}

export async function extractPdfText(buffer, { ocrPages } = {}) {
  if (!isPdfBuffer(buffer)) {
    throw pdfError('The uploaded file does not have a valid PDF signature.', 415);
  }

  const parser = new PDFParse({ data: buffer });
  let ocrWorker;
  try {
    let info;
    try {
      info = await parser.getInfo();
    } catch (error) {
      throw getPdfParseError(error);
    }

    if (!Number.isInteger(info.total) || info.total < 1) {
      throw pdfError('The PDF does not contain any readable pages.', 422);
    }
    if (info.total > MAX_STUDY_MATERIAL_PAGES) {
      throw pdfError(`PDFs cannot exceed ${MAX_STUDY_MATERIAL_PAGES} pages.`, 413);
    }

    let parsed;
    try {
      parsed = await parser.getText();
    } catch (error) {
      throw getPdfParseError(error);
    }
    if (!Array.isArray(parsed.pages) || parsed.pages.length !== info.total) {
      throw pdfError('Not all PDF pages could be read. Check that the file is valid and retry.', 422);
    }

    let pages = parsed.pages.map((page, index) => ({
      pageNumber: page.num || index + 1,
      text: (typeof page.text === 'string' ? page.text : '').replace(/\u0000/g, '').trim(),
    }));

    const pagesNeedingOcr = pages.filter((page) => isPdfPageTextInsufficient(page.text));

    for (let offset = 0; offset < pagesNeedingOcr.length; offset += OCR_BATCH_SIZE) {
      const pageBatch = pagesNeedingOcr.slice(offset, offset + OCR_BATCH_SIZE);
      let screenshots;
      try {
        screenshots = await parser.getScreenshot({
          partial: pageBatch.map((page) => page.pageNumber),
          desiredWidth: OCR_RENDER_WIDTH,
          imageBuffer: true,
          imageDataUrl: false,
        });
      } catch (error) {
        console.error('[Study Materials] Scanned PDF page rendering failed', error.message);
        throw Object.assign(
          new Error('A scanned PDF page could not be rendered for OCR. Check that the PDF is valid and retry.'),
          { statusCode: 422 }
        );
      }

      if (
        screenshots.pages.length !== pageBatch.length ||
        screenshots.pages.some((screenshot, index) => screenshot.pageNumber !== pageBatch[index].pageNumber)
      ) {
        throw Object.assign(
          new Error('Not all scanned PDF pages could be rendered for OCR. Retry with a valid PDF.'),
          { statusCode: 422 }
        );
      }

      const images = screenshots.pages.map((page) => ({
        pageNumber: page.pageNumber,
        image: Buffer.from(page.data),
      }));
      let ocrResults;
      if (ocrPages) {
        ocrResults = await ocrPages(images);
      } else {
        if (!ocrWorker) ocrWorker = await createTesseractWorker();
        ocrResults = [];
        for (const page of images) {
          try {
            const result = await ocrWorker.recognize(page.image);
            ocrResults.push({ pageNumber: page.pageNumber, text: result.data.text.trim() });
          } catch (error) {
            console.error(`[Study Materials] OCR failed for page ${page.pageNumber}`, error.message);
            throw pdfError(`OCR could not read page ${page.pageNumber}. Check the scan quality and retry.`, 422);
          }
        }
      }
      if (
        !Array.isArray(ocrResults) ||
        ocrResults.length !== pageBatch.length ||
        ocrResults.some((page, index) => (
          page.pageNumber !== pageBatch[index].pageNumber ||
          typeof page.text !== 'string'
        ))
      ) {
        throw pdfError('OCR did not return a result for every scanned page. Retry with a valid PDF.', 422);
      }
      pages = applyOcrPageText(pages, ocrResults);
    }

    const text = pages
      .map((page) => page.text)
      .join('\n')
      .trim();
    if (!text) {
      throw pdfError('No readable text was found in this PDF, including after OCR. Check the scan quality or upload a text-based PDF.', 422);
    }
    if (Buffer.byteLength(text, 'utf8') > MAX_EXTRACTED_TEXT_BYTES) {
      throw pdfError('Extracted PDF text is too large to store.', 413);
    }

    return {
      text,
      pageCount: info.total,
      pages,
      ocrPageCount: pagesNeedingOcr.length,
    };
  } finally {
    try {
      if (ocrWorker) await ocrWorker.terminate();
    } finally {
      await parser.destroy();
    }
  }
}

export async function storePdf(buffer, filename, studentId, subjectId) {
  const bucket = getStudyMaterialBucket();
  const fileId = new mongoose.Types.ObjectId();
  const metadata = {
    studentId: new mongoose.Types.ObjectId(studentId),
  };
  if (subjectId) metadata.subjectId = new mongoose.Types.ObjectId(subjectId);
  const uploadStream = bucket.openUploadStreamWithId(fileId, filename, {
    contentType: 'application/pdf',
    metadata,
  });
  await pipeline(Readable.from([buffer]), uploadStream);
  return fileId;
}

export async function deleteStoredPdf(fileId) {
  await getStudyMaterialBucket().delete(new mongoose.Types.ObjectId(fileId));
}

export function streamStoredPdf(fileId) {
  return getStudyMaterialBucket().openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

export async function readStoredPdf(fileId) {
  const chunks = [];
  for await (const chunk of streamStoredPdf(fileId)) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
