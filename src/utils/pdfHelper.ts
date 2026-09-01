/**
 * Utility functions for PDF handling, printing, and file formatting
 */

export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return dateString;
  }
}

/**
 * Triggers browser download for a PDF data URL or Blob
 */
export function downloadFile(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Direct print triggering
 */
export function triggerPrintWorksheet(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const doc = printFrame.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>학습지 인쇄</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Pretendard", sans-serif; color: #1e293b; margin: 0; padding: 10px; }
          .print-header { border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          .print-title { font-size: 20px; font-weight: bold; }
          .print-meta { font-size: 13px; color: #64748b; }
          .student-box { border: 1px solid #94a3b8; padding: 6px 16px; border-radius: 4px; font-size: 13px; margin-top: 6px; }
          .key-points { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
          .section-title { font-size: 15px; font-weight: bold; margin-bottom: 8px; color: #0f172a; }
          .question-item { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #cbd5e1; }
          .answer-line { border-bottom: 1px solid #94a3b8; height: 32px; margin-top: 8px; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }, 300);
}
