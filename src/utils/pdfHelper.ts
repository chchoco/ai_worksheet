import { getPdfFromLocalCache, savePdfToLocalCache } from './pdfStorage';
import { getPdfFromCloudStorage } from '../firebase';

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

function triggerBlobDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', fileName);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

/**
 * Triggers robust browser download for a PDF URL, data URL, or Blob
 * Guarantees a genuine, openable .pdf file is downloaded with proper UTF-8 filename.
 */
export async function downloadFile(dataUrl: string, fileName: string, worksheetId?: string) {
  const finalFileName = fileName && fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName || '학습지'}.pdf`;

  // 1. Try to get original blob from IndexedDB cache
  if (worksheetId) {
    const cachedBlob = await getPdfFromLocalCache(worksheetId);
    if (cachedBlob && cachedBlob.size > 100) {
      triggerBlobDownload(cachedBlob, finalFileName);
      return;
    }
  }

  if (dataUrl && dataUrl.startsWith('/api/pdf/')) {
    const cachedBlob = await getPdfFromLocalCache(dataUrl);
    if (cachedBlob && cachedBlob.size > 100) {
      triggerBlobDownload(cachedBlob, finalFileName);
      return;
    }
  }

  // 2. Base64 data URL conversion to Blob
  if (dataUrl && (dataUrl.startsWith('data:application/pdf') || dataUrl.startsWith('data:;base64,') || dataUrl.startsWith('data:application/octet-stream'))) {
    try {
      const parts = dataUrl.split(',');
      const base64 = parts.length > 1 ? parts[1] : parts[0];
      const byteCharacters = atob(base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      triggerBlobDownload(blob, finalFileName);
      return;
    } catch (err) {
      console.warn('Base64 decode failed for download:', err);
    }
  }

  // 3. Fetch from Server endpoint as binary Blob
  if (dataUrl && (dataUrl.startsWith('/') || dataUrl.startsWith('http'))) {
    try {
      const res = await fetch(dataUrl);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const rawBlob = await res.blob();
          const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
          
          // Cache to IndexedDB for next time
          if (worksheetId) savePdfToLocalCache(worksheetId, pdfBlob);
          savePdfToLocalCache(dataUrl, pdfBlob);

          triggerBlobDownload(pdfBlob, finalFileName);
          return;
        }
      }
    } catch (err) {
      console.warn('Direct fetch for download failed, trying fallback:', err);
    }
  }

  // 4. Try Firestore Cloud PDF Storage
  if (worksheetId) {
    const cloudBlob = await getPdfFromCloudStorage(worksheetId);
    if (cloudBlob && cloudBlob.size > 100) {
      savePdfToLocalCache(worksheetId, cloudBlob);
      triggerBlobDownload(cloudBlob, finalFileName);
      return;
    }
  }
  if (dataUrl && dataUrl.startsWith('/api/pdf/')) {
    const cleanId = dataUrl.replace('/api/pdf/', '').replace(/\.pdf$/, '').trim();
    const cloudBlob = await getPdfFromCloudStorage(cleanId);
    if (cloudBlob && cloudBlob.size > 100) {
      savePdfToLocalCache(dataUrl, cloudBlob);
      triggerBlobDownload(cloudBlob, finalFileName);
      return;
    }
  }

  // 5. Fallback anchor tag
  const link = document.createElement('a');
  link.href = dataUrl;
  link.setAttribute('download', finalFileName);
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open PDF in new tab for direct full-screen reading/printing
 */
export async function openPdfInNewTab(dataUrl: string, worksheetId?: string) {
  if (!dataUrl) return;

  // 1. Check local cache
  if (worksheetId) {
    const cached = await getPdfFromLocalCache(worksheetId);
    if (cached) {
      const blobUrl = URL.createObjectURL(cached);
      window.open(blobUrl, '_blank');
      return;
    }
  }

  // 2. Base64
  if (dataUrl.startsWith('data:application/pdf') || dataUrl.startsWith('data:;base64,')) {
    try {
      const parts = dataUrl.split(',');
      const base64 = parts.length > 1 ? parts[1] : parts[0];
      const byteCharacters = atob(base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      return;
    } catch {
      window.open(dataUrl, '_blank');
      return;
    }
  }

  // 3. Direct fetch
  if (dataUrl.startsWith('/') || dataUrl.startsWith('http')) {
    try {
      const res = await fetch(dataUrl);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const blob = await res.blob();
          const pdfBlob = new Blob([blob], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(pdfBlob);
          window.open(blobUrl, '_blank');
          return;
        }
      }
    } catch {}
  }

  // 4. Check Firestore Cloud Storage
  if (worksheetId) {
    const cloudBlob = await getPdfFromCloudStorage(worksheetId);
    if (cloudBlob && cloudBlob.size > 100) {
      const blobUrl = URL.createObjectURL(cloudBlob);
      window.open(blobUrl, '_blank');
      return;
    }
  }
  if (dataUrl && dataUrl.startsWith('/api/pdf/')) {
    const cleanId = dataUrl.replace('/api/pdf/', '').replace(/\.pdf$/, '').trim();
    const cloudBlob = await getPdfFromCloudStorage(cleanId);
    if (cloudBlob && cloudBlob.size > 100) {
      const blobUrl = URL.createObjectURL(cloudBlob);
      window.open(blobUrl, '_blank');
      return;
    }
  }

  window.open(dataUrl, '_blank');
}

/**
 * Direct print triggering for PDF or printable element
 */
export function triggerPrintWorksheet(elementId: string, pdfUrl?: string, worksheetId?: string) {
  if (pdfUrl) {
    openPdfInNewTab(pdfUrl, worksheetId);
    return;
  }

  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  window.print();
}

