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
    }

    const wsSnap = await getDocs(collection(db, WORKSHEETS_COLLECTION));
    if (wsSnap.empty) {
      // First try to fetch whatever exists in the server backend
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
        if (!snapshot.empty) {
          const list: Worksheet[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({ ...data, id: docSnap.id } as Worksheet);
          });
          const sorted = sortWorksheetsList(list);
          callback(sorted);
        }
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

  const newDoc: Worksheet = {
    id: wsId,
    unitId: wsData.unitId || `unit-${encodeURIComponent(wsData.unitTitle || '1단원')}`,
    unitTitle: (wsData.unitTitle || '1단원. 인공지능의 이해').trim(),
    lessonNumber: (wsData.lessonNumber || '1차시').trim(),
    title: (wsData.title || '새 학습지').trim(),
    subject: wsData.subject || '인공지능 기초',
    grade: wsData.grade || '고등학교',
    date: wsData.date || now.split('T')[0],
    description: wsData.description || '',
    keyPoints: Array.isArray(wsData.keyPoints) ? wsData.keyPoints.filter(Boolean) : [],
    pdfFileName: wsData.pdfFileName || `${wsData.lessonNumber}_${wsData.title}.pdf`,
    pdfDataUrl: wsData.pdfDataUrl || `/api/pdf/${wsId}`,
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
  const dataToUpdate = sanitizeForFirestore({
    ...updates,
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
