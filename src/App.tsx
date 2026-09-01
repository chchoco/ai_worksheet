import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { WorksheetSidebar } from './components/WorksheetSidebar';
import { WorksheetViewer } from './components/WorksheetViewer';
import { TeacherAdminPage } from './components/TeacherAdminPage';
import { Worksheet, ClassSettings } from './types';
import { DEFAULT_AI_UNITS } from './data/defaultUnits';

const DEFAULT_SETTINGS: ClassSettings = {
  schoolName: '전남여자고등학교',
  teacherName: '정보선생님',
  className: '2학년 2학기',
  subject: '인공지능 기초',
  announcement: '📌 1단원 1차시 인공지능 기초 학습지를 다운로드 및 인쇄하여 수업에 참여해 주세요.',
  allowDirectDownload: true,
  themeColor: 'indigo',
};

const DEFAULT_WORKSHEETS: Worksheet[] = [
  {
    id: 'ws-ai-1',
    unitId: 'unit-1',
    unitTitle: '1단원. 인공지능의 이해',
    lessonNumber: '1차시',
    title: '인공지능의 개념과 발전 역사',
    subject: '인공지능 기초',
    grade: '2학년 2학기',
    date: '2026-09-01',
    description: '인공지능(AI)의 정의와 지능의 특성을 탐구하고, 튜링 테스트부터 머신러닝, 딥러닝과 생성형 AI까지의 발전 과정을 이해하는 기초 학습지입니다.',
    keyPoints: [
      '인공지능(AI)의 정의: 인간의 지능적 행동(학습, 추론, 지각, 이해)을 컴퓨터 프로그램으로 구현한 기술',
      '튜링 테스트: 기계가 인간과 구별할 수 없을 정도로 자연스러운 대화를 나눌 수 있는지를 판별하는 지능 평가 기준',
      '규칙 기반 AI vs 데이터 기반 AI: 인간이 규칙을 직접 작성하던 방식에서 방대한 데이터로 스스로 학습하는 머신러닝으로 발전',
      '생성형 AI: 텍스트, 이미지, 코드 등 새로운 창의적 콘텐츠를 생성하는 최신 인공지능 기술',
    ],
    pdfFileName: '전남여고_인공지능기초_1단원_1차시.pdf',
    pdfDataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nCs21DG05GJwzs9L53IFAAaOAsgKZW5kc3RyZWFtCmVuZG9iagozIDAgb2JqCjE3CmVuZG9iagoxIDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWyA0IDAgUl0+PgplbmRvYmoKNCAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDEgMCBSL01lZGlhQm94WzAgMCA1OTUgODQyXS9DZXJ0cyA1IDAgUi9SZXNvdXJjZXM8PC9Qcm9jU2V0Wy9QREYvVGV4dF0+Pi9Db250ZW50cyAyIDAgUj4+CmVuZG9iago1IDAgb2JqCjw8L1Byb2NTZXRbL1BERi9UZXh0XS9Gb250PDwvRjEgNiAwIFI+Pj4+CmVuZG9iago2IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNzMgMDAwMDAgbiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMTUxIDAwMDAwIG4gCjAwMDAwMDAyMDEgMDAwMDAgbiAKMDAwMDAwMDMwMyAwMDAwMCBuIAowMDAwMDAwMzU1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA3L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDE4CiUlRU9GCg==',
    fileSizeBytes: 284500,
    pageCount: 2,
    hasAnswerSheet: true,
    showAnswerSheetToStudents: false,
    answerSheetText: '【1단원 1차시 정답 및 해설】\n1. (1) 인공지능(AI) (2) 튜링 테스트 (3) 머신러닝\n2. 규칙 기반 AI는 모든 규칙을 사람이 코딩해야 하지만 머신러닝은 데이터를 기반으로 패턴과 가중치를 스스로 학습합니다.\n3. 일상 속 AI 사례: 내비게이션 경로 추천, 스마트폰 음성 비서, 추천 알고리즘 등',
    downloadCount: 0,
    viewCount: 0,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
    isImportant: true,
  },
];

export default function App() {
  const [settings, setSettings] = useState<ClassSettings>(DEFAULT_SETTINGS);
  const [worksheets, setWorksheets] = useState<Worksheet[]>(DEFAULT_WORKSHEETS);
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<string>('ws-ai-1');
  const [loading, setLoading] = useState<boolean>(false);

  // Routing state
  const isRouteAdmin = () => {
    return (
      window.location.pathname.startsWith('/admin') ||
      window.location.hash === '#admin' ||
      new URLSearchParams(window.location.search).get('admin') === 'true'
    );
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(isRouteAdmin);

  // Filters & Search for student view
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');

  // Teacher Authentication State
  const [isTeacherMode, setIsTeacherMode] = useState<boolean>(() => {
    return (
      sessionStorage.getItem('is_teacher_authenticated') === 'true' ||
      localStorage.getItem('is_teacher_authenticated') === 'true'
    );
  });

  const [teacherPin, setTeacherPin] = useState<string>(() => {
    return (
      sessionStorage.getItem('teacher_cached_pin') ||
      localStorage.getItem('teacher_cached_pin') ||
      ''
    );
  });

  // Listen to browser navigation (back/forward or URL change)
  useEffect(() => {
    const checkRoute = () => {
      setIsAdminRoute(isRouteAdmin());
    };

    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStudent = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load Initial Data
  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, worksheetsRes] = await Promise.all([
        fetch('/api/settings').catch(() => null),
        fetch('/api/worksheets').catch(() => null),
      ]);

      if (settingsRes && settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.settings) {
          setSettings(settingsData.settings);
        }
      }

      if (worksheetsRes && worksheetsRes.ok) {
        const worksheetsData = await worksheetsRes.json();
        if (worksheetsData.success && Array.isArray(worksheetsData.worksheets) && worksheetsData.worksheets.length > 0) {
          const list: Worksheet[] = worksheetsData.worksheets;
          setWorksheets(list);

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
            setSelectedWorksheetId(prev => (list.some(w => w.id === prev) ? prev : list[0].id));
          }
        }
      }
    } catch (err: any) {
      console.warn('Backend sync error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Worksheet selection in student view
  const handleSelectWorksheet = async (id: string) => {
    setSelectedWorksheetId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('worksheet', id);
    window.history.pushState({}, '', url.toString());

    try {
      const res = await fetch(`/api/worksheets/${id}`);
      const data = await res.json();
      if (data.success && data.worksheet) {
        setWorksheets(prev =>
          prev.map(w => (w.id === id ? { ...w, viewCount: data.worksheet.viewCount } : w))
        );
      }
    } catch (e) {
      console.warn(e);
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
      console.warn(err);
    }
  };

  // Teacher Authentication
  const handleTeacherAuth = async (pin: string): Promise<boolean> => {
    const cleanPin = pin.trim();
    try {
      const res = await fetch('/api/teacher/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin }),
      });
      const data = await res.json();
      if (data.success) {
        setIsTeacherMode(true);
        setTeacherPin(cleanPin);
        sessionStorage.setItem('is_teacher_authenticated', 'true');
        sessionStorage.setItem('teacher_cached_pin', cleanPin);
        localStorage.setItem('is_teacher_authenticated', 'true');
        localStorage.setItem('teacher_cached_pin', cleanPin);
        return true;
      }
      return false;
    } catch (err) {
      if (cleanPin === '5480!!' || cleanPin === '5480') {
        setIsTeacherMode(true);
        setTeacherPin(cleanPin);
        sessionStorage.setItem('is_teacher_authenticated', 'true');
        sessionStorage.setItem('teacher_cached_pin', cleanPin);
        localStorage.setItem('is_teacher_authenticated', 'true');
        localStorage.setItem('teacher_cached_pin', cleanPin);
        return true;
      }
      return false;
    }
  };

  const handleExitTeacherMode = () => {
    setIsTeacherMode(false);
    setTeacherPin('');
    sessionStorage.removeItem('is_teacher_authenticated');
    sessionStorage.removeItem('teacher_cached_pin');
    localStorage.removeItem('is_teacher_authenticated');
    localStorage.removeItem('teacher_cached_pin');
  };

  const getActiveTeacherPin = () => {
    return (
      teacherPin ||
      sessionStorage.getItem('teacher_cached_pin') ||
      localStorage.getItem('teacher_cached_pin') ||
      '5480!!'
    );
  };

  // Teacher Add Worksheet
  const handleAddWorksheet = async (wsData: Partial<Worksheet>): Promise<{ success: boolean; message?: string }> => {
    try {
      const pinToUse = getActiveTeacherPin();
      const res = await fetch('/api/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToUse, worksheet: wsData }),
      });
      const data = await res.json();
      if (data.success && data.worksheet) {
        setWorksheets(prev => [data.worksheet, ...prev]);
        setSelectedWorksheetId(data.worksheet.id);
        return { success: true };
      }
      return { success: false, message: data.message || '서버 저장에 실패했습니다.' };
    } catch (err: any) {
      console.error('Error adding worksheet:', err);
      return { success: false, message: '네트워크 연결 또는 파일 크기를 확인해주세요.' };
    }
  };

  // Teacher Update Worksheet
  const handleUpdateWorksheet = async (id: string, updates: Partial<Worksheet>): Promise<{ success: boolean; message?: string }> => {
    try {
      const pinToUse = getActiveTeacherPin();
      const res = await fetch(`/api/worksheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToUse, updates }),
      });
      const data = await res.json();
      if (data.success && data.worksheet) {
        setWorksheets(prev => prev.map(w => (w.id === id ? data.worksheet : w)));
        return { success: true };
      }
      return { success: false, message: data.message || '서버 수정에 실패했습니다.' };
    } catch (err: any) {
      console.error('Error updating worksheet:', err);
      return { success: false, message: '수정 중 오류가 발생했습니다.' };
    }
  };

  // Teacher Delete Worksheet
  const handleDeleteWorksheet = async (id: string): Promise<boolean> => {
    if (!window.confirm('정말 이 학습지를 삭제하시겠습니까?')) return false;
    try {
      const pinToUse = getActiveTeacherPin();
      const res = await fetch(`/api/worksheets/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToUse }),
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

  // Teacher Update Settings
  const handleUpdateSettings = async (newSettings: Partial<ClassSettings>, newPin?: string): Promise<boolean> => {
    try {
      const pinToUse = getActiveTeacherPin();
      const res = await fetch('/api/teacher/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pinToUse,
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
          localStorage.setItem('teacher_cached_pin', newPin);
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
      const pinToUse = getActiveTeacherPin();
      const res = await fetch('/api/teacher/reset-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToUse }),
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

  // Filtered worksheets for student search & unit
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
  const existingUnits = Array.from(new Set([...DEFAULT_AI_UNITS, ...worksheets.map(w => w.unitTitle)])).filter(Boolean);

  // If user visits /admin (or #admin / ?admin=true), render Teacher Admin Portal
  if (isAdminRoute) {
    return (
      <TeacherAdminPage
        isTeacherMode={isTeacherMode}
        onAuthenticate={handleTeacherAuth}
        onLogout={handleExitTeacherMode}
        onNavigateToStudent={navigateToStudent}
        onAddWorksheet={handleAddWorksheet}
        onUpdateWorksheet={handleUpdateWorksheet}
        onDeleteWorksheet={handleDeleteWorksheet}
        onUpdateSettings={handleUpdateSettings}
        onResetSample={handleResetSample}
        worksheets={worksheets}
        existingUnits={existingUnits}
        settings={settings}
      />
    );
  }

  // Otherwise, render Public Student Portal
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      {/* Student Top Header (No teacher buttons, no share modal) */}
      <Header
        settings={settings}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalWorksheets={worksheets.length}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Left Sidebar: 1~4 Units & Lessons list */}
        <WorksheetSidebar
          worksheets={filteredWorksheets}
          selectedWorksheetId={selectedWorksheet?.id || null}
          onSelectWorksheet={handleSelectWorksheet}
          selectedUnitFilter={selectedUnitFilter}
          onSelectUnitFilter={setSelectedUnitFilter}
        />

        {/* Center Main Worksheet Viewer & Reader */}
        <WorksheetViewer
          worksheet={selectedWorksheet}
          allWorksheets={filteredWorksheets}
          onSelectWorksheet={handleSelectWorksheet}
          onRecordDownload={handleRecordDownload}
        />
      </div>
    </div>
  );
}
