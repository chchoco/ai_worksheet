import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode, ExternalLink, Download, Share2, Sparkles, Monitor } from 'lucide-react';
import { Worksheet } from '../types';

interface ShareModalProps {
  worksheet: Worksheet | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ worksheet, isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isBigScreenMode, setIsBigScreenMode] = useState<boolean>(false);

  if (!isOpen || !worksheet) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareLink = `${currentOrigin}?worksheet=${worksheet.id}`;

  useEffect(() => {
    QRCode.toDataURL(shareLink, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  }, [shareLink]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-full transition-all ${
        isBigScreenMode ? 'max-w-3xl' : 'max-w-md'
      }`}>
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-200" />
            <h3 className="font-bold text-base">학생 공유 링크 & 수업용 QR코드</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsBigScreenMode(!isBigScreenMode)}
              title={isBigScreenMode ? '기본 화면으로 축소' : '수업 빔프로젝터/전자칠판용 대형 모드'}
              className="p-1.5 hover:bg-white/20 rounded-lg text-indigo-100 hover:text-white transition-colors"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg text-indigo-100 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Target Worksheet Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 mb-1">
              <span>{worksheet.unitTitle}</span>
              <span>•</span>
              <span className="bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-900 font-bold">{worksheet.lessonNumber}</span>
            </div>
            <p className="font-bold text-slate-900 text-sm">{worksheet.title}</p>
          </div>

          {/* QR Code section */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            {qrUrl ? (
              <div className="relative group">
                <img
                  src={qrUrl}
                  alt="Worksheet QR Code"
                  className={`rounded-xl shadow-md border-4 border-white transition-all ${
                    isBigScreenMode ? 'w-72 h-72' : 'w-48 h-48'
                  }`}
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-slate-200 rounded-xl animate-pulse">
                <QrCode className="w-12 h-12 text-slate-400" />
              </div>
            )}
            <p className="mt-3 text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              학생들이 스마트폰이나 태블릿 카메라로 비추면 바로 열립니다.
            </p>
          </div>

          {/* Direct Link Copy */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              직접 접속 링크 (단축/공유용)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-mono select-all focus:outline-none"
              />
              <button
                id="btn-copy-share-link"
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    복사완료!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    링크 복사
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Guide */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold mb-1">📢 학생 안내 팁</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              <li>학생들은 별도 회원가입 없이 링크나 QR로 즉시 학습지를 볼 수 있습니다.</li>
              <li>화면에서 바로 <strong>[PDF 다운로드]</strong> 또는 <strong>[인쇄하기]</strong> 버튼을 누르면 됩니다.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
