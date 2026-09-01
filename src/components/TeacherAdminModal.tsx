import React, { useState, useRef } from 'react';
import {
  X,
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
} from 'lucide-react';
import { Worksheet, ClassSettings } from '../types';
import { formatBytes } from '../utils/pdfHelper';

interface TeacherAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTeacherMode: boolean;
  onAuthenticate: (pin: string) => Promise<boolean>;
  onAddWorksheet: (wsData: Partial<Worksheet>) => Promise<boolean>;
  onUpdateWorksheet: (id: string, updates: Partial<Worksheet>) => Promise<boolean>;
  onDeleteWorksheet: (id: string) => Promise<boolean>;
  onUpdateSettings: (newSettings: Partial<ClassSettings>, newPin?: string) => Promise<boolean>;
  onResetSample: () => Promise<boolean>;
  worksheets: Worksheet[];
  existingUnits: string[];
  settings: ClassSettings | null;
  initialTab?: 'upload' | 'manage' | 'settings';
}

export const TeacherAdminModal: React.FC<TeacherAdminModalProps> = ({
  isOpen,
  onClose,
  isTeacherMode,
  onAuthenticate,
  onAddWorksheet,
  onUpdateWorksheet,
  onDeleteWorksheet,
  onUpdateSettings,
  onResetSample,
  worksheets,
  existingUnits,
  settings,
  initialTab = 'upload',
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'settings'>(initialTab);

  // Form State for New / Edit Worksheet
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unitMode, setUnitMode] = useState<'select' | 'new'>('select');
  const [selectedUnit, setSelectedUnit] = useState<string>(existingUnits[0] || '1단원. 인공지능의 이해');
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

  // Sync settings when props change or modal opens
  React.useEffect(() => {
    if (settings) {
      setSchoolName(settings.schoolName || '전남여자고등학교');
      setTeacherName(settings.teacherName || '정보선생님');
      setClassName(settings.className || '2학년 2학기');
      setSubject(settings.subject || '인공지능 기초');
      setAnnouncement(settings.announcement || '');
    }
  }, [settings, isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setPinError('');
      setFeedbackMsg(null);
    }
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    if (existingUnits.length > 0 && !selectedUnit) {
      setSelectedUnit(existingUnits[0]);
    }
  }, [existingUnits, selectedUnit]);

  if (!isOpen) return null;

  // Handle PIN authentication
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setIsVerifying(true);
    setPinError('');
    const cleanPin = pinInput.trim();
    const success = await onAuthenticate(cleanPin);
    setIsVerifying(false);
    if (!success) {
      setPinError('비밀번호가 일치하지 않습니다. (기본 비밀번호: 5480 또는 5480!!)');
    } else {
      setPinInput('');
      setFeedbackMsg({ type: 'success', text: '선생님 인증이 완료되었습니다.' });
      setTimeout(() => setFeedbackMsg(null), 2500);
    }
  };

  // Handle PDF file upload (read as base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setFileSizeBytes(file.size);

    // Auto fill title if empty
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/^[0-9]+차시_?/, '');
      setTitle(cleanName || file.name);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPdfDataUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddKeyPoint = () => {
    setKeyPoints([...keyPoints, '']);
  };

  const handleRemoveKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const handleKeyPointChange = (index: number, val: string) => {
    const updated = [...keyPoints];
    updated[index] = val;
    setKeyPoints(updated);
  };

  // Save / Submit Worksheet
  const handleSubmitWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUnit = unitMode === 'new' ? newUnitTitle.trim() : selectedUnit;

    if (!finalUnit || !lessonNumber || !title) {
      setFeedbackMsg({ type: 'error', text: '단원명, 차시, 학습지 제목을 모두 입력해주세요.' });
      return;
    }

    setIsSubmitting(true);
    const payload: Partial<Worksheet> = {
      unitTitle: finalUnit,
      lessonNumber,
      title,
      date,
      description,
      keyPoints: keyPoints.filter(k => k.trim() !== ''),
      pdfFileName: pdfFileName || `${lessonNumber}_${title}.pdf`,
      pdfDataUrl: pdfDataUrl || undefined,
      fileSizeBytes: fileSizeBytes || 250000,
      pageCount: Number(pageCount) || 2,
      hasAnswerSheet: hasAnswerSheet || !!answerSheetText.trim(),
      answerSheetText,
      showAnswerSheetToStudents,
      isImportant,
    };

    let success = false;
    if (editingId) {
      success = await onUpdateWorksheet(editingId, payload);
    } else {
      success = await onAddWorksheet(payload);
    }

    setIsSubmitting(false);

    if (success) {
      setFeedbackMsg({
        type: 'success',
        text: editingId ? '학습지가 성공적으로 수정되었습니다.' : '새 학습지가 등록되었습니다!',
      });
      // Reset form
      setEditingId(null);
      setTitle('');
      setDescription('');
      setKeyPoints(['']);
      setAnswerSheetText('');
      setPdfDataUrl('');
      setPdfFileName('');
      setTimeout(() => setFeedbackMsg(null), 3000);
      setActiveTab('manage');
    } else {
      setFeedbackMsg({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    }
  };

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
    setPageCount(ws.pageCount || 2);
    setHasAnswerSheet(ws.hasAnswerSheet || false);
    setAnswerSheetText(ws.answerSheetText || '');
    setShowAnswerSheetToStudents(ws.showAnswerSheetToStudents || false);
    setIsImportant(ws.isImportant || false);
    setActiveTab('upload');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onUpdateSettings(
      {
        schoolName,
        teacherName,
        className,
        subject,
        announcement,
      },
      newPin.trim() || undefined
    );
    setIsSubmitting(false);

    if (success) {
      setFeedbackMsg({ type: 'success', text: '수업 설정이 저장되었습니다.' });
      setNewPin('');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg({ type: 'error', text: '설정 저장에 실패했습니다.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">선생님 학습지 관리 센터</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Barrier if not verified */}
        {!isTeacherMode ? (
          <div className="p-8 max-w-md mx-auto w-full my-auto text-center space-y-6">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">선생님 전용 인증</h4>
              <p className="text-xs text-slate-500 mt-1">
                학습지 업로드, 단원/차시 수정, 공지 등록을 위해 비밀번호를 입력해주세요.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="teacher-pin-input"
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    placeholder="비밀번호 입력 (예: 5480!!)"
                    className="w-full text-center tracking-wider text-base sm:text-lg font-bold py-3 pl-4 pr-12 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                    title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-slate-400">초기 비밀번호: <strong className="text-slate-600 font-semibold">5480!!</strong> 또는 <strong className="text-slate-600 font-semibold">5480</strong></span>
                </div>
                {pinError && <p className="text-xs text-rose-600 mt-2 font-medium text-left">{pinError}</p>}
              </div>

              <button
                type="submit"
                id="btn-submit-teacher-auth"
                disabled={isVerifying || !pinInput.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <span>인증 확인 중...</span>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>교사 모드 입장하기</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Teacher Panel */
          <>
            {/* Nav Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 text-xs font-bold">
              <button
                onClick={() => {
                  setEditingId(null);
                  setActiveTab('upload');
                }}
                className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'upload'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {editingId ? '학습지 수정' : '새 학습지 업로드'}
              </button>

              <button
                onClick={() => setActiveTab('manage')}
                className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'manage'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                전체 차시 목록 ({worksheets.length})
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'settings'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                수업 및 공지 설정
              </button>
            </div>

            {/* Feedback Alert */}
            {feedbackMsg && (
              <div
                className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                {feedbackMsg.text}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: Upload / Edit Worksheet */}
              {activeTab === 'upload' && (
                <form onSubmit={handleSubmitWorksheet} className="space-y-5">
                  {/* File Upload Drop Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      PDF 학습지 파일 첨부
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                      {pdfFileName ? (
                        <div>
                          <p className="text-xs font-bold text-slate-900">{pdfFileName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{formatBytes(fileSizeBytes)}</p>
                          <span className="inline-block mt-2 text-[11px] bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded">
                            파일 교체하기
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            여기를 클릭하거나 PDF 파일을 끌어다 놓으세요
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            (PDF 파일이 없어도 기본 인쇄 양식으로 자동 생성됩니다)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unit & Lesson selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Unit Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">단원 선택</label>
                        <button
                          type="button"
                          onClick={() => setUnitMode(unitMode === 'select' ? 'new' : 'select')}
                          className="text-[11px] text-indigo-600 font-semibold hover:underline"
                        >
                          {unitMode === 'select' ? '+ 새 단원 입력' : '기존 단원 선택'}
                        </button>
                      </div>

                      {unitMode === 'select' ? (
                        <select
                          value={selectedUnit}
                          onChange={e => setSelectedUnit(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {existingUnits.map(u => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={newUnitTitle}
                          onChange={e => setNewUnitTitle(e.target.value)}
                          placeholder="예: 4단원. 인공지능 프로젝트"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      )}
                    </div>

                    {/* Lesson Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        수업 차시 (예: 1차시, 2차시)
                      </label>
                      <input
                        type="text"
                        value={lessonNumber}
                        onChange={e => setLessonNumber(e.target.value)}
                        placeholder="예: 1차시, 2차시, 보충차시"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Worksheet Title & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        학습지 제목 (소단원 / 주제)
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="예: 원소 기호와 주기율표 탐구"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">수업 날짜</label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Description / Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      학습 목표 및 학생 과제 안내
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="학습 목표나 수업 전 준비사항을 학생들에게 안내하세요."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Key points builder */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">핵심 수업 개념 요약</label>
                      <button
                        type="button"
                        onClick={handleAddKeyPoint}
                        className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> 항목 추가
                      </button>
                    </div>
                    <div className="space-y-2">
                      {keyPoints.map((point, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={point}
                            onChange={e => handleKeyPointChange(index, e.target.value)}
                            placeholder={`핵심 요약 ${index + 1}`}
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          {keyPoints.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyPoint(index)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Answer Sheet & Solution */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        ✏️ 정답 및 해설 첨부 (선택)
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-indigo-700">
                        <input
                          type="checkbox"
                          checked={showAnswerSheetToStudents}
                          onChange={e => setShowAnswerSheetToStudents(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        학생에게 즉시 공개
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={answerSheetText}
                      onChange={e => setAnswerSheetText(e.target.value)}
                      placeholder="정답 및 주요 풀이 과정을 적어주시면 학생들이 확인하거나 수업 후 공개할 수 있습니다."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Important Flag */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-important-checkbox"
                      checked={isImportant}
                      onChange={e => setIsImportant(e.target.checked)}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                    <label htmlFor="is-important-checkbox" className="text-xs font-semibold text-slate-700">
                      ⭐ 중요/필수 학습지로 강조 표시
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      id="btn-save-worksheet"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {editingId ? '수정사항 저장' : '학습지 등록 완료'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: Manage Worksheets List */}
              {activeTab === 'manage' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      전체 등록된 학습지 ({worksheets.length}개)
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setActiveTab('upload');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> 새 학습지 추가
                    </button>
                  </div>

                  {worksheets.map(ws => (
                    <div
                      key={ws.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {ws.lessonNumber}
                          </span>
                          <span className="text-xs text-slate-500 truncate">{ws.unitTitle}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">{ws.title}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span>다운로드: {ws.downloadCount}회</span>
                          <span>조회: {ws.viewCount}회</span>
                          <span>{formatBytes(ws.fileSizeBytes)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleStartEdit(ws)}
                          className="p-1.5 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 text-xs flex items-center gap-1 font-semibold"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          수정
                        </button>
                        <button
                          onClick={() => onDeleteWorksheet(ws.id)}
                          className="p-1.5 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 rounded-lg text-rose-600 text-xs flex items-center gap-1 font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Class Settings & Notice */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">학교명</label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={e => setSchoolName(e.target.value)}
                        placeholder="예: 행복중학교"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">선생님 성함</label>
                      <input
                        type="text"
                        value={teacherName}
                        onChange={e => setTeacherName(e.target.value)}
                        placeholder="예: 김선생님"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">학급 / 수업명</label>
                      <input
                        type="text"
                        value={className}
                        onChange={e => setClassName(e.target.value)}
                        placeholder="예: 중학교 2학년 과학수업"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">교과목</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="예: 과학, 수학, 국어"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      상단 공지사항 (학생들에게 항상 표시됨)
                    </label>
                    <textarea
                      rows={2}
                      value={announcement}
                      onChange={e => setAnnouncement(e.target.value)}
                      placeholder="학생들에게 전달할 수업 안내나 과제 마감 공지"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      교사 비밀번호 변경 (새 비밀번호)
                    </label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value)}
                      placeholder="변경할 비밀번호 입력 (공백 시 기존 유지)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none max-w-xs"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={onResetSample}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      샘플 데이터로 초기화
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                    >
                      설정 저장하기
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
