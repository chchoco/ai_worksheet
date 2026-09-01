import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, CheckCircle, Circle, Star, Plus, Eye, Download, Layers, Sparkles } from 'lucide-react';
import { Worksheet } from '../types';

interface WorksheetSidebarProps {
  worksheets: Worksheet[];
  selectedWorksheetId: string | null;
  onSelectWorksheet: (id: string) => void;
  isTeacherMode: boolean;
  onOpenTeacherUpload: () => void;
  selectedUnitFilter: string;
  onSelectUnitFilter: (unit: string) => void;
}

export const WorksheetSidebar: React.FC<WorksheetSidebarProps> = ({
  worksheets,
  selectedWorksheetId,
  onSelectWorksheet,
  isTeacherMode,
  onOpenTeacherUpload,
  selectedUnitFilter,
  onSelectUnitFilter,
}) => {
  // Group worksheets by Unit
  const unitsMap = worksheets.reduce((acc, ws) => {
    const key = ws.unitTitle || '기타 학습 자료';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(ws);
    return acc;
  }, {} as Record<string, Worksheet[]>);

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
          <option value="all">전체 단원 보기 ({worksheets.length})</option>
          {unitTitles.map(unit => (
            <option key={unit} value={unit}>
              {unit} ({unitsMap[unit].length})
            </option>
          ))}
        </select>

        {/* Teacher Quick Add button */}
        {isTeacherMode && (
          <button
            id="btn-sidebar-quick-upload"
            onClick={onOpenTeacherUpload}
            className="mt-2.5 w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            새 차시 학습지 등록
          </button>
        )}
      </div>

      {/* List of Units and Lessons */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {unitTitles.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 stroke-[1.5] text-slate-300" />
            <p className="text-xs">등록된 학습지가 없습니다.</p>
            {isTeacherMode && (
              <button
                onClick={onOpenTeacherUpload}
                className="mt-3 text-xs text-indigo-600 font-semibold hover:underline"
              >
                첫 학습지 등록하기
              </button>
            )}
          </div>
        ) : (
          unitTitles.map(unit => {
            const isCollapsed = collapsedUnits[unit];
            const unitWorksheets = unitsMap[unit];

            return (
              <div key={unit} className="bg-slate-50/50 rounded-xl border border-slate-200/80 overflow-hidden">
                {/* Unit Header Accordion */}
                <button
                  type="button"
                  onClick={() => toggleUnit(unit)}
                  className="w-full px-3 py-2.5 flex items-center justify-between bg-slate-100/70 hover:bg-slate-200/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-800 truncate">{unit}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
                    {unitWorksheets.length}차시
                  </span>
                </button>

                {/* Lessons in this unit */}
                {!isCollapsed && (
                  <div className="p-1.5 space-y-1 bg-white">
                    {unitWorksheets.map(ws => {
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
                              {ws.lessonNumber}
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
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>💡 학생은 로그인 없이 열람/인쇄 가능</span>
      </div>
    </aside>
  );
};
