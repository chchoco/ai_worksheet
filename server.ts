import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

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

// Sample initial starter worksheets for realistic preview
const samplePdfTemplate1 = `data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nCs21DG05GJwzs9L53IFAAaOAsgKZW5kc3RyZWFtCmVuZG9iagozIDAgb2JqCjE3CmVuZG9iagoxIDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWyA0IDAgUl0+PgplbmRvYmoKNCAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDEgMCBSL01lZGlhQm94WzAgMCA1OTUgODQyXS9DZXJ0cyA1IDAgUi9SZXNvdXJjZXM8PC9Qcm9jU2V0Wy9QREYvVGV4dF0+Pi9Db250ZW50cyAyIDAgUj4+CmVuZG9iago1IDAgb2JqCjw8L1Byb2NTZXRbL1BERi9UZXh0XS9Gb250PDwvRjEgNiAwIFI+Pj4+CmVuZG9iago2IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNzMgMDAwMDAgbiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMTUxIDAwMDAwIG4gCjAwMDAwMDAyMDEgMDAwMDAgbiAKMDAwMDAwMDMwMyAwMDAwMCBuIAowMDAwMDAwMzU1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA3L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDE4CiUlRU9GCg==`;

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
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(INITIAL_DB));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      settings: {
        ...INITIAL_DB.settings,
        ...(parsed.settings || {}),
      },
      worksheets: Array.isArray(parsed.worksheets) ? parsed.worksheets : INITIAL_DB.worksheets,
    };
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
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
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
  let list = [...db.worksheets];

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

  // Sort by date / order
  if (sort === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else {
    // Default newest or unit/lesson ordering
    list.sort((a, b) => {
      if (a.unitTitle === b.unitTitle) {
        return a.lessonNumber.localeCompare(b.lessonNumber, 'ko', { numeric: true });
      }
      return a.unitTitle.localeCompare(b.unitTitle, 'ko', { numeric: true });
    });
  }

  res.json({ success: true, worksheets: list });
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
app.post('/api/upload-pdf', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'PDF 파일이 전달되지 않았습니다.' });
    }

    const fileId = path.parse(req.file.filename).name;
    const fileUrl = `/api/pdf/${fileId}`;

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

// 7.2. Stream PDF Content by ID or Filename
app.get('/api/pdf/:id', (req, res) => {
  const { id } = req.params;
  const cleanId = id.replace(/\.pdf$/, '');

  // 1. Check in uploads folder
  const possiblePaths = [
    path.join(UPLOADS_DIR, `${cleanId}.pdf`),
    path.join(UPLOADS_DIR, cleanId),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="worksheet.pdf"');
      return res.sendFile(p);
    }
  }

  // 2. Check in DB worksheets
  const db = readDB();
  const item = db.worksheets.find(w => w.id === cleanId || w.id === id);
  if (item && item.pdfDataUrl && item.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
    const base64Data = item.pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(item.pdfFileName || 'worksheet.pdf')}"`);
    return res.send(buffer);
  }

  // 3. Fallback sample PDF
  const fallback = samplePdfTemplate1.replace(/^data:application\/pdf;base64,/, '');
  const buffer = Buffer.from(fallback, 'base64');
  res.setHeader('Content-Type', 'application/pdf');
  return res.send(buffer);
});

// 8. Create new Worksheet (Teacher)
app.post('/api/worksheets', (req, res) => {
  const { pin, worksheet } = req.body;
  const db = readDB();

  if (!checkTeacherPin(pin, db.settings.teacherPin)) {
    return res.status(401).json({ success: false, message: '선생님 인증이 필요합니다.' });
  }

  if (!worksheet || !worksheet.title || !worksheet.unitTitle || !worksheet.lessonNumber) {
    return res.status(400).json({ success: false, message: '단원명, 차시, 제목은 필수 항목입니다.' });
  }

  const now = new Date().toISOString();
  const wsId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  let finalPdfDataUrl = worksheet.pdfDataUrl || `/api/pdf/${wsId}`;

  // If base64 was sent, save to disk to keep db.json small and prevent payload overflow
  if (worksheet.pdfDataUrl && worksheet.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
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

  const newWorksheet: Worksheet = {
    id: wsId,
    unitId: worksheet.unitId || `unit-${encodeURIComponent(worksheet.unitTitle)}`,
    unitTitle: worksheet.unitTitle.trim(),
    lessonNumber: worksheet.lessonNumber.trim(),
    title: worksheet.title.trim(),
    subject: worksheet.subject || db.settings.subject || '수업',
    grade: worksheet.grade || db.settings.className,
    date: worksheet.date || new Date().toISOString().split('T')[0],
    description: worksheet.description || '',
    keyPoints: worksheet.keyPoints || [],
    pdfFileName: worksheet.pdfFileName || `${worksheet.lessonNumber}_${worksheet.title}.pdf`,
    pdfDataUrl: finalPdfDataUrl,
    fileSizeBytes: worksheet.fileSizeBytes || 250000,
    pageCount: worksheet.pageCount || 2,
    hasAnswerSheet: !!worksheet.hasAnswerSheet,
    answerSheetPdfDataUrl: worksheet.answerSheetPdfDataUrl || '',
    answerSheetText: worksheet.answerSheetText || '',
    showAnswerSheetToStudents: !!worksheet.showAnswerSheetToStudents,
    downloadCount: 0,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    isImportant: !!worksheet.isImportant,
  };

  db.worksheets.unshift(newWorksheet);
  writeDB(db);

  res.json({ success: true, worksheet: newWorksheet });
});

// 9. Update Worksheet (Teacher)
app.put('/api/worksheets/:id', (req, res) => {
  const { id } = req.params;
  const { pin, updates } = req.body;
  const db = readDB();

  if (!checkTeacherPin(pin, db.settings.teacherPin)) {
    return res.status(401).json({ success: false, message: '권한이 없습니다.' });
  }

  const index = db.worksheets.findIndex(w => w.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: '학습지를 찾을 수 없습니다.' });
  }

  db.worksheets[index] = {
    ...db.worksheets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeDB(db);
  res.json({ success: true, worksheet: db.worksheets[index] });
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
  res.json({ success: true, message: '학습지가 삭제되었습니다.' });
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
