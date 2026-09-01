export interface Worksheet {
  id: string;
  unitId: string;
  unitTitle: string;
  lessonNumber: string; // e.g. "1차시", "2차시", "심화학습"
  title: string; // e.g. "원소 기호와 주기율표 탐구"
  subject: string; // e.g. "과학", "수학", "국어", "영어", "사회"
  grade?: string; // e.g. "중학교 2학년"
  date: string; // e.g. "2026-03-12"
  description?: string;
  keyPoints?: string[];
  pdfFileName: string;
  pdfDataUrl: string; // Base64 data URL or API streaming path
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

export interface UnitGroup {
  id: string;
  title: string; // e.g. "1단원. 물질의 구성"
  description?: string;
  order: number;
  worksheets: Worksheet[];
}

export interface ClassSettings {
  schoolName: string;
  teacherName: string;
  className: string; // e.g. "3학년 2반 과학수업"
  subject: string;
  announcement: string;
  allowDirectDownload: boolean;
  themeColor: 'indigo' | 'emerald' | 'blue' | 'rose' | 'amber';
  teacherPinHash: string; // Stored securely
}

export type ViewMode = 'all' | 'unit' | 'detail';
