import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Worksheet, ClassSettings } from './types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Target database ID from config
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, dbId);

export const WORKSHEETS_COLLECTION = 'worksheets';
export const SETTINGS_COLLECTION = 'settings';
export const SETTINGS_DOC_ID = 'global_settings';
export const PDF_STORAGE_COLLECTION = 'pdf_storage';

// Helper to remove any undefined or invalid properties before sending to Firestore
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        result[key] = value.filter(v => v !== undefined);
      } else if (value !== null && typeof value === 'object') {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// Sorting helper for worksheets:
// 1. Unit 1단원 -> 2단원 -> 3단원 -> 4단원
// 2. Inside unit: orderIndex ascending (first uploaded at the top, later below)
export function sortWorksheetsList(list: Worksheet[]): Worksheet[] {
  return [...list].sort((a, b) => {
    const matchA = (a.unitTitle || '').match(/(\d+)\s*단원/);
    const matchB = (b.unitTitle || '').match(/(\d+)\s*단원/);
    const uA = matchA ? parseInt(matchA[1], 10) : 999;
    const uB = matchB ? parseInt(matchB[1], 10) : 999;
    if (uA !== uB) return uA - uB;

    if (a.unitTitle !== b.unitTitle) {
      return (a.unitTitle || '').localeCompare(b.unitTitle || '', 'ko', { numeric: true });
    }

    if (typeof a.orderIndex === 'number' && typeof b.orderIndex === 'number' && a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    const lesA = (a.lessonNumber || '').match(/(\d+)/);
    const lesB = (b.lessonNumber || '').match(/(\d+)/);
    const lA = lesA ? parseInt(lesA[1], 10) : 999;
    const lB = lesB ? parseInt(lesB[1], 10) : 999;
    if (lA !== lB) return lA - lB;

    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
}

// Initial sample data if Firestore and backend are empty
export const INITIAL_SAMPLE_WORKSHEETS: Worksheet[] = [
  {
    id: 'ws-sample-1',
    unitId: 'unit-1',
    unitTitle: '1단원. 인공지능의 이해',
    lessonNumber: '1차시',
    title: '인공지능의 개념과 일상 속 AI 기술 탐색하기',
    subject: '인공지능 기초',
    grade: '고등학교',
    date: '2026-03-05',
    description: '지능의 의미를 이해하고 현대 사회 속 인공지능 활용 사례와 규칙 기반 AI vs 데이터 기반 AI의 차이점을 탐구합니다.',
    keyPoints: [
      '인공지능(AI), 머신러닝, 딥러닝의 포함 관계 이해',
      '일상 생활 속 인공지능 적용 분야(음성인식, 추천 알고리즘, 자율주행)',
      '지능적 에이전트의 3요소: 인식(Perception), 판단(Reasoning), 행동(Action)'
    ],
    pdfFileName: '1차시_인공지능의_개념과_일상속_AI.pdf',
    pdfDataUrl: '/api/pdf/sample-1',
    fileSizeBytes: 248000,
    pageCount: 2,
    hasAnswerSheet: true,
    answerSheetText: '1. 인공지능 > 머신러닝 > 딥러닝의 계층 구조\n2. 규칙 기반(Rule-based) 시스템과 데이터 학습 기반 시스템의 차이\n3. 에이전트의 센서와 액추에이터 역할',
    showAnswerSheetToStudents: true,
    downloadCount: 42,
    viewCount: 156,
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-03-05T09:00:00.000Z',
    isImportant: true,
    orderIndex: 1,
  },
  {
    id: 'ws-sample-2',
    unitId: 'unit-1',
    unitTitle: '1단원. 인공지능의 이해',
    lessonNumber: '2차시',
    title: '인공지능의 발전 과정과 튜링 테스트',
    subject: '인공지능 기초',
    grade: '고등학교',
    date: '2026-03-12',
    description: '인공지능의 태동기, 암흑기, 딥러닝 부흥기의 역사적 흐름과 튜링 테스트 및 다트머스 회의를 분석합니다.',
    keyPoints: [
      '앨런 튜링의 튜링 테스트(Turing Test) 의의와 한계',
      '1956년 다트머스 회의와 인공지능 용어의 탄생',
      '컴퓨팅 파워 향상, 빅데이터, 딥러닝 알고리즘의 결합'
    ],
    pdfFileName: '2차시_인공지능_발전과정과_튜링테스트.pdf',
    pdfDataUrl: '/api/pdf/sample-2',
    fileSizeBytes: 312000,
    pageCount: 2,
    hasAnswerSheet: true,
    answerSheetText: '1. 모방 게임(Imitation Game) 실험 원리\n2. 1차·2차 AI 겨울의 원인(연산능력 부족 및 한계)\n3. GPU 병렬연산의 도입 효과',
    showAnswerSheetToStudents: true,
    downloadCount: 38,
    viewCount: 129,
    createdAt: '2026-03-12T09:00:00.000Z',
    updatedAt: '2026-03-12T09:00:00.000Z',
    isImportant: false,
    orderIndex: 2,
  },
  {
    id: 'ws-sample-3',
    unitId: 'unit-2',
    unitTitle: '2단원. 인공지능과 데이터',
    lessonNumber: '1차시',
    title: '데이터의 수집과 정제 및 라벨링 실습',
    subject: '인공지능 기초',
    grade: '고등학교',
    date: '2026-03-19',
    description: '정형/비정형 데이터의 차이를 이해하고 학습용 데이터셋 구축 및 결측치 처리, 데이터 라벨링 과정을 학습합니다.',
    keyPoints: [
      '정형 데이터 vs 비정형 데이터(이미지, 텍스트, 음성)',
      '데이터 전처리의 중요성: 결측치, 이상치, 중복 데이터 정제',
      '지도학습을 위한 데이터 라벨링(Annotation) 방법'
    ],
    pdfFileName: '3차시_데이터의_수집과_정제_라벨링.pdf',
    pdfDataUrl: '/api/pdf/sample-3',
    fileSizeBytes: 289000,
    pageCount: 2,
    hasAnswerSheet: true,
    answerSheetText: '1. 텍스트 토큰화 및 이미지 정규화(0~1 스케일링)\n2. 바운딩 박스(Bounding Box) 라벨링\n3. 훈련용/검증용/테스트용 데이터 분할 비율(7:1.5:1.5)',
    showAnswerSheetToStudents: true,
    downloadCount: 29,
    viewCount: 94,
    createdAt: '2026-03-19T09:00:00.000Z',
    updatedAt: '2026-03-19T09:00:00.000Z',
    isImportant: true,
    orderIndex: 3,
  },
];

export const INITIAL_SETTINGS: ClassSettings = {
  schoolName: '전남여자고등학교',
  teacherName: '정보선생님',
  className: '2학년 2학기',
  subject: '인공지능 기초',
  announcement: '📢 학습지를 미리 확인하고 수업 전 필기도구와 함께 준비해주세요!',
  allowDirectDownload: true,
  themeColor: 'indigo',
  teacherPinHash: '5480!!',
};

// Seed initial data if database is empty, syncing from backend if available
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, sanitizeForFirestore(INITIAL_SETTINGS));

      // Seed initial worksheets only on fresh first-time installation
      const wsSnap = await getDocs(collection(db, WORKSHEETS_COLLECTION));
      if (wsSnap.empty) {
        let sourceWorksheets: Worksheet[] = INITIAL_SAMPLE_WORKSHEETS;
        try {
          const res = await fetch('/api/worksheets');
          const data = await res.json();
          if (data && data.success && Array.isArray(data.worksheets) && data.worksheets.length > 0) {
            sourceWorksheets = data.worksheets;
          }
        } catch {
          // use fallback sample
        }

        const batch = writeBatch(db);
        for (const ws of sourceWorksheets) {
          const ref = doc(db, WORKSHEETS_COLLECTION, ws.id);
          batch.set(ref, sanitizeForFirestore(ws));
        }
        await batch.commit();
      }
    }
  } catch (err) {
    console.warn('Firestore initial seeding error (safe ignore if offline):', err);
  }
}

// Real-time listener for worksheets
export function subscribeToWorksheets(callback: (worksheets: Worksheet[]) => void): () => void {
  try {
    const q = collection(db, WORKSHEETS_COLLECTION);
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Worksheet[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({ ...data, id: docSnap.id } as Worksheet);
        });
        const sorted = sortWorksheetsList(list);
        callback(sorted);
      },
      (error) => {
        console.error('Firestore worksheets listener error:', error);
      }
    );
  } catch (err) {
    console.error('Error attaching worksheets listener:', err);
    return () => {};
  }
}

// Real-time listener for class settings
export function subscribeToSettings(callback: (settings: ClassSettings) => void): () => void {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ ...INITIAL_SETTINGS, ...docSnap.data() } as ClassSettings);
        }
      },
      (error) => {
        console.error('Firestore settings listener error:', error);
      }
    );
  } catch (err) {
    console.error('Error attaching settings listener:', err);
    return () => {};
  }
}

// Add Worksheet to Firestore
export async function firestoreAddWorksheet(wsData: Partial<Worksheet>): Promise<{ success: boolean; id: string }> {
  const wsId = wsData.id || `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Strip massive base64 from Firestore doc to guarantee <1MB document size limit
  let safePdfUrl = wsData.pdfDataUrl || `/api/pdf/${wsId}`;
  if (safePdfUrl.startsWith('data:application/pdf;base64,')) {
    safePdfUrl = `/api/pdf/${wsId}`;
  }

  const newDoc: Worksheet = {
    id: wsId,
    unitId: wsData.unitId || `unit-${encodeURIComponent(wsData.unitTitle || '1단원')}`,
    unitTitle: (wsData.unitTitle || '1단원. 인공지능의 이해').trim(),
    lessonNumber: (wsData.lessonNumber || '').trim(),
    title: (wsData.title || '새 학습지').trim(),
    subject: wsData.subject || '인공지능 기초',
    grade: wsData.grade || '고등학교',
    date: wsData.date || now.split('T')[0],
    description: wsData.description || '',
    keyPoints: Array.isArray(wsData.keyPoints) ? wsData.keyPoints.filter(Boolean) : [],
    pdfFileName: wsData.pdfFileName || `${wsData.title || '학습지'}.pdf`,
    pdfDataUrl: safePdfUrl,
    fileSizeBytes: wsData.fileSizeBytes || 250000,
    pageCount: wsData.pageCount || 2,
    hasAnswerSheet: !!wsData.hasAnswerSheet,
    answerSheetPdfDataUrl: wsData.answerSheetPdfDataUrl || '',
    answerSheetText: wsData.answerSheetText || '',
    showAnswerSheetToStudents: wsData.showAnswerSheetToStudents ?? true,
    downloadCount: wsData.downloadCount || 0,
    viewCount: wsData.viewCount || 0,
    createdAt: wsData.createdAt || now,
    updatedAt: now,
    isImportant: !!wsData.isImportant,
    orderIndex: wsData.orderIndex || 999,
  };

  const docRef = doc(db, WORKSHEETS_COLLECTION, wsId);
  await setDoc(docRef, sanitizeForFirestore(newDoc));
  return { success: true, id: wsId };
}

// Update Worksheet in Firestore
export async function firestoreUpdateWorksheet(id: string, updates: Partial<Worksheet>): Promise<{ success: boolean }> {
  const docRef = doc(db, WORKSHEETS_COLLECTION, id);
  let safeUpdates = { ...updates };
  if (safeUpdates.pdfDataUrl && safeUpdates.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
    safeUpdates.pdfDataUrl = `/api/pdf/${id}`;
  }
  const dataToUpdate = sanitizeForFirestore({
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, dataToUpdate);
  return { success: true };
}

// Delete Worksheet in Firestore
export async function firestoreDeleteWorksheet(id: string): Promise<boolean> {
  const docRef = doc(db, WORKSHEETS_COLLECTION, id);
  await deleteDoc(docRef);
  return true;
}

// Batch Reorder Worksheets in Firestore
export async function firestoreReorderWorksheets(orderedList: Worksheet[]): Promise<boolean> {
  const batch = writeBatch(db);
  orderedList.forEach((ws, idx) => {
    const docRef = doc(db, WORKSHEETS_COLLECTION, ws.id);
    batch.update(docRef, {
      orderIndex: idx + 1,
      updatedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
  return true;
}

// Update Settings in Firestore
export async function firestoreUpdateSettings(newSettings: Partial<ClassSettings>, newPin?: string): Promise<boolean> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  const dataToUpdate: any = {
    ...newSettings,
  };
  if (newPin) {
    dataToUpdate.teacherPin = newPin;
  }
  await setDoc(docRef, sanitizeForFirestore(dataToUpdate), { merge: true });
  return true;
}

// Convert ArrayBuffer / Uint8Array / Blob to base64 safely in browser and node
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Save PDF binary permanently to Firestore in chunks (Cloud PDF Storage)
 * Overcomes 1MB document limit and guarantees persistence across server restarts
 */
export async function savePdfToCloudStorage(
  id: string,
  data: Blob | ArrayBuffer | Uint8Array,
  fileName?: string
): Promise<boolean> {
  try {
    const cleanId = id.replace(/^[\uFEFF\s]+/, '').trim();
    if (!cleanId) return false;

    let uint8: Uint8Array;
    if (data instanceof Uint8Array) {
      uint8 = data;
    } else if (data instanceof ArrayBuffer) {
      uint8 = new Uint8Array(data);
    } else if (data instanceof Blob) {
      const buffer = await data.arrayBuffer();
      uint8 = new Uint8Array(buffer);
    } else {
      return false;
    }

    if (uint8.length === 0) return false;

    const CHUNK_SIZE = 350 * 1024; // 350KB raw binary per chunk (~467KB base64)
    const totalChunks = Math.ceil(uint8.length / CHUNK_SIZE);
    const now = new Date().toISOString();

    // 1. Write metadata
    const metaRef = doc(db, PDF_STORAGE_COLLECTION, cleanId);
    await setDoc(metaRef, {
      id: cleanId,
      fileName: fileName || `${cleanId}.pdf`,
      totalChunks,
      fileSizeBytes: uint8.length,
      updatedAt: now,
    });

    // 2. Write chunks in parallel
    const chunkPromises: Promise<any>[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, uint8.length);
      const slice = uint8.subarray(start, end);
      const base64Data = uint8ArrayToBase64(slice);

      const chunkDocRef = doc(db, PDF_STORAGE_COLLECTION, cleanId, 'chunks', String(i));
      chunkPromises.push(
        setDoc(chunkDocRef, {
          index: i,
          data: base64Data,
        })
      );
    }

    await Promise.all(chunkPromises);
    return true;
  } catch (err) {
    console.error('Error saving PDF to Firestore cloud storage:', err);
    return false;
  }
}

/**
 * Retrieve PDF Blob from Firestore Cloud PDF Storage
 * Supports multi-candidate lookup (with/without .pdf, fileName, title, etc.)
 */
export async function getPdfFromCloudStorage(
  id: string,
  fallbackIdentifiers?: (string | undefined | null)[]
): Promise<Blob | null> {
  try {
    const candidates: string[] = [];
    const addCandidate = (str?: string | null) => {
      if (!str) return;
      const clean = str.replace(/^[\uFEFF\s]+/, '').trim();
      if (!clean) return;
      if (!candidates.includes(clean)) candidates.push(clean);
      if (!clean.endsWith('.pdf')) {
        const withPdf = `${clean}.pdf`;
        if (!candidates.includes(withPdf)) candidates.push(withPdf);
      } else {
        const withoutPdf = clean.replace(/\.pdf$/, '');
        if (!candidates.includes(withoutPdf)) candidates.push(withoutPdf);
      }
    };

    addCandidate(id);
    if (fallbackIdentifiers && Array.isArray(fallbackIdentifiers)) {
      fallbackIdentifiers.forEach(addCandidate);
    }

    // 1. Try candidates in order
    let targetDocId: string | null = null;
    for (const cand of candidates) {
      const metaRef = doc(db, PDF_STORAGE_COLLECTION, cand);
      const metaSnap = await getDoc(metaRef);
      if (metaSnap.exists()) {
        targetDocId = cand;
        break;
      }
    }

    // 2. If not found by direct lookup, scan pdf_storage collection
    if (!targetDocId) {
      try {
        const allPdfSnap = await getDocs(collection(db, PDF_STORAGE_COLLECTION));
        for (const d of allPdfSnap.docs) {
          const docId = d.id;
          const data = d.data();
          const storedFileName = (data.fileName || '').replace(/^[\uFEFF\s]+/, '').trim();

          for (const cand of candidates) {
            if (
              docId === cand ||
              docId.includes(cand) ||
              cand.includes(docId.replace(/\.pdf$/, '')) ||
              storedFileName === cand ||
              (storedFileName && cand && (storedFileName.includes(cand) || cand.includes(storedFileName)))
            ) {
              targetDocId = docId;
              break;
            }
          }
          if (targetDocId) break;
        }
      } catch (scanErr) {
        console.warn('Could not scan pdf_storage:', scanErr);
      }
    }

    if (!targetDocId) {
      return null;
    }

    const chunksColRef = collection(db, PDF_STORAGE_COLLECTION, targetDocId, 'chunks');
    const chunksSnap = await getDocs(chunksColRef);
    if (chunksSnap.empty) {
      return null;
    }

    const chunkList: { index: number; data: string }[] = [];
    chunksSnap.forEach((snap) => {
      chunkList.push(snap.data() as { index: number; data: string });
    });

    chunkList.sort((a, b) => a.index - b.index);

    // Decode all chunks into slices
    const byteArrays: Uint8Array[] = [];
    let totalLength = 0;

    for (const chunk of chunkList) {
      if (chunk.data) {
        const slice = base64ToUint8Array(chunk.data);
        byteArrays.push(slice);
        totalLength += slice.length;
      }
    }

    if (totalLength === 0) return null;

    // Concatenate into single buffer
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const slice of byteArrays) {
      merged.set(slice, offset);
      offset += slice.length;
    }

    return new Blob([merged.buffer], { type: 'application/pdf' });
  } catch (err) {
    console.error('Error fetching PDF from Firestore cloud storage:', err);
    return null;
  }
}

/**
 * Delete PDF from Firestore Cloud PDF Storage
 */
export async function deletePdfFromCloudStorage(id: string): Promise<boolean> {
  try {
    const cleanId = id.replace(/^[\uFEFF\s]+/, '').trim();
    if (!cleanId) return false;

    const chunksColRef = collection(db, PDF_STORAGE_COLLECTION, cleanId, 'chunks');
    const chunksSnap = await getDocs(chunksColRef);
    const batch = writeBatch(db);

    chunksSnap.forEach((snap) => {
      batch.delete(snap.ref);
    });
    batch.delete(doc(db, PDF_STORAGE_COLLECTION, cleanId));

    await batch.commit();
    return true;
  } catch (err) {
    console.warn('Could not delete PDF from Firestore cloud storage:', err);
    return false;
  }
}

