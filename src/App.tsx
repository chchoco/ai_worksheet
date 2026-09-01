import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { WorksheetSidebar } from './components/WorksheetSidebar';
import { WorksheetViewer } from './components/WorksheetViewer';
import { ShareModal } from './components/ShareModal';
import { TeacherAdminModal } from './components/TeacherAdminModal';
import { Worksheet, ClassSettings } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<ClassSettings | null>(null);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');

  // Teacher Authentication State
  const [isTeacherMode, setIsTeacherMode] = useState<boolean>(() => {
    return sessionStorage.getItem('is_teacher_authenticated') === 'true';
  });
  const [teacherPin, setTeacherPin] = useState<string>(() => {
    return sessionStorage.getItem('teacher_cached_pin') || '';
  });

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [teacherModalTab, setTeacherModalTab] = useState<'upload' | 'manage' | 'settings'>('upload');

  // Load Initial Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, worksheetsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/worksheets'),
      ]);

      const settingsData = await settingsRes.json();
      const worksheetsData = await worksheetsRes.json();

      if (settingsData.success) {
        setSettings(settingsData.settings);
      }

      if (worksheetsData.success) {
        const list: Worksheet[] = worksheetsData.worksheets || [];
        setWorksheets(list);

        // Check if there is a URL parameter for a specific worksheet
        const urlParams = new URLSearchParams(window.location.search);
        const wsParam = urlParams.get('worksheet');
        const unitParam = urlParams.get('unit');

        if (wsParam && list.some(w => w.id === wsParam)) {
          setSelectedWorksheetId(wsParam);
        } else if (unitParam) {
          const matched = list.find(w => w.unitTitle === unitParam || w.unitId === unitParam);
          if (matched) {
            setSelectedWorksheetId(matched.id);
            setSelectedUnitFilter(matched.unitTitle);
          } else if (list.length > 0) {
            setSelectedWorksheetId(list[0].id);
          }
        } else if (list.length > 0) {
          setSelectedWorksheetId(prev => prev || list[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load worksheets:', err);
      setError('학습지 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL change if user navigates with back/forward
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const wsParam = urlParams.get('worksheet');
      if (wsParam && worksheets.some(w => w.id === wsParam)) {
        setSelectedWorksheetId(wsParam);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [worksheets]);

  // Update URL query without full reload and record real view count when worksheet is selected
  const handleSelectWorksheet = async (id: string) => {
    setSelectedWorksheetId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('worksheet', id);
    window.history.pushState({}, '', url.toString());

    // Record real view count in backend
    try {
      const res = await fetch(`/api/worksheets/${id}`);
      const data = await res.json();
      if (data.success && data.worksheet) {
        setWorksheets(prev =>
          prev.map(w => (w.id === id ? { ...w, viewCount: data.worksheet.viewCount } : w))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Track download count
  const handleRecordDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/worksheets/${id}/download`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setWorksheets(prev =>
          prev.map(w => (w.id === id ? { ...w, downloadCount: data.downloadCount } : w))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Teacher Authentication
  const handleTeacherAuth = async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/teacher/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        setIsTeacherMode(true);
        setTeacherPin(pin);
        sessionStorage.setItem('is_teacher_authenticated', 'true');
        sessionStorage.setItem('teacher_cached_pin', pin);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleExitTeacherMode = () => {
    setIsTeacherMode(false);
    setTeacherPin('');
    sessionStorage.removeItem('is_teacher_authenticated');
    sessionStorage.removeItem('teacher_cached_pin');
  };

  // Teacher Add Worksheet
  const handleAddWorksheet = async (wsData: Partial<Worksheet>): Promise<boolean> => {
    try {
      const res = await fetch('/api/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: teacherPin || '5480!!', worksheet: wsData }),
      });
      const data = await res.json();
      if (data.success && data.worksheet) {
        setWorksheets(prev => [data.worksheet, ...prev]);
        setSelectedWorksheetId(data.worksheet.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Teacher Update Worksheet
  const handleUpdateWorksheet = async (id: string, updates: Partial<Worksheet>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/worksheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: teacherPin || '5480!!', updates }),
      });
      const data = await res.json();
      if (data.success && data.worksheet) {
        setWorksheets(prev => prev.map(w => (w.id === id ? data.worksheet : w)));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Teacher Delete Worksheet
  const handleDeleteWorksheet = async (id: string): Promise<boolean> => {
    if (!window.confirm('정말 이 학습지를 삭제하시겠습니까?')) return false;
    try {
      const res = await fetch(`/api/worksheets/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: teacherPin || '5480!!' }),
      });
      const data = await res.json();
      if (data.success) {
        setWorksheets(prev => {
          const next = prev.filter(w => w.id !== id);
          if (selectedWorksheetId === id && next.length > 0) {
            setSelectedWorksheetId(next[0].id);
          }
          return next;
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Teacher Toggle Answer Sheet Visibility for students
  const handleToggleAnswerVisibility = async (id: string, currentVal: boolean) => {
    await handleUpdateWorksheet(id, { showAnswerSheetToStudents: !currentVal });
  };

  // Teacher Update Settings
  const handleUpdateSettings = async (newSettings: Partial<ClassSettings>, newPin?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/teacher/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: teacherPin || '5480!!',
          newSettings,
          newPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        if (newPin) {
          setTeacherPin(newPin);
          sessionStorage.setItem('teacher_cached_pin', newPin);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Teacher Reset Sample Data
  const handleResetSample = async (): Promise<boolean> => {
    if (!window.confirm('기본 샘플 데이터로 복원하시겠습니까? 기존 변경 내용은 초기화됩니다.')) return false;
    try {
      const res = await fetch('/api/teacher/reset-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: teacherPin || '5480!!' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Filtered worksheets by search & unit
  const filteredWorksheets = worksheets.filter(w => {
    const matchesUnit = selectedUnitFilter === 'all' || w.unitTitle === selectedUnitFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.unitTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.lessonNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesUnit && matchesSearch;
  });

  const selectedWorksheet = worksheets.find(w => w.id === selectedWorksheetId) || worksheets[0] || null;
  const existingUnits = Array.from(new Set(worksheets.map(w => w.unitTitle))).filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      {/* Top Header */}
      <Header
        settings={settings}
        isTeacherMode={isTeacherMode}
        onOpenTeacherModal={() => {
          setTeacherModalTab('upload');
          setIsTeacherModalOpen(true);
        }}
        onExitTeacherMode={handleExitTeacherMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalWorksheets={worksheets.length}
      />

      {/* Main Container */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-600">학습지 자료를 불러오는 중입니다...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
          <h3 className="text-base font-bold text-slate-800">{error}</h3>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
          {/* Left / Top Sidebar for Unit & Lesson Organization */}
          <WorksheetSidebar
            worksheets={filteredWorksheets}
            selectedWorksheetId={selectedWorksheet?.id || null}
            onSelectWorksheet={handleSelectWorksheet}
            isTeacherMode={isTeacherMode}
            onOpenTeacherUpload={() => {
              setTeacherModalTab('upload');
              setIsTeacherModalOpen(true);
            }}
            selectedUnitFilter={selectedUnitFilter}
            onSelectUnitFilter={setSelectedUnitFilter}
          />

          {/* Center Main Worksheet Viewer & Reader */}
          <WorksheetViewer
            worksheet={selectedWorksheet}
            allWorksheets={filteredWorksheets}
            onSelectWorksheet={handleSelectWorksheet}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            isTeacherMode={isTeacherMode}
            onEditWorksheet={ws => {
              setTeacherModalTab('upload');
              setIsTeacherModalOpen(true);
            }}
            onDeleteWorksheet={handleDeleteWorksheet}
            onToggleAnswerVisibility={handleToggleAnswerVisibility}
            onRecordDownload={handleRecordDownload}
          />
        </div>
      )}

      {/* Share / QR Code Modal */}
      <ShareModal
        worksheet={selectedWorksheet}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Teacher Management & Upload Modal */}
      <TeacherAdminModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        isTeacherMode={isTeacherMode}
        onAuthenticate={handleTeacherAuth}
        onAddWorksheet={handleAddWorksheet}
        onUpdateWorksheet={handleUpdateWorksheet}
        onDeleteWorksheet={handleDeleteWorksheet}
        onUpdateSettings={handleUpdateSettings}
        onResetSample={handleResetSample}
        worksheets={worksheets}
        existingUnits={existingUnits}
        settings={settings}
        initialTab={teacherModalTab}
      />
    </div>
  );
}
