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
 * Triggers browser download for a PDF URL, data URL, or Blob
 */
export function downloadFile(dataUrl: string, fileName: string) {
  const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  
  if (dataUrl.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // If it is a backend streaming URL (/api/pdf/...)
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = finalFileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open PDF in new tab for direct full-screen reading/printing
 */
export function openPdfInNewTab(dataUrl: string) {
  if (!dataUrl) return;
  
  if (dataUrl.startsWith('data:application/pdf')) {
    // For base64 data URLs, convert to blob to open cleanly in a new tab
    try {
      const byteCharacters = atob(dataUrl.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      return;
    } catch {
      window.open(dataUrl, '_blank');
      return;
    }
  }

  window.open(dataUrl, '_blank');
}

/**
 * Direct print triggering for PDF or printable element
 */
export function triggerPrintWorksheet(elementId: string, pdfUrl?: string) {
  if (pdfUrl) {
    openPdfInNewTab(pdfUrl);
    return;
  }

  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  window.print();
}

