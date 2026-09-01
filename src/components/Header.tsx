import React from 'react';
import { BookOpen, Search, Megaphone } from 'lucide-react';
import { ClassSettings } from '../types';

interface HeaderProps {
  settings: ClassSettings | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalWorksheets: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  searchQuery,
  onSearchChange,
  totalWorksheets,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner Notice from Teacher */}
      {settings?.announcement && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-xs sm:text-sm text-indigo-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <Megaphone className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold text-indigo-700 shrink-0">[선생님 공지]</span>
            <p className="truncate font-medium text-slate-700">{settings.announcement}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Branding & Class Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {settings?.schoolName || '전남여자고등학교'} · {settings?.subject || '인공지능 기초'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {settings?.className || '2학년 2학기'}
              <span className="text-xs font-normal text-slate-500 hidden md:inline">
                ({settings?.teacherName || '정보선생님'})
              </span>
            </h1>
          </div>
        </div>

        {/* Right: Search */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:w-72 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="worksheet-search-input"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="단원, 차시, 제목 검색..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

