import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPdfText } from '../services/studyMaterial.service.js';

function createPdf(content) {
  const pageContents = Array.isArray(content) ? content : [content];
  const fontId = pageContents.length + 3;
  const contentStartId = fontId + 1;
  const pageIds = pageContents.map((_, index) => index + 3);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageContents.length} >>`,
    ...pageContents.map((_, index) => (
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentStartId + index} 0 R >>`
    )),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ...pageContents.map((pageContent) => (
      `<< /Length ${Buffer.byteLength(pageContent)} >>\nstream\n${pageContent}\nendstream`
    )),
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const crossReferenceOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${crossReferenceOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

test('extracts selectable text with page attribution and page count from a PDF', async () => {
  const expectedText = 'Study material extraction remains on the existing selectable text path.';
  const pdf = createPdf(`BT /F1 12 Tf 20 100 Td (${expectedText}) Tj ET`);

  const extracted = await extractPdfText(pdf);
  assert.equal(extracted.text, expectedText);
  assert.equal(extracted.pageCount, 1);
  assert.equal(extracted.ocrPageCount, 0);
  assert.deepEqual(extracted.pages, [{ pageNumber: 1, text: expectedText }]);
});

test('renders low-text pages and adds OCR text with the original page number', async () => {
  const pdf = createPdf('BT /F1 12 Tf ET');
  const extracted = await extractPdfText(pdf, {
    ocrPages: async (images) => {
      assert.equal(images.length, 1);
      assert.equal(images[0].pageNumber, 1);
      assert.equal(images[0].image.subarray(1, 4).toString(), 'PNG');
      return [{ pageNumber: 1, text: 'This page was read by OCR from its rendered scan.' }];
    },
  });

  assert.equal(extracted.ocrPageCount, 1);
  assert.equal(extracted.pageCount, 1);
  assert.deepEqual(extracted.pages, [{
    pageNumber: 1,
    text: 'This page was read by OCR from its rendered scan.',
  }]);
  assert.match(extracted.text, /read by OCR/);
});

test('preserves selectable text and merges OCR on scanned pages in page order', async () => {
  const firstPageText = 'This first page contains enough selectable text to avoid OCR.';
  const pdf = createPdf([
    `BT /F1 12 Tf 20 100 Td (${firstPageText}) Tj ET`,
    'BT /F1 12 Tf ET',
  ]);
  const extracted = await extractPdfText(pdf, {
    ocrPages: async (images) => {
      assert.deepEqual(images.map(({ pageNumber }) => pageNumber), [2]);
      return [{ pageNumber: 2, text: 'OCR recovered the scanned second page.' }];
    },
  });

  assert.equal(extracted.pageCount, 2);
  assert.deepEqual(extracted.pages, [
    { pageNumber: 1, text: firstPageText },
    { pageNumber: 2, text: 'OCR recovered the scanned second page.' },
  ]);
  assert.ok(extracted.text.indexOf(firstPageText) < extracted.text.indexOf('OCR recovered'));
});

test('combines short selectable text with OCR text from the same page', async () => {
  const pdf = createPdf('BT /F1 12 Tf 20 100 Td (Scanned heading) Tj ET');
  const extracted = await extractPdfText(pdf, {
    ocrPages: async (images) => [{
      pageNumber: images[0].pageNumber,
      text: 'Scanned heading and recognized body text.',
    }],
  });

  assert.equal(extracted.pages[0].text, 'Scanned heading and recognized body text.');
});

test('rejects PDFs when OCR finds no readable text', async () => {
  const pdf = createPdf('BT /F1 12 Tf ET');

  await assert.rejects(
    extractPdfText(pdf, { ocrPages: async (pages) => pages.map(({ pageNumber }) => ({ pageNumber, text: '' })) }),
    (error) => error.statusCode === 422 && /including after OCR/.test(error.message)
  );
});

test('rejects malformed PDF data', async () => {
  await assert.rejects(
    extractPdfText(Buffer.from('%PDF-not-a-document')),
    (error) => error.statusCode === 422 && /damaged|unsupported/i.test(error.message)
  );
});

test('rejects data without a PDF signature before parsing', async () => {
  await assert.rejects(
    extractPdfText(Buffer.from('not a PDF')),
    (error) => error.statusCode === 415 && /PDF signature/.test(error.message)
  );
});
