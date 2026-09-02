import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, CheckCircle, Circle, Star, Plus, Eye, Download, Layers, Sparkles } from 'lucide-react';
import { Worksheet } from '../types';
import { DEFAULT_AI_UNITS } from '../data/defaultUnits';

interface WorksheetSidebarProps {
  worksheets: Worksheet[];
  selectedWorksheetId: string | null;
  onSelectWorksheet: (id: string) => void;
  selectedUnitFilter: string;
  onSelectUnitFilter: (unit: string) => void;
}

export const WorksheetSidebar: React.FC<WorksheetSidebarProps> = ({
  worksheets,
  selectedWorksheetId,
  onSelectWorksheet,
  selectedUnitFilter,
  onSelectUnitFilter,
}) => {
  // Get all units that have worksheets, ordered by unit key
  const activeUnitsInWorksheets: string[] = Array.from(new Set(worksheets.map(w => w.unitTitle))).filter(Boolean) as string[];

  // If there are worksheets, only show the units that contain worksheets (or default units if empty)
  const allKnownUnits: string[] = activeUnitsInWorksheets.length > 0
    ? activeUnitsInWorksheets
    : DEFAULT_AI_UNITS;

  // Group worksheets by Unit
  const unitsMap = allKnownUnits.reduce((acc, unit: string) => {
    acc[unit] = worksheets.filter(ws => ws.unitTitle === unit);
    return acc;
  }, {} as Record<string, Worksheet[]>);

  // Add any other uncategorized units if present in worksheets
  worksheets.forEach(ws => {
    const key = ws.unitTitle || '기타 학습 자료';
    if (!unitsMap[key]) {
      unitsMap[key] = [ws];
    }
  });

  const unitTitles = Object.keys(unitsMap);

  // Track expanded state for units (all expanded by default)
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

  const toggleUnit = (unit: string) => {
    setCollapsedUnits(prev => ({
      ...prev,
      [unit]: !prev[unit],
    }));
  };

  return (
    <aside className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col h-auto lg:h-[calc(100vh-65px)] lg:sticky lg:top-[65px] shrink-0">
      {/* Sidebar Header & Unit Filter */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">수업 단원 및 차시 목록</h2>
          </div>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            총 {worksheets.length}개 차시
          </span>
        </div>

        {/* Unit Filter dropdown */}
        <select
          id="select-unit-filter"
          value={selectedUnitFilter}
          onChange={e => onSelectUnitFilter(e.target.value)}
          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">전체 단원 보기 (총 {worksheets.length}개 차시)</option>
          {unitTitles.map(unit => (
            <option key={unit} value={unit}>
              {unit} ({unitsMap[unit]?.length || 0}차시)
            </option>
          ))}
        </select>
      </div>

      {/* List of Units and Lessons */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {unitTitles.map(unit => {
          const isCollapsed = collapsedUnits[unit];
          const unitWorksheets = unitsMap[unit] || [];
          const hasWorksheets = unitWorksheets.length > 0;

          // If filtering by a specific unit and this isn't it, hide it
          if (selectedUnitFilter !== 'all' && selectedUnitFilter !== unit) {
            return null;
          }

          return (
            <div key={unit} className="bg-slate-50/50 rounded-xl border border-slate-200/80 overflow-hidden">
              {/* Unit Header Accordion */}
              <button
                type="button"
                onClick={() => toggleUnit(unit)}
                className="w-full px-3 py-2.5 flex items-center justify-between bg-slate-100/70 hover:bg-slate-200/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800 truncate">{unit}</span>
                </div>
                <span
                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ml-2 ${
                    hasWorksheets
                      ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                      : 'text-slate-400 bg-white border-slate-200'
                  }`}
                >
                  {unitWorksheets.length}개
                </span>
              </button>

              {/* Lessons in this unit */}
              {!isCollapsed && (
                <div className="p-1.5 space-y-1 bg-white">
                  {!hasWorksheets ? (
                    <div className="py-3.5 px-2 text-center text-slate-400 text-[11px]">
                      <p>등록된 학습지가 없습니다.</p>
                    </div>
                  ) : (
                    unitWorksheets.map((ws, wsIdx) => {
                      const isSelected = ws.id === selectedWorksheetId;

                      return (
                        <div
                          key={ws.id}
                          id={`sidebar-worksheet-${ws.id}`}
                          onClick={() => onSelectWorksheet(ws.id)}
                          className={`group relative rounded-lg p-3 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700 font-semibold'
                            }`}>
                              {ws.lessonNumber || `#${wsIdx + 1}`}
                            </span>
                            {ws.isImportant && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                            )}
                            <span className="text-[11px] text-slate-400 truncate ml-auto">
                              {ws.date.slice(5)}
                            </span>
                          </div>

                          <p className={`text-xs font-semibold leading-snug line-clamp-2 ${
                            isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'
                          }`}>
                            {ws.title}
                          </p>

                          {/* Badges / Stats (Real Values) */}
                          <div className="flex items-center gap-2.5 mt-2 text-[10px] text-slate-500">
                            <span className="flex items-center gap-0.5" title={`실제 다운로드 횟수: ${ws.downloadCount}회`}>
                              <Download className="w-2.5 h-2.5 text-slate-400" />
                              다운로드 {ws.downloadCount}
                            </span>
                            <span className="flex items-center gap-0.5" title={`실제 열람 횟수: ${ws.viewCount}회`}>
                              <Eye className="w-2.5 h-2.5 text-slate-400" />
                              열람 {ws.viewCount}
                            </span>
                            {ws.hasAnswerSheet && ws.showAnswerSheetToStudents && (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded font-medium border border-indigo-100">
                                해설 공개
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>💡 학생은 로그인 없이 열람/인쇄 가능</span>
      </div>
    </aside>
  );
};
