import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
  Download,
  Layers,
} from 'lucide-react';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
} catch {
  // fallback
}

interface PdfCanvasViewerProps {
  pdfUrl: string;
  title?: string;
  onOpenNewTab?: () => void;
  onDownload?: () => void;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  pdfUrl,
  title = '학습지 PDF',
  onOpenNewTab,
  onDownload,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const renderTaskRefs = useRef<{ [key: number]: any }>({});

  // 1. Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);
    setPdfDoc(null);
    setCurrentPage(1);

    const loadDoc = async () => {
      try {
        let loadingTask: any;

        if (pdfUrl.startsWith('data:application/pdf')) {
          // Convert base64 data URL to Uint8Array
          const base64Data = pdfUrl.split(',')[1];
          const raw = window.atob(base64Data);
          const rawLength = raw.length;
          const array = new Uint8Array(new ArrayBuffer(rawLength));
          for (let i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: array });
        } else {
          // Normal URL
          loadingTask = pdfjsLib.getDocument(pdfUrl);
        }

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading PDF document with PDF.js:', err);
        if (!isCancelled) {
          setErrorMsg('PDF 문서를 불러오는 중 오류가 발생했습니다.');
          setIsLoading(false);
        }
      }
    };

    if (pdfUrl) {
      loadDoc();
    } else {
      setIsLoading(false);
      setErrorMsg('PDF 파일 데이터가 존재하지 않습니다.');
    }

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // 2. Render a specific page onto its canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc) return;
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;

      try {
        // Cancel existing render task for this page if running
        if (renderTaskRefs.current[pageNum]) {
          try {
            renderTaskRefs.current[pageNum].cancel();
          } catch {
            // ignore
          }
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale, rotation });

        const outputScale = window.devicePixelRatio || 1.5;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          transform: transform,
        };

        const task = page.render(renderContext);
        renderTaskRefs.current[pageNum] = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    },
    [pdfDoc, scale, rotation]
  );

  // 3. Trigger rendering when doc, scale, rotation, viewMode, or page changes
  useEffect(() => {
    if (!pdfDoc) return;

    if (viewMode === 'all') {
      for (let p = 1; p <= numPages; p++) {
        renderPage(p);
      }
    } else {
      renderPage(currentPage);
    }
  }, [pdfDoc, scale, rotation, viewMode, currentPage, numPages, renderPage]);

  const handleZoomIn = () => setScale(prev => Math.min(Number((prev + 0.2).toFixed(1)), 2.4));
  const handleZoomOut = () => setScale(prev => Math.max(Number((prev - 0.2).toFixed(1)), 0.6));
  const handleZoomReset = () => setScale(1.2);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      scrollToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
      scrollToPage(currentPage + 1);
    }
  };

  const scrollToPage = (pageNum: number) => {
    const el = canvasRefs.current[pageNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full flex flex-col items-center bg-slate-200 rounded-2xl overflow-hidden shadow-md border border-slate-300">
      {/* Viewer Floating Control Toolbar */}
      <div className="w-full bg-slate-800 text-white px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs select-none sticky top-0 z-10 shadow-sm">
        {/* Left: View Mode & Page Info */}
        <div className="flex items-center gap-2">
          {numPages > 0 && (
            <div className="flex items-center gap-1 bg-slate-700/80 px-2.5 py-1 rounded-lg">
              <span className="font-semibold text-indigo-300">
                {viewMode === 'single' ? `${currentPage} / ${numPages} 페이지` : `총 ${numPages} 페이지`}
              </span>
            </div>
          )}

          {/* View mode toggle */}
          {numPages > 1 && (
            <button
              onClick={() => setViewMode(prev => (prev === 'all' ? 'single' : 'all'))}
              className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 font-medium flex items-center gap-1 transition-colors"
              title="보기 방식 전환"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{viewMode === 'all' ? '1장씩 보기' : '연속 스크롤'}</span>
            </button>
          )}
        </div>

        {/* Center: Zoom & Rotate Controls */}
        <div className="flex items-center gap-1 bg-slate-700/80 p-0.5 rounded-lg">
          <button
            onClick={handleZoomOut}
            title="축소"
            className="p-1.5 hover:bg-slate-600 active:bg-slate-500 rounded text-slate-200 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomReset}
            title="기본 배율"
            className="px-2 font-bold text-slate-200 hover:text-white"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            title="확대"
            className="p-1.5 hover:bg-slate-600 active:bg-slate-500 rounded text-slate-200 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-slate-600 mx-0.5"></div>
          <button
            onClick={handleRotate}
            title="90도 회전"
            className="p-1.5 hover:bg-slate-600 active:bg-slate-500 rounded text-slate-200 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {viewMode === 'single' && numPages > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {onOpenNewTab && (
            <button
              onClick={onOpenNewTab}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-bold flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>새 탭</span>
            </button>
          )}

          {onDownload && (
            <button
              onClick={onDownload}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold flex items-center gap-1 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>저장</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="w-full flex-1 min-h-[600px] max-h-[85vh] overflow-y-auto overflow-x-auto p-4 sm:p-6 flex flex-col items-center gap-6"
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-16 text-slate-600">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
            <p className="font-bold text-sm text-slate-800">학습지 PDF 렌더링 중...</p>
            <p className="text-xs text-slate-500 mt-1">고화질 캔버스로 페이지를 선명하게 변환하고 있습니다.</p>
          </div>
        )}

        {errorMsg && !isLoading && (
          <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 max-w-md shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
            <p className="text-xs text-slate-500 mb-4">{errorMsg}</p>
            <div className="flex justify-center gap-2">
              {onOpenNewTab && (
                <button
                  onClick={onOpenNewTab}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  새 탭에서 원본 열기
                </button>
              )}
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  다운로드
                </button>
              )}
            </div>
          </div>
        )}

        {/* Continuous View: Render All Pages */}
        {!isLoading && !errorMsg && viewMode === 'all' && (
          <div className="flex flex-col items-center gap-6 w-full">
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <div
                key={pageNum}
                className="flex flex-col items-center relative bg-white shadow-xl rounded-sm border border-slate-300 overflow-hidden group"
              >
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs z-10 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                  {pageNum} / {numPages}
                </div>
                <canvas
                  ref={el => {
                    canvasRefs.current[pageNum] = el;
                  }}
                  className="block bg-white"
                />
              </div>
            ))}
          </div>
        )}

        {/* Single Page View */}
        {!isLoading && !errorMsg && viewMode === 'single' && (
          <div className="flex flex-col items-center bg-white shadow-xl rounded-sm border border-slate-300 overflow-hidden">
            <canvas
              ref={el => {
                canvasRefs.current[currentPage] = el;
              }}
              className="block bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
