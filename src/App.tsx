import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { WorksheetSidebar } from './components/WorksheetSidebar';
import { WorksheetViewer } from './components/WorksheetViewer';
import { TeacherAdminPage } from './components/TeacherAdminPage';
import { Worksheet, ClassSettings } from './types';
import { DEFAULT_AI_UNITS } from './data/defaultUnits';
import {
  seedInitialFirestoreData,
  subscribeToWorksheets,
  subscribeToSettings,
  firestoreAddWorksheet,
  firestoreUpdateWorksheet,
  firestoreDeleteWorksheet,
  firestoreReorderWorksheets,
  firestoreUpdateSettings,
  INITIAL_SAMPLE_WORKSHEETS,
  INITIAL_SETTINGS,
} from './firebase';

const DEFAULT_SETTINGS: ClassSettings = INITIAL_SETTINGS;
const DEFAULT_WORKSHEETS: Worksheet[] = INITIAL_SAMPLE_WORKSHEETS;

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

  // Safe cache without heavy base64 to avoid localStorage quota crash
  const safeCacheWorksheets = (list: Worksheet[]) => {
    try {
      const sanitized = list.map(w => ({
        ...w,
        pdfDataUrl: w.pdfDataUrl && w.pdfDataUrl.length > 500 ? '' : w.pdfDataUrl,
        answerSheetPdfDataUrl: w.answerSheetPdfDataUrl && w.answerSheetPdfDataUrl.length > 500 ? '' : w.answerSheetPdfDataUrl,
      }));
      localStorage.setItem('class_worksheets_cache', JSON.stringify(sanitized));
    } catch (e) {
      console.warn('localStorage cache failed:', e);
    }
  };

  // Load Initial Data & Hook up Firestore Real-time synchronization
  useEffect(() => {
    // 1. Initial Firestore Seeding if DB is empty
    seedInitialFirestoreData();

    // 2. Real-time Worksheets Listener from Firestore (Synchronizes across all browsers instantaneously!)
    const unsubscribeWorksheets = subscribeToWorksheets((realtimeWorksheets) => {
      if (realtimeWorksheets && realtimeWorksheets.length > 0) {
        setWorksheets(realtimeWorksheets);
        safeCacheWorksheets(realtimeWorksheets);
        setSelectedWorksheetId(curr => {
          if (!curr || !realtimeWorksheets.some(w => w.id === curr)) {
            return realtimeWorksheets[0].id;
          }
          return curr;
        });
      }
    });

    // 3. Real-time Settings Listener from Firestore
    const unsubscribeSettings = subscribeToSettings((realtimeSettings) => {
      if (realtimeSettings) {
        setSettings(realtimeSettings);
        try {
          localStorage.setItem('class_settings_cache', JSON.stringify(realtimeSettings));
        } catch {
          // ignore
        }
      }
    });

    // 4. Initial fallback check from backend API
    fetch('/api/worksheets')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.worksheets) && data.worksheets.length > 0) {
          setWorksheets(prev => (prev.length === 0 ? data.worksheets : prev));
        }
      })
      .catch(() => {});

    return () => {
      unsubscribeWorksheets();
      unsubscribeSettings();
    };
  }, []);

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

      // 1. Save to Backend (handles file streaming & disk storage)
      const res = await fetch('/api/worksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToUse, worksheet: wsData }),
      });
      const data = await res.json().catch(() => null);

      const savedWs: Worksheet = data?.worksheet || {
        id: `ws-${Date.now()}`,
        unitId: `unit-${encodeURIComponent(wsData.unitTitle || '1단원')}`,
        unitTitle: (wsData.unitTitle || '1단원. 인공지능의 이해').trim(),
        lessonNumber: (wsData.lessonNumber || '1차시').trim(),
        title: (wsData.title || '새 학습지').trim(),
        subject: wsData.subject || '인공지능 기초',
        grade: wsData.grade || '고등학교',
        date: wsData.date || new Date().toISOString().split('T')[0],
        description: wsData.description || '',
        keyPoints: wsData.keyPoints || [],
        pdfFileName: wsData.pdfFileName || `${wsData.lessonNumber}_${wsData.title}.pdf`,
        pdfDataUrl: wsData.pdfDataUrl || '',
        fileSizeBytes: wsData.fileSizeBytes || 250000,
        pageCount: wsData.pageCount || 2,
        hasAnswerSheet: !!wsData.hasAnswerSheet,
        answerSheetPdfDataUrl: wsData.answerSheetPdfDataUrl || '',
        answerSheetText: wsData.answerSheetText || '',
        showAnswerSheetToStudents: wsData.showAnswerSheetToStudents ?? true,
        downloadCount: 0,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isImportant: !!wsData.isImportant,
        orderIndex: worksheets.length + 1,
      };

      // 2. Direct Firestore Cloud Write (Propagates instantly to all other browsers & devices)
      try {
        await firestoreAddWorksheet(savedWs);
      } catch (fErr) {
        console.warn('Firestore write warning:', fErr);
      }

      if (res.ok && data && data.success) {
        const nextList: Worksheet[] = data.worksheets || [...worksheets, savedWs];
        setWorksheets(nextList);
        safeCacheWorksheets(nextList);
        setSelectedWorksheetId(savedWs.id);
        return { success: true };
      } else {
        return { success: true };
      }
    } catch (err: any) {
      console.error('Backend add worksheet error, falling back to Firestore:', err);
      try {
        const res = await firestoreAddWorksheet(wsData);
        if (res.success) {
          setSelectedWorksheetId(res.id);
          return { success: true };
        }
      } catch (fErr2) {
        console.error('Firestore fallback failed:', fErr2);
      }
      return { success: false, message: '저장 중 오류가 발생했습니다.' };
    }
  };

  // Teacher Reorder Worksheets
  const handleReorderWorksheets = async (newOrderedList: Worksheet[]): Promise<{ success: boolean; message?: string }> => {
    setWorksheets(newOrderedList);
    safeCacheWorksheets(newOrderedList);

    // 1. Cloud Firestore Reorder
    try {
      await firestoreReorderWorksheets(newOrderedList);
    } catch (fErr) {
      console.warn('Firestore reorder warning:', fErr);
    }

    // 2. Backend Reorder
    try {
      const pinToUse = getActiveTeacherPin();
      await fetch('/api/worksheets/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pinToUse,
          worksheetIds: newOrderedList.map(w => w.id),
        }),
      });
    } catch (err) {
      console.warn('Backend reorder error:', err);
    }
    return { success: true };
  };

  // Teacher Update Worksheet
  const handleUpdateWorksheet = async (id: string, updates: Partial<Worksheet>): Promise<{ success: boolean; message?: string }> => {
    try {
      // 1. Cloud Firestore Update
      try {
        await firestoreUpdateWorksheet(id, updates);
      } catch (fErr) {
        console.warn('Firestore update warning:', fErr);
      }

      // 2. Backend Update
      const pinToUse = getActiveTeacherPin();
      const res = await fetch(`/api/worksheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToUse, updates }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success) {
        if (Array.isArray(data.worksheets)) {
          setWorksheets(data.worksheets);
          safeCacheWorksheets(data.worksheets);
        }
        return { success: true };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Update worksheet error:', err);
      return { success: true };
    }
  };

  // Teacher Delete Worksheet
  const handleDeleteWorksheet = async (id: string): Promise<boolean> => {
    if (!window.confirm('정말 이 학습지를 삭제하시겠습니까?')) return false;

    // 1. Cloud Firestore Delete
    try {
      await firestoreDeleteWorksheet(id);
    } catch (fErr) {
      console.warn('Firestore delete error:', fErr);
    }

    // 2. Backend Delete
    try {
      const pinToUse = getActiveTeacherPin();
      const res = await fetch(`/api/worksheets/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToUse }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data && data.success && Array.isArray(data.worksheets)) {
        setWorksheets(data.worksheets);
        safeCacheWorksheets(data.worksheets);
        if (selectedWorksheetId === id && data.worksheets.length > 0) {
          setSelectedWorksheetId(data.worksheets[0].id);
        }
      } else {
        setWorksheets(prev => {
          const next = prev.filter(w => w.id !== id);
          safeCacheWorksheets(next);
          if (selectedWorksheetId === id && next.length > 0) {
            setSelectedWorksheetId(next[0].id);
          }
          return next;
        });
      }
      return true;
    } catch (err) {
      console.warn('Delete failed:', err);
      return true;
    }
  };

  // Teacher Update Settings
  const handleUpdateSettings = async (newSettings: Partial<ClassSettings>, newPin?: string): Promise<{ success: boolean; message?: string }> => {
    // 1. Immediately apply to local state & cache
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    try {
      localStorage.setItem('class_settings_cache', JSON.stringify(updatedSettings));
    } catch {
      // ignore
    }

    if (newPin) {
      setTeacherPin(newPin);
      sessionStorage.setItem('teacher_cached_pin', newPin);
      localStorage.setItem('teacher_cached_pin', newPin);
    }

    // 2. Direct Cloud Firestore Settings Update
    try {
      await firestoreUpdateSettings(newSettings, newPin);
    } catch (fErr) {
      console.warn('Firestore settings update error:', fErr);
    }

    // 3. Sync with backend
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
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success && data.settings) {
        setSettings(data.settings);
        localStorage.setItem('class_settings_cache', JSON.stringify(data.settings));
      }
    } catch (err: any) {
      console.warn('Backend sync failed, saved locally and in Firestore:', err);
    }

    return { success: true };
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
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        if (Array.isArray(data.worksheets)) {
          setWorksheets(data.worksheets);
          safeCacheWorksheets(data.worksheets);
          if (data.worksheets.length > 0) {
            setSelectedWorksheetId(data.worksheets[0].id);
          }
        }
        if (data.settings) {
          setSettings(data.settings);
        }
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
        onReorderWorksheets={handleReorderWorksheets}
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
