import React, { useState } from 'react';
import {
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  CheckCircle2,
  Circle,
  FileText,
  HelpCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { Worksheet } from '../types';
import { formatBytes, formatDate, downloadFile, triggerPrintWorksheet } from '../utils/pdfHelper';

interface WorksheetViewerProps {
  worksheet: Worksheet | null;
  allWorksheets: Worksheet[];
  onSelectWorksheet: (id: string) => void;
  onRecordDownload: (id: string) => void;
}

export const WorksheetViewer: React.FC<WorksheetViewerProps> = ({
  worksheet,
  allWorksheets,
  onSelectWorksheet,
  onRecordDownload,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'worksheet' | 'summary' | 'answers'>('worksheet');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewFormat, setViewFormat] = useState<'interactive' | 'pdf-embed'>('interactive');

  if (!worksheet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50 min-h-[500px]">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">학습지를 선택해주세요</h3>
        <p className="text-sm text-slate-500 max-w-md">
          왼쪽 단원 목록에서 보고 싶은 수업 차시를 클릭하면 학습지 열람, PDF 다운로드, 출력이 가능합니다.
        </p>
      </div>
    );
  }

  // Find previous and next worksheets in list
  const currentIndex = allWorksheets.findIndex(w => w.id === worksheet.id);
  const prevWorksheet = currentIndex > 0 ? allWorksheets[currentIndex - 1] : null;
  const nextWorksheet = currentIndex < allWorksheets.length - 1 ? allWorksheets[currentIndex + 1] : null;

  const handleDownload = () => {
    onRecordDownload(worksheet.id);
    downloadFile(worksheet.pdfDataUrl, worksheet.pdfFileName);
  };

  const handlePrint = () => {
    triggerPrintWorksheet('printable-worksheet-content');
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 15, 75));
  const handleZoomReset = () => setZoomLevel(100);

  return (
    <main className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Metadata */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {worksheet.unitTitle}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {worksheet.lessonNumber}
              </span>
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
              <span>바로 인쇄하기</span>
            </button>
          </div>
        </div>

        {/* View Mode & Tabs Bar */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('worksheet')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'worksheet'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📄 학습지 뷰어
            </button>

            {worksheet.keyPoints && worksheet.keyPoints.length > 0 && (
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  activeTab === 'summary'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                💡 핵심 수업 요약 ({worksheet.keyPoints.length})
              </button>
            )}

            {worksheet.hasAnswerSheet && worksheet.showAnswerSheetToStudents && (
              <button
                onClick={() => setActiveTab('answers')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                  activeTab === 'answers'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ✏️ 정답 및 해설
              </button>
            )}
          </div>

          {/* Zoom & Format controls */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewFormat('interactive')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  viewFormat === 'interactive' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                인쇄형 뷰
              </button>
              <button
                onClick={() => setViewFormat('pdf-embed')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  viewFormat === 'pdf-embed' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                PDF 프레임
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={handleZoomOut}
                title="축소"
                className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomReset}
                title="기본 배율"
                className="px-1.5 text-[11px] font-medium text-slate-700 hover:text-indigo-600"
              >
                {zoomLevel}%
              </button>
              <button
                onClick={handleZoomIn}
                title="확대"
                className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-start">
        {/* Tab 1: Worksheet View */}
        {activeTab === 'worksheet' && (
          <div
            className="w-full transition-transform duration-150 origin-top flex flex-col items-center"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {viewFormat === 'pdf-embed' && worksheet.pdfDataUrl.startsWith('data:application/pdf') ? (
              <div className="w-full max-w-4xl h-[850px] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <iframe
                  src={`${worksheet.pdfDataUrl}#toolbar=1&navpanes=0`}
                  title={worksheet.title}
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              /* High-fidelity Standard Classroom Worksheet Presentation (Print-ready format) */
              <div
                id="printable-worksheet-content"
                className="w-full max-w-4xl bg-white rounded-2xl shadow-md border border-slate-300/80 p-8 sm:p-12 text-slate-900 transition-all font-sans"
              >
                {/* Formal Class Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1">
                        <span>{worksheet.subject}과 탐구 학습지</span>
                        <span>|</span>
                        <span>{worksheet.unitTitle}</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        [{worksheet.lessonNumber}] {worksheet.title}
                      </h1>
                    </div>

                    {/* Student Name & Class Field */}
                    <div className="border border-slate-400 rounded-lg p-2 text-xs bg-slate-50/70 shrink-0 w-full sm:w-60">
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <span className="text-slate-500 font-medium">학년/반: </span>
                          <span className="font-bold text-slate-900 underline decoration-slate-300">____학년 ____반</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">번호: </span>
                          <span className="font-bold text-slate-900">____번</span>
                        </div>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex justify-between">
                        <span className="text-slate-500 font-medium">이름: </span>
                        <span className="font-bold text-slate-900">________________</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teacher's Lesson Goal & Context */}
                {worksheet.description && (
                  <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-4 mb-6">
                    <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      학습 목표 및 안내
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {worksheet.description}
                    </p>
                  </div>
                )}

                {/* Key Concepts Review Box */}
                {worksheet.keyPoints && worksheet.keyPoints.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      핵심 개념 정리
                    </h3>
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                      {worksheet.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed font-medium">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Structured Student Problem Sets */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-700" />
                      [탐구 및 형성 평가 문제]
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">스스로 풀고 정리해 봅시다.</span>
                  </div>

                  {/* Problem 1 */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-extrabold text-indigo-600">01.</span>
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                        다음 빈칸에 들어갈 알맞은 핵심 단어를 본문의 내용을 참고하여 적어보시오.
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-xs sm:text-sm leading-loose text-slate-700">
                      더 이상 다른 물질로 분해되지 않는 물질을 이루는 기본 성분을 ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )(이)라고 하며,
                      물질의 성질을 나타내는 가장 작은 독립된 입자를 ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )(이)라고 부른다.
                    </div>
                    <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
                      <span>답:</span>
                      <div className="flex-1 border-b border-slate-400 h-6"></div>
                    </div>
                  </div>

                  {/* Problem 2 */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-extrabold text-indigo-600">02.</span>
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                        이번 {worksheet.lessonNumber} 수업에서 배운 핵심 원리와 실험 결과를 자신의 말로 요약하여 설명하시오.
                      </p>
                    </div>
                    <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-4 min-h-[110px]">
                      <div className="border-b border-slate-200 h-6"></div>
                      <div className="border-b border-slate-200 h-6"></div>
                      <div className="border-b border-slate-200 h-6"></div>
                    </div>
                  </div>

                  {/* Problem 3 (Application) */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-extrabold text-indigo-600">03.</span>
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                        우리 실생활에서 이 원리가 적용되는 대표적인 사례 2가지를 쓰고, 그 이유를 서술하시오.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/40 min-h-[90px]">
                        <span className="text-xs font-bold text-slate-600 block mb-2">사례 1:</span>
                        <div className="border-b border-slate-200 h-5"></div>
                        <div className="border-b border-slate-200 h-5 mt-2"></div>
                      </div>
                      <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/40 min-h-[90px]">
                        <span className="text-xs font-bold text-slate-600 block mb-2">사례 2:</span>
                        <div className="border-b border-slate-200 h-5"></div>
                        <div className="border-b border-slate-200 h-5 mt-2"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Worksheet Footer */}
                <div className="mt-12 pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
                  <span>{worksheet.grade || '수업 자료'} · {worksheet.subject}</span>
                  <span>발행일: {formatDate(worksheet.date)} · 인쇄용 학습지</span>
                  <span>페이지 1 / {worksheet.pageCount || 1}</span>
                </div>
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
                <Check className="w-5 h-5 text-emerald-600" />
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
                  <p className="mt-2">3. 불꽃 반응을 통해 금속 원소의 종류를 빠르고 간편하게 구별할 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Lesson Navigation (Prev/Next) */}
        <div className="w-full max-w-4xl flex items-center justify-between mt-8 pt-4 border-t border-slate-200">
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
