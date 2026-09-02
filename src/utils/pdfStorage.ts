/**
 * IndexedDB-backed high-capacity storage for PDF documents
 * Keeps full-fidelity PDF binaries locally for instant preview, offline access, and 100% reliable download
 */

const DB_NAME = 'ClassWorksheetPdfStorage';
const STORE_NAME = 'pdf_documents';
const DB_VERSION = 1;

function openPdfDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Save PDF binary (Blob, ArrayBuffer, or Base64 string) to IndexedDB
 */
export async function savePdfToLocalCache(key: string, data: Blob | ArrayBuffer | Uint8Array | string): Promise<boolean> {
  try {
    if (!key) return false;
    const db = await openPdfDatabase();

    let blobToStore: Blob;
    if (data instanceof Blob) {
      blobToStore = data;
    } else if (data instanceof ArrayBuffer) {
      blobToStore = new Blob([data], { type: 'application/pdf' });
    } else if (data instanceof Uint8Array) {
      blobToStore = new Blob([data.buffer as ArrayBuffer], { type: 'application/pdf' });
    } else if (typeof data === 'string') {
      if (data.startsWith('data:')) {
        const parts = data.split(',');
        const base64 = parts.length > 1 ? parts[1] : parts[0];
        const byteCharacters = atob(base64);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        blobToStore = new Blob([byteNumbers], { type: 'application/pdf' });
      } else {
        // Normal URL string - do not store as binary
        return false;
      }
    } else {
      return false;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(blobToStore, key);

      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Could not save PDF to IndexedDB:', err);
    return false;
  }
}

/**
 * Retrieve PDF Blob from IndexedDB
 */
export async function getPdfFromLocalCache(key: string): Promise<Blob | null> {
  try {
    if (!key) return null;
    const db = await openPdfDatabase();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        if (getRequest.result instanceof Blob) {
          resolve(getRequest.result);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Could not retrieve PDF from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete cached PDF
 */
export async function deletePdfFromLocalCache(key: string): Promise<void> {
  try {
    if (!key) return;
    const db = await openPdfDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
  } catch {
    // ignore
  }
}
