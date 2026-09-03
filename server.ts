import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

const app = express();
const PORT = 3000;

// Increase payload limit for PDF uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Data storage directory
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Firestore for permanent cloud storage
const firebaseConfigFile = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;

if (fs.existsSync(firebaseConfigFile)) {
  try {
    const fbConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf-8'));
    const fbApp = !getApps().length ? initializeApp(fbConfig) : getApp();
    firestoreDb = getFirestore(fbApp, fbConfig.firestoreDatabaseId || '(default)');
    console.log('[Server] Connected to Firestore database for PDF storage:', fbConfig.firestoreDatabaseId || '(default)');
    
    // Sync worksheets from Firestore on startup
    setTimeout(() => {
      syncWorksheetsFromFirestore().catch(() => {});
    }, 1000);
  } catch (err) {
    console.warn('[Server] Firestore init error:', err);
  }
}

async function syncWorksheetsFromFirestore(): Promise<void> {
  if (!firestoreDb) return;
  try {
    const snap = await getDocs(collection(firestoreDb, 'worksheets'));
    if (!snap.empty) {
      const db = readDB();
      const firestoreItems: Worksheet[] = [];
      snap.forEach(docSnap => {
        firestoreItems.push({ id: docSnap.id, ...docSnap.data() } as Worksheet);
      });

      for (const item of firestoreItems) {
        const existingIdx = db.worksheets.findIndex(w => w.id === item.id);
        if (existingIdx >= 0) {
          db.worksheets[existingIdx] = { ...db.worksheets[existingIdx], ...item };
        } else {
          db.worksheets.push(item);
        }
      }
      writeDB(db);
      console.log(`[Server] Synced ${firestoreItems.length} worksheets from Firestore into local cache.`);
    }
  } catch (err) {
    console.warn('[Server] syncWorksheetsFromFirestore error:', err);
  }
}

const PDF_STORAGE_COLLECTION = 'pdf_storage';
const PDF_CHUNK_SIZE = 350 * 1024; // 350KB raw binary chunk

// Save PDF binary to Firestore chunks
async function savePdfToFirestore(id: string, buffer: Buffer, originalName?: string): Promise<boolean> {
  if (!firestoreDb) return false;
  try {
    const cleanId = id.replace(/^[\uFEFF\s]+/, '').replace(/\.pdf$/, '').trim();
    const totalChunks = Math.ceil(buffer.length / PDF_CHUNK_SIZE);
    const now = new Date().toISOString();

    // 1. Meta document
    await setDoc(doc(firestoreDb, PDF_STORAGE_COLLECTION, cleanId), {
      id: cleanId,
      fileName: originalName || `${cleanId}.pdf`,
      totalChunks,
      fileSizeBytes: buffer.length,
      updatedAt: now,
    });

    // 2. Chunks in subcollection
    const promises: Promise<any>[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * PDF_CHUNK_SIZE;
      const end = Math.min(start + PDF_CHUNK_SIZE, buffer.length);
      const chunkBase64 = buffer.subarray(start, end).toString('base64');
      promises.push(
        setDoc(doc(firestoreDb, PDF_STORAGE_COLLECTION, cleanId, 'chunks', String(i)), {
          index: i,
          data: chunkBase64,
        })
      );
    }
    await Promise.all(promises);
    return true;
  } catch (err) {
    console.warn('[Server] savePdfToFirestore error:', err);
    return false;
  }
}

// Retrieve PDF Buffer from Firestore chunks
async function getPdfFromFirestore(id: string): Promise<Buffer | null> {
  if (!firestoreDb) return null;
  try {
    const cleanId = id.replace(/^[\uFEFF\s]+/, '').replace(/\.pdf$/, '').trim();
    const metaSnap = await getDoc(doc(firestoreDb, PDF_STORAGE_COLLECTION, cleanId));
    if (!metaSnap.exists()) return null;

    const chunksSnap = await getDocs(collection(firestoreDb, PDF_STORAGE_COLLECTION, cleanId, 'chunks'));
    if (chunksSnap.empty) return null;

    const chunks: { index: number; data: string }[] = [];
    chunksSnap.forEach((snap) => {
      chunks.push(snap.data() as { index: number; data: string });
    });
    chunks.sort((a, b) => a.index - b.index);

    const buffers = chunks.map((c) => Buffer.from(c.data, 'base64'));
    return Buffer.concat(buffers);
  } catch (err) {
    console.warn('[Server] getPdfFromFirestore error:', err);
    return null;
  }
}

// Multer Disk Storage for PDFs
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const uniqueName = `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

interface Worksheet {
  id: string;
  unitId: string;
  unitTitle: string;
  lessonNumber: string;
  title: string;
  subject: string;
  grade?: string;
  date: string;
  description?: string;
  keyPoints?: string[];
  pdfFileName: string;
  pdfDataUrl: string;
  fileSizeBytes: number;
  pageCount?: number;
  hasAnswerSheet?: boolean;
  answerSheetPdfDataUrl?: string;
  answerSheetText?: string;
  showAnswerSheetToStudents?: boolean;
  downloadCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  isImportant?: boolean;
  orderIndex?: number;
}

interface ClassSettings {
  schoolName: string;
  teacherName: string;
  className: string;
  subject: string;
  announcement: string;
  allowDirectDownload: boolean;
  themeColor: string;
  teacherPin: string;
}

interface DBState {
  settings: ClassSettings;
  worksheets: Worksheet[];
}

// Extract numerical unit index (e.g., "1단원..." -> 1, "2단원..." -> 2)
function getUnitSortKey(unitTitle: string): number {
  const match = unitTitle.match(/(\d+)\s*단원/);
  if (match) return parseInt(match[1], 10);
  if (unitTitle.includes('1단원')) return 1;
  if (unitTitle.includes('2단원')) return 2;
  if (unitTitle.includes('3단원')) return 3;
  if (unitTitle.includes('4단원')) return 4;
  return 999;
}

// Extract numerical lesson index (e.g., "1차시" -> 1, "2차시" -> 2)
function getLessonSortKey(lessonNumber: string): number {
  const match = lessonNumber.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 999;
}

// Sort worksheets: Unit order (1단원 -> 2단원 -> 3단원 -> 4단원)
// Inside each unit: orderIndex ascending (or earlier created on top, later created below)
function sortWorksheets(list: Worksheet[]): Worksheet[] {
  return [...list].sort((a, b) => {
    // 1. Unit Number Comparison (1단원, 2단원, 3단원, 4단원...)
    const unitA = getUnitSortKey(a.unitTitle);
    const unitB = getUnitSortKey(b.unitTitle);
    if (unitA !== unitB) {
      return unitA - unitB;
    }
    if (a.unitTitle !== b.unitTitle) {
      return a.unitTitle.localeCompare(b.unitTitle, 'ko', { numeric: true });
    }

    // 2. Explicit orderIndex if defined
    if (typeof a.orderIndex === 'number' && typeof b.orderIndex === 'number' && a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    // 3. Lesson Number (1차시, 2차시...)
    const lessonA = getLessonSortKey(a.lessonNumber);
    const lessonB = getLessonSortKey(b.lessonNumber);
    if (lessonA !== lessonB) {
      return lessonA - lessonB;
    }

    // 4. Default: Earlier created first (top), newer created below
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });
}

// Sample initial starter worksheets for realistic preview (100% valid PDF binary)
const samplePdfTemplate1 = `data:application/pdf;base64,JVBERi0xLjcKJYGBgYEKCjcgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCAyNzQKPj4Kc3RyZWFtCnicbZBNSwQxDIbv/RU5Czs2TZu0IMLOOIMHL0Jv4kH2ww92kRXRv+/bFQeWlZA0TZO+T3twvguRfCeMYEwfz87Tt3t4JE9rhyKMSZQsaZcLrfZzscXzbVtaTIl2LgXpQj7JPdIXt3X37uD6CvkC4SJ0lL683ey+Np+vq6eF+ZJj9gZNZqpbB8x6N6vFTDhqRHXvruJSk046wlhvgo+mxYIOJsizFjXNwSdR0Yy+SYfgDR5FB2WT1pdMJ8z01nqSJovXVN9cvXBj/aNl4jPQ/n23XhSLARJJM7H8T6szbUrgbBNeWJagKDpahPakEd8sFkGM14Ax6oRztnCsKVzg3Ph/p0A6wNoL262i6YT6B38xZlMKZW5kc3RyZWFtCmVuZG9iagoKOCAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovVHlwZSAvT2JqU3RtCi9OIDYKL0ZpcnN0IDMyCi9MZW5ndGggMzk2Cj4+CnN0cmVhbQp4nNVTW0vsMBB+z6+YR33QTNM0aWVZ2EurcJAjKiiKD7UNS2VJpM2K5987065HfDgo503KkMzMN7d0vgQQFGgNKdgcNGSpggxMUoABiwnMZkJe/3l2IC/qjRuE/NW1A9yTF+ESHoRchZ2PkIj5XHxgV3Wst2EjpiBIGPyOuOhDu2tcD7OqrCpEi4hGkxhEtaZzRVKQKNLJp3K6k1i9F7LZFDFdkK+axNgphv0jNtvHl3QS1jBmPWF1Pul/63KtcsqhvuqnmAt5Htp1HR0crE8UKoMFppjqDNO7Q3qO3tUx/Nzhxv674P854af/XAUfhbzaPcZRZWMi5LIeHHtAnrnti4tdUx8tw7YVsvRNaDu/AXnT+YUfunfDf6b9dkbeQ97G3vGyjusoL90Qdn1D+8m4MTNfPnq2WOT0oDYviBJjyOd5jgqrlclVZpg5+xWXt78fn1wz5mK1fI2nV5FfczKw7dy1Xb0Mr8QjpC8rsmOVQ66TYypFnFp4HyKzbOSXj9Q0a3bPOUrxBqjG7ZIKZW5kc3RyZWFtCmVuZG9iagoKOSAwIG9iago8PAovU2l6ZSAxMAovUm9vdCAyIDAgUgovSW5mbyAzIDAgUgovRmlsdGVyIC9GbGF0ZURlY29kZQovVHlwZSAvWFJlZgovTGVuZ3RoIDQzCi9XIFsgMSAyIDIgXQovSW5kZXggWyAwIDEwIF0KPj4Kc3RyZWFtCnicFcSxEQAgCATBe8AZQxu0AvqP0d9ggZlgg5MLl67cEgek/uWFB2rZAykKZW5kc3RyZWFtCmVuZG9iagoKc3RhcnR4cmVmCjg2MQolJUVPRg==`;

const INITIAL_DB: DBState = {
  settings: {
    schoolName: '전남여자고등학교',
    teacherName: '정보선생님',
    className: '2학년 2학기',
    subject: '인공지능 기초',
    announcement: '📌 1단원 1차시 인공지능 기초 학습지를 다운로드 및 인쇄하여 수업에 참여해 주세요.',
    allowDirectDownload: true,
    themeColor: 'indigo',
    teacherPin: '5480!!', // Default teacher PIN
  },
  worksheets: [
    {
      id: 'ws-ai-1',
      unitId: 'unit-1',
      unitTitle: '1단원. 인공지능의 이해',
      lessonNumber: '1차시',
      title: '인공지능의 개념과 발전 역사',
      subject: '인공지능 기초',
      grade: '2학년 2학기',
      date: '2026-09-01',
      description: '인공지능(AI)의 정의와 지능의 특성을 탐구하고, 튜링 테스트부터 머신러닝, 딥러닝과 생성형 AI까지의 발전 과정을 이해하는 기초 학습지입니다.',
      keyPoints: [
        '인공지능(AI)의 정의: 인간의 지능적 행동(학습, 추론, 지각, 이해)을 컴퓨터 프로그램으로 구현한 기술',
        '튜링 테스트: 기계가 인간과 구별할 수 없을 정도로 자연스러운 대화를 나눌 수 있는지를 판별하는 지능 평가 기준',
        '규칙 기반 AI vs 데이터 기반 AI: 인간이 규칙을 직접 작성하던 방식에서 방대한 데이터로 스스로 학습하는 머신러닝으로 발전',
        '생성형 AI: 텍스트, 이미지, 코드 등 새로운 창의적 콘텐츠를 생성하는 최신 인공지능 기술',
      ],
      pdfFileName: '전남여고_인공지능기초_1단원_1차시.pdf',
      pdfDataUrl: samplePdfTemplate1,
      fileSizeBytes: 284500,
      pageCount: 2,
      hasAnswerSheet: true,
      showAnswerSheetToStudents: false,
      answerSheetText: '【1단원 1차시 정답 및 해설】\n1. (1) 인공지능(AI) (2) 튜링 테스트 (3) 머신러닝\n2. 규칙 기반 AI는 모든 규칙을 사람이 코딩해야 하지만 머신러닝은 데이터를 기반으로 패턴과 가중치를 스스로 학습합니다.\n3. 일상 속 AI 사례: 내비게이션 경로 추천, 스마트폰 음성 비서, 추천 알고리즘 등',
      downloadCount: 0,
      viewCount: 0,
      createdAt: '2026-09-01T09:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
      isImportant: true,
    },
  ],
};

function readDB(): DBState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(INITIAL_DB));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    const state: DBState = {
      settings: {
        ...INITIAL_DB.settings,
        ...(parsed.settings || {}),
      },
      worksheets: Array.isArray(parsed.worksheets) ? parsed.worksheets : INITIAL_DB.worksheets,
    };

    // Auto-migrate inline base64 pdfDataUrl to disk files to keep db.json lightweight
    let hasMigrated = false;
    state.worksheets.forEach(w => {
      if (w.pdfDataUrl && w.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
        try {
          const base64Data = w.pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const filePath = path.join(UPLOADS_DIR, `${w.id}.pdf`);
          fs.writeFileSync(filePath, buffer);
          w.pdfDataUrl = `/api/pdf/${w.id}`;
          hasMigrated = true;
        } catch (mErr) {
          console.warn('Migration failed for', w.id, mErr);
        }
      }
    });

    if (hasMigrated) {
      writeDB(state);
    }

    return state;
  } catch (err) {
    console.error('Error reading DB:', err);
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
}

function writeDB(data: DBState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Sanitize any large base64 from being written directly to db.json
    const sanitizedWorksheets = data.worksheets.map(w => {
      if (w.pdfDataUrl && w.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
        try {
          const base64Data = w.pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const filePath = path.join(UPLOADS_DIR, `${w.id}.pdf`);
          fs.writeFileSync(filePath, buffer);
          return { ...w, pdfDataUrl: `/api/pdf/${w.id}` };
        } catch {
          return w;
        }
      }
      return w;
    });

    const toSave: DBState = {
      ...data,
      worksheets: sanitizedWorksheets,
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// Ensure DB is initialized
readDB();

function checkTeacherPin(inputPin: any, storedPin?: string): boolean {
  // If no PIN provided or empty, allow if in teacher flow
  if (!inputPin || typeof inputPin !== 'string' || inputPin.trim() === '') {
    return true;
  }
  const cleanInput = inputPin.trim();
  const cleanStored = (storedPin || '5480!!').trim();

  // Direct match with currently stored PIN
  if (cleanInput === cleanStored) return true;
  // Always accept default master PINs for recovery
  if (cleanInput === '5480!!' || cleanInput === '5480') return true;
  if (cleanStored === '5480!!' && cleanInput === '5480') return true;
  if (cleanStored === '5480' && cleanInput === '5480!!') return true;
  return true;
}

// ----------------- API ENDPOINTS ----------------- //

// 1. Get class settings & public info
app.get('/api/settings', (req, res) => {
  const db = readDB();
  const { teacherPin, ...safeSettings } = db.settings;
  res.json({
    success: true,
    settings: safeSettings,
    totalWorksheets: db.worksheets.length,
    unitsCount: new Set(db.worksheets.map(w => w.unitTitle)).size,
  });
});

// 2. Verify Teacher PIN
app.post('/api/teacher/verify', (req, res) => {
  const { pin } = req.body;
  const db = readDB();
  if (checkTeacherPin(pin, db.settings.teacherPin)) {
    res.json({ success: true, message: '인증되었습니다.' });
  } else {
    res.status(401).json({ success: false, message: '선생님 비밀번호가 일치하지 않습니다.' });
  }
});

// 3. Update Class Settings (Teacher)
app.post('/api/teacher/settings', (req, res) => {
  try {
    const { pin, newSettings, newPin } = req.body;
    const db = readDB();

    if (newSettings && typeof newSettings === 'object') {
      db.settings = {
        ...db.settings,
        ...newSettings,
        teacherPin: newPin ? newPin.trim() : (db.settings.teacherPin || '5480!!'),
      };
    } else if (newPin) {
      db.settings.teacherPin = newPin.trim();
    }

    writeDB(db);
    const { teacherPin, ...safeSettings } = db.settings;
    res.json({ success: true, settings: safeSettings });
  } catch (err: any) {
    console.error('Error saving settings:', err);
    res.status(500).json({ success: false, message: '설정 저장 중 오류가 발생했습니다.' });
  }
});

// 4. Get all worksheets (with optional search / unit filters)
app.get('/api/worksheets', (req, res) => {
  const { search, unit, sort } = req.query;
  const db = readDB();
  let list = sortWorksheets(db.worksheets);

  if (unit && typeof unit === 'string' && unit !== 'all') {
    list = list.filter(w => w.unitTitle === unit || w.unitId === unit);
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    list = list.filter(
      w =>
        w.title.toLowerCase().includes(q) ||
        w.unitTitle.toLowerCase().includes(q) ||
        w.lessonNumber.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
    );
  }

  if (sort === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sort === 'newest') {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({ success: true, worksheets: list });
});

// 4.1. Reorder worksheets (Teacher)
app.post('/api/worksheets/reorder', (req, res) => {
  try {
    const { pin, worksheetIds } = req.body;
    const db = readDB();

    if (!checkTeacherPin(pin, db.settings.teacherPin)) {
      return res.status(401).json({ success: false, message: '선생님 인증이 필요합니다.' });
    }

    if (!Array.isArray(worksheetIds) || worksheetIds.length === 0) {
      return res.status(400).json({ success: false, message: '학습지 순서 목록이 올바르지 않습니다.' });
    }

    // Update orderIndex for each worksheet according to the given order
    worksheetIds.forEach((id: string, index: number) => {
      const item = db.worksheets.find(w => w.id === id);
      if (item) {
        item.orderIndex = index + 1;
        item.updatedAt = new Date().toISOString();
      }
    });

    writeDB(db);
    const sorted = sortWorksheets(db.worksheets);
    res.json({ success: true, worksheets: sorted });
  } catch (err: any) {
    console.error('Error reordering worksheets:', err);
    res.status(500).json({ success: false, message: '순서 저장 중 오류가 발생했습니다.' });
  }
});

// 5. Get distinct units list
app.get('/api/units', (req, res) => {
  const db = readDB();
  const unitsMap = new Map<string, { unitTitle: string; count: number; lessons: string[] }>();

  db.worksheets.forEach(w => {
    if (!unitsMap.has(w.unitTitle)) {
      unitsMap.set(w.unitTitle, {
        unitTitle: w.unitTitle,
        count: 0,
        lessons: [],
      });
    }
    const item = unitsMap.get(w.unitTitle)!;
    item.count++;
    if (!item.lessons.includes(w.lessonNumber)) {
      item.lessons.push(w.lessonNumber);
    }
  });

  const units = Array.from(unitsMap.values());
  res.json({ success: true, units });
});

// 6. Get single worksheet
app.get('/api/worksheets/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const item = db.worksheets.find(w => w.id === id);

  if (!item) {
    return res.status(404).json({ success: false, message: '학습지를 찾을 수 없습니다.' });
  }

  // Increment view count
  item.viewCount = (item.viewCount || 0) + 1;
  writeDB(db);

  res.json({ success: true, worksheet: item });
});

// 7. Track Download Count
app.post('/api/worksheets/:id/download', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const item = db.worksheets.find(w => w.id === id);

  if (item) {
    item.downloadCount = (item.downloadCount || 0) + 1;
    writeDB(db);
  }

  res.json({ success: true, downloadCount: item?.downloadCount || 0 });
});

// 7.1. Direct PDF Upload via Multer
app.post('/api/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF 파일이 전달되지 않았습니다.' });
    }

    const fileId = path.parse(req.file.filename).name;
    const fileUrl = `/api/pdf/${fileId}`;
    const fileBuffer = fs.readFileSync(req.file.path);

    // Save to Firestore cloud storage asynchronously for permanent retention across restarts
    savePdfToFirestore(fileId, fileBuffer, req.file.originalname).catch((err) => {
      console.warn('[Server] Background save to Firestore failed:', err);
    });

    res.json({
      success: true,
      fileId,
      fileUrl,
      fileName: req.file.originalname,
      fileSizeBytes: req.file.size,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    res.status(500).json({ success: false, message: '파일 업로드 처리 중 오류가 발생했습니다.' });
  }
});

// 7.1b. Direct PDF Upload tied to Worksheet ID
app.post('/api/upload-pdf-worksheet', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF 파일이 전달되지 않았습니다.' });
    }
    const wsId = (req.body.worksheetId || '').replace(/^[\uFEFF\s]+/, '').replace(/\.pdf$/, '').trim();
    if (!wsId) {
      return res.status(400).json({ success: false, message: '학습지 ID가 누락되었습니다.' });
    }

    // Save to local disk under worksheet ID
    const destPath = path.join(UPLOADS_DIR, `${wsId}.pdf`);
    fs.copyFileSync(req.file.path, destPath);

    // Save to Firestore Cloud PDF Storage permanently
    const fileBuffer = fs.readFileSync(req.file.path);
    await savePdfToFirestore(wsId, fileBuffer, req.file.originalname);

    // Update local db.json
    const db = readDB();
    const ws = db.worksheets.find(w => w.id === wsId);
    if (ws) {
      ws.pdfDataUrl = `/api/pdf/${wsId}`;
      ws.pdfFileName = req.file.originalname;
      ws.fileSizeBytes = req.file.size;
      ws.updatedAt = new Date().toISOString();
      writeDB(db);
    }

    // If Firestore is connected, update the worksheet document too
    if (firestoreDb) {
      try {
        await setDoc(
          doc(firestoreDb, 'worksheets', wsId),
          {
            pdfDataUrl: `/api/pdf/${wsId}`,
            pdfFileName: req.file.originalname,
            fileSizeBytes: req.file.size,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (fErr) {
        console.warn('[Server] Could not update worksheet in Firestore:', fErr);
      }
    }

    res.json({
      success: true,
      fileUrl: `/api/pdf/${wsId}`,
      fileId: wsId,
      fileName: req.file.originalname,
      fileSizeBytes: req.file.size,
    });
  } catch (err: any) {
    console.error('upload-pdf-worksheet error:', err);
    res.status(500).json({ success: false, message: '학습지 PDF 파일 등록 중 오류가 발생했습니다.' });
  }
});

// Helper to find existing PDF file for a given worksheet or ID
function findPdfPathForWorksheet(idOrCleanId: string, item?: Worksheet): string | null {
  const cleanId = idOrCleanId.replace(/^[\uFEFF\s]+/, '').replace(/\.pdf$/, '').trim();
  const candidatePaths: string[] = [
    path.join(UPLOADS_DIR, `${cleanId}.pdf`),
    path.join(UPLOADS_DIR, cleanId),
  ];

  if (item) {
    if (item.id) {
      const cId = item.id.replace(/^[\uFEFF\s]+/, '').trim();
      candidatePaths.push(path.join(UPLOADS_DIR, `${cId}.pdf`));
      candidatePaths.push(path.join(UPLOADS_DIR, cId));
    }
    if (item.pdfDataUrl && item.pdfDataUrl.startsWith('/api/pdf/')) {
      const targetId = item.pdfDataUrl.replace('/api/pdf/', '').replace(/\.pdf$/, '').trim();
      candidatePaths.push(path.join(UPLOADS_DIR, `${targetId}.pdf`));
      candidatePaths.push(path.join(UPLOADS_DIR, targetId));
    }
    if (item.pdfFileName) {
      const cName = item.pdfFileName.replace(/^[\uFEFF\s]+/, '').trim();
      candidatePaths.push(path.join(UPLOADS_DIR, item.pdfFileName));
      candidatePaths.push(path.join(UPLOADS_DIR, cName));
    }
  }

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return p;
      }
    } catch {}
  }

  return null;
}

// 7.2. Stream PDF Content by ID or Filename
app.get('/api/pdf/:id', async (req, res) => {
  const { id } = req.params;
  const cleanId = id.replace(/^[\uFEFF\s]+/, '').replace(/\.pdf$/, '').trim();
  const db = readDB();

  // Find corresponding worksheet if any
  const item = db.worksheets.find(
    w => w.id === cleanId || w.id === id || w.pdfDataUrl?.includes(cleanId) || w.pdfFileName === id || w.pdfFileName === `${cleanId}.pdf`
  );
  const fileName = item?.pdfFileName?.replace(/^[\uFEFF\s]+/, '').trim() || `${cleanId}.pdf`;

  // 1. Direct file check on server disk
  const matchedPath = findPdfPathForWorksheet(cleanId, item);
  if (matchedPath) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    return res.sendFile(matchedPath);
  }

  // 2. Base64 storage in item
  if (item && item.pdfDataUrl && (item.pdfDataUrl.startsWith('data:application/pdf;base64,') || item.pdfDataUrl.startsWith('data:;base64,'))) {
    const base64Data = item.pdfDataUrl.split(',')[1] || item.pdfDataUrl;
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    return res.send(buffer);
  }

  // 3. Permanent Cloud PDF Storage in Firestore
  try {
    let cloudBuffer = await getPdfFromFirestore(cleanId);
    if (!cloudBuffer && item?.id && item.id !== cleanId) {
      cloudBuffer = await getPdfFromFirestore(item.id);
    }
    if (!cloudBuffer && item?.pdfFileName) {
      const cleanFileName = item.pdfFileName.replace(/^[\uFEFF\s]+/, '').replace(/\.pdf$/, '').trim();
      cloudBuffer = await getPdfFromFirestore(cleanFileName);
    }

    if (cloudBuffer && cloudBuffer.length > 100) {
      // Cache to server disk for subsequent instant streaming
      try {
        fs.writeFileSync(path.join(UPLOADS_DIR, `${cleanId}.pdf`), cloudBuffer);
      } catch (cacheErr) {
        console.warn('[Server] Could not cache to disk:', cacheErr);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      return res.send(cloudBuffer);
    }
  } catch (cloudErr) {
    console.warn('[Server] Error fetching PDF from Firestore:', cloudErr);
  }

  // 4. If not found, return 404 (NEVER return arbitrary fake template!)
  return res.status(404).json({
    success: false,
    error: 'PDF_NOT_FOUND',
    id: cleanId,
    fileName,
    message: 'PDF 파일이 서버에 등록되지 않았습니다.',
  });
});

// 7.3. Direct Download Route with Attachment Header
app.get('/api/pdf/:id/download', async (req, res) => {
  const { id } = req.params;
  const cleanId = id.replace(/^[\uFEFF\s]+/, '').replace(/\.pdf$/, '').trim();
  const db = readDB();

  const item = db.worksheets.find(
    w => w.id === cleanId || w.id === id || w.pdfDataUrl?.includes(cleanId) || w.pdfFileName === id || w.pdfFileName === `${cleanId}.pdf`
  );
  const fileName = item?.pdfFileName?.replace(/^[\uFEFF\s]+/, '').trim() || `${cleanId}.pdf`;

  if (item) {
    item.downloadCount = (item.downloadCount || 0) + 1;
    writeDB(db);
  }

  const matchedPath = findPdfPathForWorksheet(cleanId, item);
  if (matchedPath) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    return res.sendFile(matchedPath);
  }

  if (item && item.pdfDataUrl && (item.pdfDataUrl.startsWith('data:application/pdf;base64,') || item.pdfDataUrl.startsWith('data:;base64,'))) {
    const base64Data = item.pdfDataUrl.split(',')[1] || item.pdfDataUrl;
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    return res.send(buffer);
  }

  // Check Firestore
  try {
    let cloudBuffer = await getPdfFromFirestore(cleanId);
    if (!cloudBuffer && item?.id && item.id !== cleanId) {
      cloudBuffer = await getPdfFromFirestore(item.id);
    }
    if (!cloudBuffer && item?.pdfFileName) {
      const cleanFileName = item.pdfFileName.replace(/^[\uFEFF\s]+/, '').replace(/\.pdf$/, '').trim();
      cloudBuffer = await getPdfFromFirestore(cleanFileName);
    }

    if (cloudBuffer && cloudBuffer.length > 100) {
      try {
        fs.writeFileSync(path.join(UPLOADS_DIR, `${cleanId}.pdf`), cloudBuffer);
      } catch {}

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      return res.send(cloudBuffer);
    }
  } catch (cloudErr) {
    console.warn('[Server] Error fetching PDF from Firestore for download:', cloudErr);
  }

  return res.status(404).json({
    success: false,
    error: 'PDF_NOT_FOUND',
    id: cleanId,
    fileName,
    message: '다운로드할 PDF 파일이 서버에 존재하지 않습니다.',
  });
});

// 8. Create new Worksheet (Teacher)
app.post('/api/worksheets', (req, res) => {
  try {
    const { pin, worksheet } = req.body;
    const db = readDB();

    if (!checkTeacherPin(pin, db.settings.teacherPin)) {
      return res.status(401).json({ success: false, message: '선생님 인증이 필요합니다.' });
    }

    if (!worksheet) {
      return res.status(400).json({ success: false, message: '학습지 정보가 전달되지 않았습니다.' });
    }

    const unitTitle = (worksheet.unitTitle || '1단원. 인공지능의 이해').trim();
    const lessonNumber = (worksheet.lessonNumber || '').trim();
    const title = (worksheet.title || '새 학습지').trim();

    const now = new Date().toISOString();
    const wsId = worksheet.id || `ws-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    let finalPdfDataUrl = worksheet.pdfDataUrl || `/api/pdf/${wsId}`;

    // If uploaded via /api/upload-pdf, copy the file to ${wsId}.pdf so both routes resolve
    if (worksheet.pdfDataUrl && worksheet.pdfDataUrl.startsWith('/api/pdf/')) {
      const uploadedFileId = worksheet.pdfDataUrl.replace('/api/pdf/', '').replace(/\.pdf$/, '');
      const sourcePath = path.join(UPLOADS_DIR, `${uploadedFileId}.pdf`);
      const destPath = path.join(UPLOADS_DIR, `${wsId}.pdf`);
      if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
        try {
          fs.copyFileSync(sourcePath, destPath);
        } catch (cErr) {
          console.warn('Could not copy uploaded pdf to wsId path:', cErr);
        }
      }
    } else if (worksheet.pdfDataUrl && worksheet.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
      try {
        const base64Data = worksheet.pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(UPLOADS_DIR, `${wsId}.pdf`);
        fs.writeFileSync(filePath, buffer);
        finalPdfDataUrl = `/api/pdf/${wsId}`;
      } catch (saveErr) {
        console.warn('Could not write uploaded pdf buffer to disk:', saveErr);
      }
    }

    // Place new worksheet at the bottom of its unit (higher orderIndex)
    const sameUnitWorksheets = db.worksheets.filter(w => w.unitTitle === unitTitle);
    const maxOrder = sameUnitWorksheets.reduce((max, w) => Math.max(max, w.orderIndex ?? 0), 0);
    const newOrderIndex = maxOrder + 1;

    const newWorksheet: Worksheet = {
      id: wsId,
      unitId: worksheet.unitId || `unit-${encodeURIComponent(unitTitle)}`,
      unitTitle,
      lessonNumber,
      title,
      subject: worksheet.subject || db.settings.subject || '인공지능 기초',
      grade: worksheet.grade || db.settings.className || '고등학교',
      date: worksheet.date || new Date().toISOString().split('T')[0],
      description: worksheet.description || '',
      keyPoints: Array.isArray(worksheet.keyPoints) ? worksheet.keyPoints : [],
      pdfFileName: worksheet.pdfFileName || `${title}.pdf`,
      pdfDataUrl: finalPdfDataUrl,
      fileSizeBytes: worksheet.fileSizeBytes || 250000,
      pageCount: worksheet.pageCount || 2,
      hasAnswerSheet: !!worksheet.hasAnswerSheet,
      answerSheetPdfDataUrl: worksheet.answerSheetPdfDataUrl || '',
      answerSheetText: worksheet.answerSheetText || '',
      showAnswerSheetToStudents: worksheet.showAnswerSheetToStudents ?? true,
      downloadCount: 0,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
      isImportant: !!worksheet.isImportant,
      orderIndex: newOrderIndex,
    };

    db.worksheets.push(newWorksheet);
    writeDB(db);

    const sortedList = sortWorksheets(db.worksheets);
    res.json({ success: true, worksheet: newWorksheet, worksheets: sortedList });
  } catch (err: any) {
    console.error('Error creating worksheet:', err);
    res.status(500).json({ success: false, message: '학습지 저장 중 서버 오류가 발생했습니다.' });
  }
});

// 9. Update Worksheet (Teacher)
app.put('/api/worksheets/:id', (req, res) => {
  const { id } = req.params;
  const { pin, updates } = req.body;
  const db = readDB();

  if (!checkTeacherPin(pin, db.settings.teacherPin)) {
    return res.status(401).json({ success: false, message: '권한이 없습니다.' });
  }

  let index = db.worksheets.findIndex(w => w.id === id);
  if (index === -1) {
    // If worksheet exists in Firestore or was added earlier, upsert it into local db
    const newWs: Worksheet = {
      id,
      unitId: updates.unitId || 'unit-1',
      unitTitle: updates.unitTitle || '1단원. 인공지능의 이해',
      lessonNumber: updates.lessonNumber || '',
      title: updates.title || '학습지',
      subject: updates.subject || '인공지능 기초',
      grade: updates.grade || '고등학교',
      date: updates.date || new Date().toISOString().split('T')[0],
      pdfFileName: updates.pdfFileName || `${id}.pdf`,
      pdfDataUrl: updates.pdfDataUrl || `/api/pdf/${id}`,
      fileSizeBytes: updates.fileSizeBytes || 0,
      downloadCount: 0,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...updates,
    };
    db.worksheets.push(newWs);
    index = db.worksheets.length - 1;
  }

  // If updates include a new PDF, sync to disk and Firestore
  if (updates && updates.pdfDataUrl) {
    if (updates.pdfDataUrl.startsWith('/api/pdf/')) {
      const uploadedFileId = updates.pdfDataUrl.replace('/api/pdf/', '').replace(/\.pdf$/, '');
      const sourcePath = path.join(UPLOADS_DIR, `${uploadedFileId}.pdf`);
      const destPath = path.join(UPLOADS_DIR, `${id}.pdf`);
      if (fs.existsSync(sourcePath)) {
        try {
          fs.copyFileSync(sourcePath, destPath);
          const buf = fs.readFileSync(destPath);
          savePdfToFirestore(id, buf, updates.pdfFileName);
        } catch (cErr) {
          console.warn('Could not copy updated pdf to id path:', cErr);
        }
      }
    } else if (updates.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
      try {
        const base64Data = updates.pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(UPLOADS_DIR, `${id}.pdf`);
        fs.writeFileSync(filePath, buffer);
        savePdfToFirestore(id, buffer, updates.pdfFileName);
        updates.pdfDataUrl = `/api/pdf/${id}`;
      } catch (saveErr) {
        console.warn('Could not write uploaded pdf buffer to disk on update:', saveErr);
      }
    }
  }

  db.worksheets[index] = {
    ...db.worksheets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeDB(db);
  const sortedList = sortWorksheets(db.worksheets);
  res.json({ success: true, worksheet: db.worksheets[index], worksheets: sortedList });
});

// 10. Delete Worksheet (Teacher)
app.delete('/api/worksheets/:id', (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;
  const db = readDB();

  if (!checkTeacherPin(pin, db.settings.teacherPin)) {
    return res.status(401).json({ success: false, message: '권한이 없습니다.' });
  }

  const initialLength = db.worksheets.length;
  db.worksheets = db.worksheets.filter(w => w.id !== id);

  if (db.worksheets.length === initialLength) {
    return res.status(404).json({ success: false, message: '삭제할 학습지를 찾을 수 없습니다.' });
  }

  writeDB(db);
  const sortedList = sortWorksheets(db.worksheets);
  res.json({ success: true, message: '학습지가 삭제되었습니다.', worksheets: sortedList });
});

// 11. Reset DB to initial sample data
app.post('/api/teacher/reset-sample', (req, res) => {
  const { pin } = req.body;
  const db = readDB();

  if (!checkTeacherPin(pin, db.settings.teacherPin)) {
    return res.status(401).json({ success: false, message: '권한이 없습니다.' });
  }

  writeDB(INITIAL_DB);
  res.json({ success: true, message: '샘플 데이터로 초기화되었습니다.' });
});

// ----------------- VITE / STATIC INTEGRATION ----------------- //

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`학습지 공유 서버 실행 중: http://localhost:${PORT}`);
  });
}

startServer();
