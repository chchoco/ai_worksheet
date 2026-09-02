import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Check,
  Sparkles,
  Layers,
  Settings,
  AlertCircle,
  Eye,
  EyeOff,
  Edit,
  Save,
  RotateCcw,
  BookOpen,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Download,
  School,
  ShieldCheck,
  Megaphone,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ListOrdered,
} from 'lucide-react';
import { Worksheet, ClassSettings } from '../types';
import { formatBytes, formatDate } from '../utils/pdfHelper';
import { DEFAULT_AI_UNITS } from '../data/defaultUnits';

interface TeacherAdminPageProps {
  isTeacherMode: boolean;
  onAuthenticate: (pin: string) => Promise<boolean>;
  onLogout: () => void;
  onNavigateToStudent: () => void;
  onAddWorksheet: (wsData: Partial<Worksheet>) => Promise<{ success: boolean; message?: string } | boolean>;
  onUpdateWorksheet: (id: string, updates: Partial<Worksheet>) => Promise<{ success: boolean; message?: string } | boolean>;
  onDeleteWorksheet: (id: string) => Promise<boolean>;
  onReorderWorksheets?: (newOrderedList: Worksheet[]) => Promise<{ success: boolean; message?: string } | boolean>;
  onUpdateSettings: (newSettings: Partial<ClassSettings>, newPin?: string) => Promise<{ success: boolean; message?: string } | boolean>;
  onResetSample: () => Promise<boolean>;
  worksheets: Worksheet[];
  existingUnits: string[];
  settings: ClassSettings | null;
}

export const TeacherAdminPage: React.FC<TeacherAdminPageProps> = ({
  isTeacherMode,
  onAuthenticate,
  onLogout,
  onNavigateToStudent,
  onAddWorksheet,
  onUpdateWorksheet,
  onDeleteWorksheet,
  onReorderWorksheets,
  onUpdateSettings,
  onResetSample,
  worksheets,
  existingUnits,
  settings,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'settings'>('upload');
  const [manageUnitFilter, setManageUnitFilter] = useState<string>('all');

  // Form State for New / Edit Worksheet
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unitMode, setUnitMode] = useState<'select' | 'new'>('select');
  const [selectedUnit, setSelectedUnit] = useState<string>(existingUnits[0] || DEFAULT_AI_UNITS[0]);
  const [newUnitTitle, setNewUnitTitle] = useState<string>('');
  const [lessonNumber, setLessonNumber] = useState<string>('1차시');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [keyPoints, setKeyPoints] = useState<string[]>(['']);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(2);
  const [hasAnswerSheet, setHasAnswerSheet] = useState<boolean>(false);
  const [answerSheetText, setAnswerSheetText] = useState<string>('');
  const [showAnswerSheetToStudents, setShowAnswerSheetToStudents] = useState<boolean>(true);
  const [isImportant, setIsImportant] = useState<boolean>(false);

  // Drag and drop & reading states
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);

  // Settings form state
  const [schoolName, setSchoolName] = useState<string>(settings?.schoolName || '전남여자고등학교');
  const [teacherName, setTeacherName] = useState<string>(settings?.teacherName || '정보선생님');
  const [className, setClassName] = useState<string>(settings?.className || '2학년 2학기');
  const [subject, setSubject] = useState<string>(settings?.subject || '인공지능 기초');
  const [announcement, setAnnouncement] = useState<string>(settings?.announcement || '');
  const [newPin, setNewPin] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync settings when props change
  useEffect(() => {
    if (settings) {
      setSchoolName(settings.schoolName || '전남여자고등학교');
      setTeacherName(settings.teacherName || '정보선생님');
      setClassName(settings.className || '2학년 2학기');
      setSubject(settings.subject || '인공지능 기초');
      setAnnouncement(settings.announcement || '');
    }
  }, [settings]);

  // Handle Authentication
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('비밀번호를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    setPinError('');

    const success = await onAuthenticate(pinInput);
    setIsVerifying(false);

    if (!success) {
      setPinError('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
    }
  };

  // Process File helper (used by both input change and drag&drop)
  const processPdfFile = async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setFeedbackMsg({ type: 'error', text: 'PDF 형식(.pdf)의 파일만 업로드할 수 있습니다.' });
      return;
    }

    setPdfFileName(file.name);
    setFileSizeBytes(file.size);
    setIsReadingFile(true);
    setFeedbackMsg(null);

    // Auto fill title if empty
    if (!title) {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanTitle);
    }

    try {
      // 1. First attempt: Direct multipart upload to backend (fast and supports large files up to 100MB)
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.fileUrl) {
          setPdfDataUrl(data.fileUrl);
          setPdfFileName(data.fileName || file.name);
          setFileSizeBytes(data.fileSizeBytes || file.size);
          setIsReadingFile(false);
          setFeedbackMsg({
            type: 'success',
            text: `✅ ${file.name} (${formatBytes(file.size)}) 파일이 성공적으로 준비되었습니다!`,
          });
          return;
        }
      }
    } catch (uploadErr) {
      console.warn('Multipart upload fallback to base64 reader:', uploadErr);
    }

    // 2. Fallback: Local FileReader as Base64 Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPdfDataUrl(event.target.result as string);
        setIsReadingFile(false);
        setFeedbackMsg({
          type: 'success',
          text: `✅ ${file.name} (${formatBytes(file.size)}) 파일이 준비되었습니다!`,
        });
      }
    };
    reader.onerror = () => {
      setIsReadingFile(false);
      setFeedbackMsg({ type: 'error', text: 'PDF 파일을 읽는 중 오류가 발생했습니다.' });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPdfFile(file);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processPdfFile(file);
    }
  };

  const handleAddKeyPoint = () => {
    setKeyPoints([...keyPoints, '']);
  };

  const handleRemoveKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const handleKeyPointChange = (index: number, val: string) => {
    const next = [...keyPoints];
    next[index] = val;
    setKeyPoints(next);
  };

  // Populate form for editing
  const handleStartEdit = (ws: Worksheet) => {
    setEditingId(ws.id);
    setSelectedUnit(ws.unitTitle);
    setLessonNumber(ws.lessonNumber);
    setTitle(ws.title);
    setDate(ws.date);
    setDescription(ws.description || '');
    setKeyPoints(ws.keyPoints && ws.keyPoints.length > 0 ? ws.keyPoints : ['']);
    setPdfFileName(ws.pdfFileName);
    setPdfDataUrl(ws.pdfDataUrl);
    setFileSizeBytes(ws.fileSizeBytes);
    setPageCount(ws.pageCount);
    setHasAnswerSheet(ws.hasAnswerSheet || false);
    setAnswerSheetText(ws.answerSheetText || '');
    setShowAnswerSheetToStudents(ws.showAnswerSheetToStudents ?? true);
    setIsImportant(ws.isImportant || false);
    setActiveTab('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setKeyPoints(['']);
    setPdfFileName('');
    setPdfDataUrl('');
    setFileSizeBytes(0);
    setHasAnswerSheet(false);
    setAnswerSheetText('');
    setShowAnswerSheetToStudents(true);
    setIsImportant(false);
  };

  // Save / Submit Worksheet
  const handleSaveWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUnit = unitMode === 'select' ? selectedUnit : newUnitTitle.trim();

    if (!finalUnit) {
      setFeedbackMsg({ type: 'error', text: '단원명을 입력하거나 선택해주세요.' });
      return;
    }

    if (!title.trim()) {
      setFeedbackMsg({ type: 'error', text: '학습지 제목을 입력해주세요.' });
      return;
    }

    if (isReadingFile) {
      setFeedbackMsg({ type: 'error', text: 'PDF 파일을 처리 중입니다. 잠시만 기다려주세요.' });
      return;
    }

    setIsSubmitting(true);
    const payload: Partial<Worksheet> = {
      unitTitle: finalUnit,
      lessonNumber,
      title: title.trim(),
      date,
      description: description.trim(),
      keyPoints: keyPoints.filter(k => k.trim().length > 0),
      pdfFileName: pdfFileName || `${lessonNumber}_${title.trim()}.pdf`,
      pdfDataUrl: pdfDataUrl || '',
      fileSizeBytes: fileSizeBytes || 50000,
      pageCount: pageCount || 2,
      hasAnswerSheet,
      answerSheetText,
      showAnswerSheetToStudents,
      isImportant,
    };

    let result: { success: boolean; message?: string } | boolean = false;
    if (editingId) {
      result = await onUpdateWorksheet(editingId, payload);
    } else {
      result = await onAddWorksheet(payload);
    }

    setIsSubmitting(false);

    const isSuccess = typeof result === 'boolean' ? result : result.success;
    const errorMessage = typeof result === 'object' && result.message ? result.message : '저장 중 오류가 발생했습니다.';

    if (isSuccess) {
      setFeedbackMsg({
        type: 'success',
        text: editingId ? '학습지가 성공적으로 수정되었습니다.' : '새 학습지가 등록되었습니다!',
      });
      handleCancelEdit();
      setTimeout(() => setFeedbackMsg(null), 3000);
      setActiveTab('manage');
    } else {
      setFeedbackMsg({ type: 'error', text: errorMessage });
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await onUpdateSettings(
      {
        schoolName,
        teacherName,
        className,
        subject,
        announcement,
      },
      newPin.trim() ? newPin.trim() : undefined
    );

    setIsSubmitting(false);

    const isSuccess = typeof result === 'boolean' ? result : !!result?.success;
    const errorMsg = typeof result === 'object' && result?.message ? result.message : '설정 저장 중 오류가 발생했습니다.';

    if (isSuccess) {
      setFeedbackMsg({ type: 'success', text: '🎉 환경 설정이 성공적으로 저장되었습니다.' });
      setNewPin('');
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({ type: 'error', text: errorMsg });
    }
  };

  // Move worksheet up or down in order
  const handleMoveWorksheet = async (wsId: string, direction: 'up' | 'down') => {
    if (!onReorderWorksheets) return;

    const targetWs = worksheets.find(w => w.id === wsId);
    if (!targetWs) return;

    // Filter list for the same unit to keep unit integrity
    const unitWorksheets = worksheets.filter(w => w.unitTitle === targetWs.unitTitle);
    const unitIndex = unitWorksheets.findIndex(w => w.id === wsId);

    if (direction === 'up' && unitIndex === 0) return;
    if (direction === 'down' && unitIndex === unitWorksheets.length - 1) return;

    const swapTarget = direction === 'up' ? unitWorksheets[unitIndex - 1] : unitWorksheets[unitIndex + 1];
    if (!swapTarget) return;

    // Create new full worksheets array with swapped positions
    const newWorksheets = [...worksheets];
    const indexA = newWorksheets.findIndex(w => w.id === targetWs.id);
    const indexB = newWorksheets.findIndex(w => w.id === swapTarget.id);

    if (indexA === -1 || indexB === -1) return;

    const temp = newWorksheets[indexA];
    newWorksheets[indexA] = newWorksheets[indexB];
    newWorksheets[indexB] = temp;

    // Reassign orderIndex
    const reordered = newWorksheets.map((w, idx) => ({
      ...w,
      orderIndex: idx + 1,
    }));

    setFeedbackMsg({ type: 'success', text: '학습지 순서가 변경되어 서버에 저장되었습니다.' });
    setTimeout(() => setFeedbackMsg(null), 3000);

    await onReorderWorksheets(reordered);
  };

  // Quick auto-sort by lesson number (1차시 -> 2차시 -> 3차시)
  const handleAutoSortByLesson = async () => {
    if (!onReorderWorksheets) return;
    if (!window.confirm('모든 학습지를 1단원→2단원 및 1차시→2차시 오름차순(처음 올린 순)으로 자동 정렬하시겠습니까?')) return;

    const sorted = [...worksheets].sort((a, b) => {
      const matchUnitA = a.unitTitle.match(/(\d+)/);
      const matchUnitB = b.unitTitle.match(/(\d+)/);
      const uA = matchUnitA ? parseInt(matchUnitA[1], 10) : 999;
      const uB = matchUnitB ? parseInt(matchUnitB[1], 10) : 999;
      if (uA !== uB) return uA - uB;

      const matchLesA = a.lessonNumber.match(/(\d+)/);
      const matchLesB = b.lessonNumber.match(/(\d+)/);
      const lA = matchLesA ? parseInt(matchLesA[1], 10) : 999;
      const lB = matchLesB ? parseInt(matchLesB[1], 10) : 999;
      if (lA !== lB) return lA - lB;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }).map((w, idx) => ({ ...w, orderIndex: idx + 1 }));

    setFeedbackMsg({ type: 'success', text: '차시 순서대로 자동 정렬되었습니다.' });
    setTimeout(() => setFeedbackMsg(null), 3000);
    await onReorderWorksheets(sorted);
  };

  // Combined list of all units
  const allAvailableUnits = Array.from(new Set([...DEFAULT_AI_UNITS, ...existingUnits])).filter(Boolean);

  // If Not Authenticated, show secure password entry screen
  if (!isTeacherMode) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <Lock className="w-8 h-8" />
            </div>
            <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-indigo-700 mb-2">
              교사용 전용 접속 경로 (/admin)
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">선생님 관리자 로그인</h2>
            <p className="text-xs text-slate-500 mt-1">
              학습지 등록, 수정, 삭제 및 수업 설정은 담당 교사만 접근할 수 있습니다.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                관리자 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="admin-login-pin-input"
                  value={pinInput}
                  onChange={e => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="비밀번호를 입력하세요"
                  autoFocus
                  className="w-full pl-4 pr-11 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pinError && (
                <p className="text-xs text-rose-500 mt-2 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              id="btn-admin-auth-submit"
              disabled={isVerifying}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isVerifying ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  관리자 페이지 접속
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onNavigateToStudent}
              className="text-xs text-slate-500 hover:text-indigo-600 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              학생용 학습지 열람 화면으로 돌아가기 (/)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Teacher is Authenticated: Render Full Teacher Portal
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Admin Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-900/50">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  교사용 관리자 페이지
                </span>
                <span className="text-xs text-slate-400">
                  {settings?.schoolName || '전남여자고등학교'} · {settings?.teacherName || '정보선생님'}
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                {settings?.subject || '인공지능 기초'} 학습지 통합 관리
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={onNavigateToStudent}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              학생용 화면으로 보기 (/)
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <main className="max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('upload');
              if (editingId) handleCancelEdit();
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingId ? '학습지 내용 수정 중' : '새 학습지 등록 (PDF 업로드)'}
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'manage'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            등록된 학습지 목록 및 관리 ({worksheets.length}개)
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            학교 / 교사 / 공지 및 비밀번호 설정
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-xs ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* TAB 1: UPLOAD / EDIT WORKSHEET */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {editingId ? <Edit className="w-5 h-5 text-amber-600" /> : <Upload className="w-5 h-5 text-indigo-600" />}
                  {editingId ? '학습지 내용 수정' : '새 차시 학습지 등록'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  선생님께서 제작하신 PDF 학습지를 업로드하면 학생용 뷰어에 즉시 반영됩니다.
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                >
                  수정 취소
                </button>
              )}
            </div>

            <form onSubmit={handleSaveWorksheet} className="space-y-6">
              {/* PDF File Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  PDF 학습지 원본 파일 첨부
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDraggingFile
                      ? 'border-indigo-600 bg-indigo-100/70 scale-[1.01]'
                      : 'border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload
                    className={`w-10 h-10 mx-auto mb-2 transition-transform ${
                      isDraggingFile ? 'scale-110 text-indigo-700' : 'text-indigo-600'
                    }`}
                  />
                  {isReadingFile ? (
                    <div>
                      <p className="text-sm font-bold text-indigo-700 animate-pulse">PDF 파일을 처리하는 중입니다...</p>
                      <p className="text-xs text-slate-500 mt-1">잠시만 기다려주세요.</p>
                    </div>
                  ) : pdfFileName ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900">{pdfFileName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatBytes(fileSizeBytes)}</p>
                      <span className="inline-block mt-3 text-xs bg-indigo-600 text-white font-semibold px-3 py-1 rounded-lg shadow-xs">
                        다른 PDF 파일로 변경하기
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        여기를 클릭하거나 PDF 파일을 끌어다 놓으세요 (Drag & Drop)
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        (PDF 파일 첨부 시 원본 파일 그대로 뷰어 및 학생 다운로드에 제공됩니다)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Unit Selection & Quick Choice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      수업 단원 선택
                    </label>
                    <button
                      type="button"
                      onClick={() => setUnitMode(unitMode === 'select' ? 'new' : 'select')}
                      className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                    >
                      {unitMode === 'select' ? '+ 직접 새 단원 입력' : '목록에서 단원 선택'}
                    </button>
                  </div>

                  {unitMode === 'select' ? (
                    <select
                      value={selectedUnit}
                      onChange={e => setSelectedUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                    >
                      {allAvailableUnits.map(unit => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newUnitTitle}
                      onChange={e => setNewUnitTitle(e.target.value)}
                      placeholder="예: 2단원. 인공지능과 머신러닝 모델"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  )}

                  {/* 4 Standard Units Quick Buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {DEFAULT_AI_UNITS.map((unit, idx) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          setUnitMode('select');
                          setSelectedUnit(unit);
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                          selectedUnit === unit && unitMode === 'select'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {idx + 1}단원 바로선택
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    수업 차시
                  </label>
                  <input
                    type="text"
                    value={lessonNumber}
                    onChange={e => setLessonNumber(e.target.value)}
                    placeholder="예: 1차시, 2~3차시, 보충학습"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    학습지 제목 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="예: [1차시] 인공지능의 정의와 역사 탐구하기"
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    수업 날짜
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  수업 및 학습 목표 설명
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="학생들이 이번 차시에서 달성해야 하는 핵심 학습 목표나 주의사항을 입력하세요."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Key Summary Points */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    핵심 수업 요약 (학생 요약 탭에 표시)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddKeyPoint}
                    className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 항목 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {keyPoints.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={point}
                        onChange={e => handleKeyPointChange(index, e.target.value)}
                        placeholder={`핵심 요약 ${index + 1}`}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                      {keyPoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyPoint(index)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer Sheet Options */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAnswerSheet}
                      onChange={e => setHasAnswerSheet(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      정답 및 해설 첨부하기
                    </span>
                  </label>

                  {hasAnswerSheet && (
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={showAnswerSheetToStudents}
                        onChange={e => setShowAnswerSheetToStudents(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        학생 화면에 정답 공개
                      </span>
                    </label>
                  )}
                </div>

                {hasAnswerSheet && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      정답 및 예시 답안 내용
                    </label>
                    <textarea
                      value={answerSheetText}
                      onChange={e => setAnswerSheetText(e.target.value)}
                      rows={3}
                      placeholder="문제별 정답이나 핵심 모범 답안을 작성해주세요."
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                  >
                    수정 취소
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingId ? '학습지 수정 완료' : '학습지 서버에 등록하기'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MANAGE WORKSHEETS */}
        {activeTab === 'manage' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  등록된 학습지 목록 및 순서 조정 ({worksheets.length}개)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  단원 내에서 ▲/▼ 버튼을 눌러 학습지 순서를 자유롭게 변경할 수 있습니다. (처음 올린 학습지가 위, 나중에 올린 학습지가 아래로 배치됩니다)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoSortByLesson}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="1단원→2단원 및 1차시→2차시 순서로 자동 재정렬"
                >
                  <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
                  차시 순서로 자동 정렬
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> 새 학습지 등록
                </button>
              </div>
            </div>

            {/* Unit Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 mr-1">단원 필터:</span>
              <button
                type="button"
                onClick={() => setManageUnitFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  manageUnitFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                전체 단원 ({worksheets.length})
              </button>
              {allAvailableUnits.map(unit => {
                const count = worksheets.filter(w => w.unitTitle === unit).length;
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setManageUnitFilter(unit)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      manageUnitFilter === unit
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {unit} ({count})
                  </button>
                );
              })}
            </div>

            {worksheets.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">등록된 학습지가 없습니다.</p>
                <p className="text-xs text-slate-500 mt-1">
                  '새 학습지 등록' 탭에서 PDF 학습지를 업로드해주세요.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {allAvailableUnits
                  .filter(unit => manageUnitFilter === 'all' || manageUnitFilter === unit)
                  .map(unit => {
                    const unitWorksheets = worksheets.filter(w => w.unitTitle === unit);
                    if (unitWorksheets.length === 0 && manageUnitFilter !== 'all') {
                      return (
                        <div key={unit} className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                          <p className="text-xs text-slate-400 font-medium">이 단원에 등록된 학습지가 없습니다.</p>
                        </div>
                      );
                    }
                    if (unitWorksheets.length === 0) return null;

                    return (
                      <div key={unit} className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                            <h3 className="text-sm font-black text-slate-900">{unit}</h3>
                          </div>
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            총 {unitWorksheets.length}개 차시
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {unitWorksheets.map((ws, uIdx) => {
                            const isFirstInUnit = uIdx === 0;
                            const isLastInUnit = uIdx === unitWorksheets.length - 1;

                            return (
                              <div
                                key={ws.id}
                                className="p-3.5 bg-white hover:bg-slate-50/90 border border-slate-200/90 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs transition-all"
                              >
                                <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                                  {/* Sequence Number Badge */}
                                  <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0 border border-slate-200">
                                    #{uIdx + 1}
                                  </span>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        {ws.lessonNumber}
                                      </span>
                                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(ws.date)}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        ({formatBytes(ws.fileSizeBytes)})
                                      </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 truncate">
                                      {ws.title}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <Download className="w-3 h-3 text-slate-400" />
                                        다운로드 {ws.downloadCount}회
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Eye className="w-3 h-3 text-slate-400" />
                                        열람 {ws.viewCount}회
                                      </span>
                                      {ws.hasAnswerSheet && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded font-semibold border ${
                                            ws.showAnswerSheetToStudents
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-slate-200 text-slate-700 border-slate-300'
                                          }`}
                                        >
                                          해설 {ws.showAnswerSheetToStudents ? '공개' : '비공개'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons: Up/Down Order + Edit + Delete */}
                                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                                  {/* Move Up */}
                                  <button
                                    type="button"
                                    disabled={isFirstInUnit}
                                    onClick={() => handleMoveWorksheet(ws.id, 'up')}
                                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-600 transition-colors border border-slate-200 cursor-pointer"
                                    title="단원 내에서 위로 이동"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>

                                  {/* Move Down */}
                                  <button
                                    type="button"
                                    disabled={isLastInUnit}
                                    onClick={() => handleMoveWorksheet(ws.id, 'down')}
                                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-600 transition-colors border border-slate-200 cursor-pointer"
                                    title="단원 내에서 아래로 이동"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>

                                  <div className="w-px h-5 bg-slate-200 mx-1" />

                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(ws)}
                                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-amber-600" />
                                    수정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteWorksheet(ws.id)}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    삭제
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                학습 환경 및 수업 공지 설정
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                학교명, 교사명, 학급명 및 상단 공지사항, 관리자 비밀번호를 관리합니다.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    학교명
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    선생님 성명/직함
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={e => setTeacherName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    학급/학기 명칭
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    과목명
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  학생용 상단 공지사항 (비워두면 숨김)
                </label>
                <input
                  type="text"
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                  placeholder="예: 다음 주 월요일 2단원 형성평가가 예정되어 있으니 1~4차시 학습지를 복습해오세요."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Change Password */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  관리자 비밀번호 변경 (변경할 경우에만 입력)
                </label>
                <input
                  type="password"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  className="max-w-md w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  설정 저장하기
                </button>
              </div>
            </form>

            {/* Reset DB Sample */}
            <div className="pt-6 border-t border-slate-100 bg-rose-50/50 p-5 rounded-2xl border border-rose-100">
              <h3 className="text-sm font-bold text-rose-900 mb-1">
                기본 샘플 데이터로 복원
              </h3>
              <p className="text-xs text-rose-600 mb-3">
                테스트용 기본 인공지능 기초 학습지 데이터로 복원합니다.
              </p>
              <button
                type="button"
                onClick={onResetSample}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                기본 샘플 복원
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
