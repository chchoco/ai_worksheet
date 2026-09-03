import React, { useState } from 'react';
import {
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
  ExternalLink,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Worksheet } from '../types';
import { formatBytes, formatDate, downloadFile, openPdfInNewTab, triggerPrintWorksheet } from '../utils/pdfHelper';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface WorksheetViewerProps {
  worksheet: Worksheet | null;
  allWorksheets: Worksheet[];
  onSelectWorksheet: (id: string) => void;
  onRecordDownload?: (id: string) => void;
}

export const WorksheetViewer: React.FC<WorksheetViewerProps> = ({
  worksheet,
  allWorksheets,
  onSelectWorksheet,
  onRecordDownload,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'summary' | 'answers'>('pdf');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  if (!worksheet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50 min-h-[500px]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">학습지를 선택해주세요</h3>
        <p className="text-sm text-slate-500 max-w-md">
          왼쪽 단원 목록에서 보고 싶은 수업 차시를 클릭하면 학습지 원본 열람, PDF 다운로드, 출력이 가능합니다.
        </p>
      </div>
    );
  }

  // Find previous and next worksheets in list
  const currentIndex = allWorksheets.findIndex(w => w.id === worksheet.id);
  const prevWorksheet = currentIndex > 0 ? allWorksheets[currentIndex - 1] : null;
  const nextWorksheet = currentIndex < allWorksheets.length - 1 ? allWorksheets[currentIndex + 1] : null;

  const handleDownload = () => {
    if (onRecordDownload) onRecordDownload(worksheet.id);
    downloadFile(worksheet.pdfDataUrl, worksheet.pdfFileName, worksheet.id);
  };

  const handlePrint = () => {
    triggerPrintWorksheet('worksheet-pdf-container', worksheet.pdfDataUrl, worksheet.id);
  };

  const handleOpenNewTab = () => {
    openPdfInNewTab(worksheet.pdfDataUrl, worksheet.id, worksheet.pdfFileName);
  };

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  const pdfSourceUrl = worksheet.pdfDataUrl;

  return (
    <main
      className={`flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-0' : ''
      }`}
    >
      {/* Top Action Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Metadata */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {worksheet.unitTitle}
              </span>
              {worksheet.lessonNumber && (
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {worksheet.lessonNumber}
                </span>
              )}
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(worksheet.date)}
              </span>
              <span className="text-xs text-slate-400">
                ({formatBytes(worksheet.fileSizeBytes)})
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {worksheet.title}
            </h2>
          </div>

          {/* Core Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Open in New Tab Button */}
            <button
              id="btn-open-new-tab"
              onClick={handleOpenNewTab}
              title="새 창에서 원본 PDF 전체화면 열기"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all border border-slate-200"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
              <span>새 창에서 열기</span>
            </button>

            {/* Download PDF Button */}
            <button
              id="btn-download-pdf"
              onClick={handleDownload}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow"
            >
              <Download className="w-4 h-4" />
              <span>PDF 다운로드</span>
            </button>

            {/* Print Button */}
            <button
              id="btn-print-worksheet"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>바로 인쇄</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? '전체화면 종료' : '전체화면으로 보기'}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors border border-slate-200"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'pdf'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 PDF 학습지 본문</span>
            </button>

            {worksheet.keyPoints && worksheet.keyPoints.length > 0 && (
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'summary'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>💡 핵심 개념 요약 ({worksheet.keyPoints.length})</span>
              </button>
            )}

            {worksheet.hasAnswerSheet && worksheet.showAnswerSheetToStudents && (
              <button
                onClick={() => setActiveTab('answers')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'answers'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✏️ 정답 및 해설</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            캔버스 고화질 뷰어 적용됨
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 sm:p-6 flex-1 flex flex-col items-center justify-start">
        {/* Tab 1: PDF Canvas Viewer */}
        {activeTab === 'pdf' && (
          <div
            id="worksheet-pdf-container"
            className="w-full max-w-5xl flex flex-col items-center gap-4"
          >
            {pdfSourceUrl ? (
              <PdfCanvasViewer
                key={worksheet.id}
                pdfUrl={pdfSourceUrl}
                worksheetId={worksheet.id}
                fileName={worksheet.pdfFileName}
                title={worksheet.title}
                onOpenNewTab={handleOpenNewTab}
                onDownload={handleDownload}
              />
            ) : (
              <div className="w-full h-[400px] flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <FileText className="w-12 h-12 mb-2 opacity-50 text-indigo-500" />
                <p className="text-sm font-semibold text-slate-700">등록된 PDF 파일이 없습니다.</p>
              </div>
            )}

            {/* Teacher's Lesson Goal & Context Box below PDF */}
            {worksheet.description && (
              <div className="w-full bg-white border border-indigo-100 rounded-2xl p-5 shadow-xs">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  수업 학습 목표 및 안내
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {worksheet.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Core Key Concepts Summary */}
        {activeTab === 'summary' && (
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4 text-indigo-600">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">단원 핵심 요약 및 수업 노트</h3>
            </div>

            <div className="space-y-4">
              {worksheet.keyPoints?.map((kp, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">{kp}</p>
                  </div>
                </div>
              ))}
            </div>

            {worksheet.description && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900">
                <span className="font-bold block mb-1">📌 선생님의 조언:</span>
                {worksheet.description}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Answer Sheet & Solutions */}
        {activeTab === 'answers' && worksheet.hasAnswerSheet && worksheet.showAnswerSheetToStudents && (
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">정답 및 해설지</h3>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                선생님 공개 해설
              </span>
            </div>

            <div className="space-y-4">
              {worksheet.answerSheetText ? (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {worksheet.answerSheetText}
                </div>
              ) : (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700">
                  <p className="font-bold mb-2">【예시 정답】</p>
                  <p>1. (1) 원소  (2) 분자</p>
                  <p className="mt-2">2. 원소는 물질의 기본 성분이며, 분자는 물질의 고유 성질을 유지하는 가장 작은 단위체입니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Lesson Navigation (Prev/Next) */}
        <div className="w-full max-w-5xl flex items-center justify-between mt-8 pt-4 border-t border-slate-200">
          {prevWorksheet ? (
            <button
              onClick={() => onSelectWorksheet(prevWorksheet.id)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">이전 차시</span>
                <span className="truncate max-w-[150px] sm:max-w-xs block font-bold">{prevWorksheet.lessonNumber} {prevWorksheet.title}</span>
              </div>
            </button>
          ) : (
            <div></div>
          )}

          {nextWorksheet ? (
            <button
              onClick={() => onSelectWorksheet(nextWorksheet.id)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 transition-colors shadow-2xs text-right"
            >
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">다음 차시</span>
                <span className="truncate max-w-[150px] sm:max-w-xs block font-bold">{nextWorksheet.lessonNumber} {nextWorksheet.title}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </main>
  );
};
