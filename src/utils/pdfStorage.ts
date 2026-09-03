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

// Normalize storage key (strips UTF-8 BOM, trims whitespace, standardizes paths)
export function normalizePdfKey(rawKey: string): string {
  if (!rawKey) return '';
  return rawKey.replace(/^[\uFEFF\s]+/, '').replace(/[\uFEFF]/g, '').trim();
}

/**
 * Save PDF binary (Blob, ArrayBuffer, or Base64 string) to IndexedDB under one or multiple keys
 */
export async function savePdfToLocalCache(
  keyOrKeys: string | string[],
  data: Blob | ArrayBuffer | Uint8Array | string
): Promise<boolean> {
  try {
    const rawKeys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    const validKeys = Array.from(
      new Set(
        rawKeys
          .flatMap(k => [k, normalizePdfKey(k)])
          .filter(k => Boolean(k && k.trim() !== ''))
      )
    );

    if (validKeys.length === 0) return false;
    const db = await openPdfDatabase();

    let blobToStore: Blob;
    if (data instanceof Blob) {
      blobToStore = data;
    } else if (data instanceof ArrayBuffer) {
      blobToStore = new Blob([data], { type: 'application/pdf' });
    } else if (data instanceof Uint8Array) {
      const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      blobToStore = new Blob([arrayBuffer], { type: 'application/pdf' });
    } else if (typeof data === 'string') {
      if (data.startsWith('data:')) {
        const parts = data.split(',');
        const base64 = parts.length > 1 ? parts[1] : parts[0];
        const byteCharacters = atob(base64);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        blobToStore = new Blob([byteNumbers.buffer], { type: 'application/pdf' });
      } else {
        // Plain URL string - not binary
        return false;
      }
    } else {
      return false;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const key of validKeys) {
        store.put(blobToStore, key);
      }

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Could not save PDF to IndexedDB:', err);
    return false;
  }
}

/**
 * Retrieve PDF Blob from IndexedDB by trying one or more candidate keys
 */
export async function getPdfFromLocalCache(keyOrKeys: string | string[]): Promise<Blob | null> {
  try {
    const rawKeys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    const candidateKeys = Array.from(
      new Set(
        rawKeys
          .flatMap(k => [k, normalizePdfKey(k)])
          .filter(k => Boolean(k && k.trim() !== ''))
      )
    );

    if (candidateKeys.length === 0) return null;
    const db = await openPdfDatabase();

    // 1. Direct key lookups in order of priority
    for (const key of candidateKeys) {
      const blob = await new Promise<Blob | null>((resolve) => {
        try {
          const transaction = db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(key);
          request.onsuccess = () => {
            if (request.result instanceof Blob && request.result.size > 100) {
              resolve(request.result);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (blob) {
        return blob;
      }
    }

    // 2. Fuzzy search across all stored keys in IndexedDB
    const allKeys = await new Promise<IDBValidKey[]>((resolve) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });

    for (const searchKey of candidateKeys) {
      const cleanSearch = normalizePdfKey(searchKey).toLowerCase().replace(/\.pdf$/, '');
      if (cleanSearch.length < 2) continue;

      for (const k of allKeys) {
        if (typeof k === 'string') {
          const cleanK = normalizePdfKey(k).toLowerCase();
          if (cleanK.includes(cleanSearch) || cleanSearch.includes(cleanK)) {
            const fuzzyBlob = await new Promise<Blob | null>((resFuzzy) => {
              const tx = db.transaction([STORE_NAME], 'readonly');
              const st = tx.objectStore(STORE_NAME);
              const r = st.get(k);
              r.onsuccess = () => {
                if (r.result instanceof Blob && r.result.size > 100) {
                  resFuzzy(r.result);
                } else {
                  resFuzzy(null);
                }
              };
              r.onerror = () => resFuzzy(null);
            });

            if (fuzzyBlob) {
              return fuzzyBlob;
            }
          }
        }
      }
    }

    return null;
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

/**
 * Clear all cached PDFs from IndexedDB
 */
export async function clearAllPdfLocalCache(): Promise<void> {
  try {
    const db = await openPdfDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
  } catch {
    // ignore
  }
}
