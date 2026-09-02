import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof window === 'undefined' && typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  return '';
}

export async function generateStandardWorksheetPdfBase64(): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Header Box
  page.drawRectangle({
    x: 36,
    y: height - 85,
    width: width - 72,
    height: 55,
    color: rgb(0.24, 0.31, 0.71),
  });

  page.drawText('Jeonnam Girls High School | Class Worksheet', {
    x: 48,
    y: height - 52,
    size: 11,
    font: fontRegular,
    color: rgb(0.9, 0.93, 1),
  });

  page.drawText('Unit 1: Introduction to Artificial Intelligence (Lesson 1)', {
    x: 48,
    y: height - 72,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Student info card
  page.drawRectangle({
    x: width - 210,
    y: height - 80,
    width: 165,
    height: 45,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
  });

  page.drawText('Grade/Class: ____   No: ____', {
    x: width - 200,
    y: height - 53,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  page.drawText('Name: ________________', {
    x: width - 200,
    y: height - 71,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Title
  page.drawText('Topic: Concept and History of Artificial Intelligence', {
    x: 40,
    y: height - 115,
    size: 15,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2),
  });

  // Box 1: Core learning points
  page.drawRectangle({
    x: 36,
    y: height - 200,
    width: width - 72,
    height: 72,
    color: rgb(0.96, 0.97, 1),
    borderColor: rgb(0.78, 0.82, 0.95),
    borderWidth: 1,
  });

  page.drawText('1. Learning Goals & Core Summary', {
    x: 46,
    y: height - 146,
    size: 11,
    font: fontBold,
    color: rgb(0.24, 0.31, 0.71),
  });

  page.drawText('- Understanding AI definition: Implementing human intelligent behavior in software', {
    x: 48,
    y: height - 165,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.25, 0.3, 0.4),
  });

  page.drawText('- Turing Test: Criterion for machine intelligence to distinguish human-like conversation', {
    x: 48,
    y: height - 182,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.25, 0.3, 0.4),
  });

  // Section 2: Questions
  let currentY = height - 230;
  page.drawText('2. Practice Questions & Reflections', {
    x: 40,
    y: currentY,
    size: 12,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2),
  });
  currentY -= 25;

  page.drawText('[Q1] Explain the difference between Rule-Based AI and Data-Driven AI.', {
    x: 45,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });
  currentY -= 15;

  for (let i = 0; i < 4; i++) {
    currentY -= 18;
    page.drawLine({
      start: { x: 45, y: currentY },
      end: { x: width - 45, y: currentY },
      thickness: 0.8,
      color: rgb(0.75, 0.8, 0.88),
    });
  }

  currentY -= 30;
  page.drawText('[Q2] List 3 examples of generative AI technologies in our daily life.', {
    x: 45,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });
  currentY -= 15;

  for (let i = 0; i < 4; i++) {
    currentY -= 18;
    page.drawLine({
      start: { x: 45, y: currentY },
      end: { x: width - 45, y: currentY },
      thickness: 0.8,
      color: rgb(0.75, 0.8, 0.88),
    });
  }

  page.drawText('- Page 1 of 1 - [Jeonnam Girls High School AI Worksheet]', {
    x: width / 2 - 120,
    y: 30,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65),
  });

  const pdfBytes = await pdfDoc.save();
  const base64 = uint8ArrayToBase64(pdfBytes);
  return `data:application/pdf;base64,${base64}`;
}
