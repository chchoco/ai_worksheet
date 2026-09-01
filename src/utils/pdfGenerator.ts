import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Creates a valid, well-structured, multi-page sample PDF document for worksheets
 */
export async function createSampleWorksheetPdfBase64(
  schoolName: string,
  grade: string,
  unitTitle: string,
  lessonNumber: string,
  title: string,
  keyPoints: string[] = [],
  description = ''
): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Page 1: Main Worksheet
    const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page1.getSize();

    // Top Header Banner
    page1.drawRectangle({
      x: 35,
      y: height - 85,
      width: width - 70,
      height: 55,
      color: rgb(0.24, 0.31, 0.71), // Indigo
      borderColor: rgb(0.18, 0.24, 0.58),
      borderWidth: 1,
    });

    page1.drawText(`${schoolName || 'School'} | ${grade || 'Class'}`, {
      x: 48,
      y: height - 52,
      size: 11,
      font: regularFont,
      color: rgb(0.9, 0.93, 1),
    });

    page1.drawText(`${unitTitle} - ${lessonNumber}`, {
      x: 48,
      y: height - 72,
      size: 14,
      font: font,
      color: rgb(1, 1, 1),
    });

    // Student Info Box (Right side of header)
    page1.drawRectangle({
      x: width - 210,
      y: height - 80,
      width: 165,
      height: 45,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.8, 0.85, 0.95),
      borderWidth: 1,
    });

    page1.drawText('Grade/Class: ____   No: ____', {
      x: width - 200,
      y: height - 53,
      size: 9,
      font: regularFont,
      color: rgb(0.2, 0.25, 0.35),
    });

    page1.drawText('Name: ________________', {
      x: width - 200,
      y: height - 71,
      size: 9,
      font: regularFont,
      color: rgb(0.2, 0.25, 0.35),
    });

    // Lesson Title
    page1.drawText(`[ Topic ] ${title}`, {
      x: 40,
      y: height - 115,
      size: 16,
      font: font,
      color: rgb(0.08, 0.12, 0.2),
    });

    // Learning Objectives Box
    page1.drawRectangle({
      x: 35,
      y: height - 190,
      width: width - 70,
      height: 60,
      color: rgb(0.96, 0.97, 1),
      borderColor: rgb(0.78, 0.82, 0.95),
      borderWidth: 1,
    });

    page1.drawText('1. Learning Goals & Summary', {
      x: 45,
      y: height - 145,
      size: 11,
      font: font,
      color: rgb(0.24, 0.31, 0.71),
    });

    const descText = description || 'Understand core computational and intelligent thinking principles.';
    page1.drawText(descText.length > 70 ? descText.substring(0, 70) + '...' : descText, {
      x: 45,
      y: height - 165,
      size: 10,
      font: regularFont,
      color: rgb(0.25, 0.3, 0.4),
    });

    // Core Key Points Section
    let currentY = height - 215;
    page1.drawText('2. Key Concepts & Activities', {
      x: 40,
      y: currentY,
      size: 12,
      font: font,
      color: rgb(0.08, 0.12, 0.2),
    });
    currentY -= 25;

    const points = keyPoints.length > 0 ? keyPoints : [
      'Core concept definitions and logical structure',
      'Step-by-step problem decomposition and analysis',
      'Hands-on practice question and self-reflection'
    ];

    points.slice(0, 4).forEach((pt, idx) => {
      page1.drawText(`(${idx + 1}) ${pt.length > 75 ? pt.substring(0, 75) + '...' : pt}`, {
        x: 50,
        y: currentY,
        size: 10,
        font: regularFont,
        color: rgb(0.2, 0.25, 0.35),
      });
      currentY -= 20;
    });

    // Question 1: Activity Practice
    currentY -= 15;
    page1.drawText('3. Worksheet Questions & Answers', {
      x: 40,
      y: currentY,
      size: 12,
      font: font,
      color: rgb(0.08, 0.12, 0.2),
    });
    currentY -= 25;

    page1.drawText('[Q1] Describe the main concept in your own words with an everyday example.', {
      x: 45,
      y: currentY,
      size: 10,
      font: font,
      color: rgb(0.15, 0.2, 0.3),
    });
    currentY -= 15;

    // Answer Lines
    for (let i = 0; i < 4; i++) {
      currentY -= 18;
      page1.drawLine({
        start: { x: 45, y: currentY },
        end: { x: width - 45, y: currentY },
        thickness: 0.8,
        color: rgb(0.75, 0.8, 0.88),
      });
    }

    // Question 2
    currentY -= 30;
    page1.drawText('[Q2] Identify 2 key differences discussed in this lesson and summarize.', {
      x: 45,
      y: currentY,
      size: 10,
      font: font,
      color: rgb(0.15, 0.2, 0.3),
    });
    currentY -= 15;

    for (let i = 0; i < 4; i++) {
      currentY -= 18;
      page1.drawLine({
        start: { x: 45, y: currentY },
        end: { x: width - 45, y: currentY },
        thickness: 0.8,
        color: rgb(0.75, 0.8, 0.88),
      });
    }

    // Footer
    page1.drawText(`- Page 1 of 1 - [${title}]`, {
      x: width / 2 - 60,
      y: 30,
      size: 9,
      font: regularFont,
      color: rgb(0.5, 0.55, 0.65),
    });

    const pdfBytes = await pdfDoc.save();
    
    // Convert Uint8Array to base64
    let binary = '';
    const len = pdfBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(pdfBytes[i]);
    }
    const base64 = btoa(binary);
    return `data:application/pdf;base64,${base64}`;
  } catch (err) {
    console.error('Error generating valid PDF with pdf-lib:', err);
    return '';
  }
}
