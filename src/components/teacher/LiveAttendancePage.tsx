import React, { useState, useMemo } from 'react';
import { selectSession, useApp } from '../../context/AppContext';
import { DataSourceBadge } from '../common/DataSourceBadge';
import { TestTimePicker } from '../common/TestTimePicker';
import {
  Radio,
  Power,
  Users,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  Search,
  AlertCircle,
  ShieldCheck,
  Lock,
  BookOpen,
  Calendar,
  Building,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { formatDistance } from '../../utils/geo';
import { VerificationStatus, AttendanceRecord } from '../../types';

export const LiveAttendancePage: React.FC = () => {
  const {
    classSessions,
    demoTime,
    toggleSessionStatus,
    attendanceRecords,
    users,
    enrollments,
    courses,
    overrideAttendance,
    createManualAttendance,
    currentUser,
    t,
    timeSimulationMode,
    setTimeSimulationMode,
    checkSessionTime,
  } = useApp();

  const teacherCourses = courses;
  const [courseChoice, setSelectedCourseCode] = useState('');
  const [sessionChoice, setSessionChoice] = useState('');
  const selectedCourseCode = courseChoice || teacherCourses[0]?.code || '';
  const sessions = classSessions.filter((s) => s.courseCode === selectedCourseCode);
  const currentSession = sessions.find((s) => s.id === sessionChoice)
    ?? selectSession(sessions, demoTime) ?? sessions.at(-1);
  const trackedHours = currentSession?.trackedHours ?? 1;
  const hourSlots = ([1, 2, 3] as const).slice(0, trackedHours);

  // Sorting mode: 'TIME_ASC' (who checked in first), 'NAME_ASC', 'STATUS'
  const [sortBy, setSortBy] = useState<'TIME_ASC' | 'NAME_ASC' | 'STATUS'>('TIME_ASC');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'REJECTED' | 'NOT_YET'>('ALL');

  // Time Window Check for this course session
  const sessionTimeStatus = checkSessionTime(currentSession?.id || '');

  // Override Modal state
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    studentId: string;
    studentName: string;
    hourSlot: 1 | 2 | 3;
    currentRecordId?: string;
    initialStatus: VerificationStatus | 'NOT_YET';
  }>({
    isOpen: false,
    studentId: '',
    studentName: '',
    hourSlot: 1,
    initialStatus: 'NOT_YET',
  });

  const [overrideNewStatus, setOverrideNewStatus] = useState<VerificationStatus>('PRESENT');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Each course has its own list of enrolled students!
  const enrolledStudentIds = useMemo(() => {
    return enrollments
      .filter((e) => e.courseCode === selectedCourseCode && e.status === 'Approved')
      .map((e) => e.studentId);
  }, [enrollments, selectedCourseCode]);

  const studentList = useMemo(() => {
    return users.filter((u) => u.role === 'STUDENT' && enrolledStudentIds.includes(u.id));
  }, [users, enrolledStudentIds]);

  // Attendance records for the selected session
  const sessionRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.sessionId === currentSession?.id);
  }, [attendanceRecords, currentSession]);

  // Hourly attendance count and total potential points
  const totalHourlyPointsAttended = sessionRecords.filter((r) => r.verificationStatus === 'PRESENT').length;
  const maxPossiblePoints = Math.max(1, studentList.length * trackedHours);
  const totalEnrolled = studentList.length || 1;

  // Build merged roster with 3 hourly records
  const roster = useMemo(() => {
    return studentList.map((student) => {
      const h1Record = sessionRecords.find((r) => r.studentId === student.id && (r.hourSlot || 1) === 1);
      const h2Record = sessionRecords.find((r) => r.studentId === student.id && r.hourSlot === 2);
      const h3Record = sessionRecords.find((r) => r.studentId === student.id && r.hourSlot === 3);

      const records = [h1Record, h2Record, h3Record].filter(Boolean) as AttendanceRecord[];
      const presentCount = [h1Record, h2Record, h3Record].filter((r) => r?.verificationStatus === 'PRESENT').length;

      const earliestCheckIn = records
        .map((r) => r.checkInTime)
        .filter(Boolean)
        .sort()[0] || null;

      let status: 'PRESENT' | 'REJECTED' | 'NOT_YET' = 'NOT_YET';
      if (presentCount > 0) status = 'PRESENT';
      else if (records.some((r) => r.verificationStatus === 'REJECTED')) status = 'REJECTED';

      return {
        student,
        h1Record,
        h2Record,
        h3Record,
        presentCount,
        earliestCheckIn,
        status,
        record: h1Record || records[0],
      };
    });
  }, [studentList, sessionRecords]);

  // Filtered & Sorted Roster (including "Who checked in and when")
  const filteredRoster = useMemo(() => {
    let list = roster.filter(({ student, status }) => {
      const matchesSearch =
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.studentId && student.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        student.username.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ? true : status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'TIME_ASC') {
        // Checked in students first, sorted by check-in timestamp
        if (a.earliestCheckIn && b.earliestCheckIn) {
          return a.earliestCheckIn.localeCompare(b.earliestCheckIn);
        }
        if (a.earliestCheckIn) return -1;
        if (b.earliestCheckIn) return 1;
        return a.student.fullName.localeCompare(b.student.fullName);
      }
      if (sortBy === 'NAME_ASC') {
        return a.student.fullName.localeCompare(b.student.fullName);
      }
      if (sortBy === 'STATUS') {
        // Most hours attended first
        return b.presentCount - a.presentCount;
      }
      return 0;
    });

    return list;
  }, [roster, searchQuery, statusFilter, sortBy]);

  // CSV Export
  const handleExportCSV = () => {
    if (!currentSession) return;
    const headers = [
      'Order',
      'Course',
      'Schedule',
      'Student ID',
      'Full Name',
      'Hour 1 (16:00-17:00)',
      'Hour 2 (17:00-18:00)',
      'Hour 3 (18:00-19:00)',
      'Total Marks (out of 3)',
    ];

    const rows = filteredRoster.map(({ student, h1Record, h2Record, h3Record, presentCount }, idx) => [
      idx + 1,
      currentSession.courseCode,
      `"${currentSession.dayOfWeek} ${currentSession.startTime}-${currentSession.endTime}"`,
      student.studentId || '',
      `"${student.fullName}"`,
      h1Record ? `${h1Record.verificationStatus} (${h1Record.checkInTime.split(' ')[1] || ''})` : 'NOT_YET',
      h2Record ? `${h2Record.verificationStatus} (${h2Record.checkInTime.split(' ')[1] || ''})` : 'NOT_YET',
      h3Record ? `${h3Record.verificationStatus} (${h3Record.checkInTime.split(' ')[1] || ''})` : 'NOT_YET',
      `${presentCount}/3`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Attendance_${currentSession.courseCode}_${currentSession.dayOfWeek}_Session${currentSession.sessionNumber}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Override with REQUIRED reason
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSession) return;

    if (!overrideReason.trim()) {
      setOverrideError('Обязательно укажите причину ручного изменения отметки (требование аудита).');
      return;
    }

    const result = overrideModal.currentRecordId
      ? await overrideAttendance(overrideModal.currentRecordId, overrideNewStatus, overrideReason.trim())
      : await createManualAttendance(currentSession.id, overrideModal.studentId, overrideNewStatus, overrideReason.trim(), overrideModal.hourSlot);
    if (!result?.success) {
      setOverrideError(result?.message || 'Could not save attendance.');
      return;
    }
    setOverrideModal({ isOpen: false, studentId: '', studentName: '', hourSlot: 1, initialStatus: 'NOT_YET' });
    setOverrideReason('');
    setOverrideError(null);
  };

  const isSessionOpen = currentSession?.status === 'OPEN';
  const reviewRequests = sessionRecords.filter((r) => r.verificationStatus === 'MANUAL_REVIEW');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. TEACHER SCHEDULE & COURSE SELECTOR TABS (Monday & Tuesday classes) */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6E2F5] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0B3D91]" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#0F1F3D]">
                Расписание занятий преподавателя Ainur Issabek
              </h2>
              <p className="text-xs text-slate-500">
                Choose an assigned course and a session to see its roster.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge />
            <TestTimePicker />
          </div>
          <span className="text-[11px] font-semibold bg-[#E8F0FE] text-[#0B3D91] px-2.5 py-1 rounded-full border border-[#D6E2F5]">
            {teacherCourses.length} assigned courses
          </span>
        </div>

        {/* Course Cards Toggle: Monday vs Tuesday */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {teacherCourses.map((course) => (
            <button key={course.id} type="button" onClick={() => { setSelectedCourseCode(course.code); setSessionChoice(''); }}
              className={'p-4 rounded-xl border text-left ' + (selectedCourseCode === course.code ? 'border-[#0B3D91] bg-[#E8F0FE]' : 'border-[#D6E2F5]')}>
              <span className="block text-xs font-bold text-[#0B3D91]">{course.code} · {course.title}</span>
              <span className="block text-xs text-slate-500">{course.schedule} · {course.room} · {course.enrolledCount} students</span>
            </button>
          ))}
        </div>
        {sessions.length > 0 && <label className="block text-sm">Session <select className="ml-2 rounded border p-2"
          value={currentSession?.id ?? ''} onChange={(event) => setSessionChoice(event.target.value)}>
          {sessions.map((session) => <option key={session.id} value={session.id}>{session.date} · {session.startTime}–{session.endTime}</option>)}
        </select></label>}
        {!currentSession && <p className="text-sm text-slate-500">No sessions scheduled for this course.</p>}
      </div>

      {/* 2. ACTIVE SESSION HEADER & TIME WINDOW STATUS */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5]">
                {currentSession?.courseCode} • Урок #{currentSession?.sessionNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isSessionOpen && sessionTimeStatus.active
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Radio className={`w-3 h-3 ${isSessionOpen && sessionTimeStatus.active ? 'animate-pulse text-emerald-600' : ''}`} />
                {isSessionOpen && sessionTimeStatus.active ? 'ОКНО ОТКРЫТО' : 'ОКНО ЗАКРЫТО'}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  sessionTimeStatus.active
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>
                  {sessionTimeStatus.active
                    ? `Lesson in progress (${currentSession?.dayOfWeek} ${currentSession?.startTime}–${currentSession?.endTime})`
                    : `Вне времени урока`}
                </span>
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0F1F3D]">
              {currentSession?.title}
            </h2>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {currentSession?.roomName} (Толе би, 59)
              </span>
              <span>•</span>
              <span className="font-semibold text-[#0B3D91]">
                {currentSession?.dayOfWeek} {currentSession?.startTime}–{currentSession?.endTime}
              </span>
              <span>•</span>
              <span>Радиус геозоны: 150м</span>
            </div>
          </div>

          {/* Action buttons: Open/Close & Export */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => currentSession && toggleSessionStatus(currentSession.id)}
              disabled={!currentSession && !isSessionOpen}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isSessionOpen
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isSessionOpen ? 'Закрыть окно отметки' : 'Открыть окно отметки'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white border border-[#D6E2F5] hover:bg-[#E8F0FE] text-[#0B3D91] font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#0B3D91]" />
              <span>{t('exportCsv')}</span>
            </button>
          </div>
        </div>

        {/* Warning banner if outside lesson hours */}
        {!sessionTimeStatus.active && (
          <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Внимание:</strong> Занятие {selectedCourseCode} проводится по расписанию: <strong>{currentSession?.dayOfWeek} {currentSession?.startTime}–{currentSession?.endTime}</strong>.
                Сейчас в системе: {sessionTimeStatus.currentDay} {sessionTimeStatus.currentTime}. Журнал в режиме только для чтения.
              </span>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full shrink-0">
              Только чтение
            </span>
          </div>
        )}

        {/* Counter and Attendance Progress Bar */}
        <div className="pt-3 border-t border-[#D6E2F5] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#0F1F3D] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0B3D91]" />
              <span>Почасовой счетчик присутствия для {selectedCourseCode} ({currentSession?.dayOfWeek})</span>
            </span>
            <span className="text-[#0B3D91] text-sm">
              {totalHourlyPointsAttended} из {maxPossiblePoints} часов отмечено ({Math.round((totalHourlyPointsAttended / maxPossiblePoints) * 100)}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-[#D6E2F5]">
            <div
              className="h-full bg-[#0B3D91] rounded-full transition-all duration-500"
              style={{ width: `${(totalHourlyPointsAttended / maxPossiblePoints) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. CHRONOLOGICAL ATTENDANCE ROSTER ("Кто когда отметился") */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#0F1F3D] flex items-center gap-2">
              <span>Журнал посещаемости: {selectedCourseCode}</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-[#0B3D91] rounded-full">
                {currentSession?.dayOfWeek} {currentSession?.startTime}–{currentSession?.endTime}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Показывает персональный список студентов группы и точное время отметки каждого ученика.
            </p>
          </div>

          {/* Sort & Search Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени или ID..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#D6E2F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#F5F8FD] p-1 rounded-xl border border-[#D6E2F5] text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#0B3D91] ml-1.5" />
              <button
                type="button"
                onClick={() => setSortBy('TIME_ASC')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  sortBy === 'TIME_ASC' ? 'bg-[#0B3D91] text-white shadow-xs' : 'text-slate-600 hover:text-[#0B3D91]'
                }`}
                title="Сортировать по времени: кто раньше отметился"
              >
                По времени
              </button>
              <button
                type="button"
                onClick={() => setSortBy('NAME_ASC')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  sortBy === 'NAME_ASC' ? 'bg-[#0B3D91] text-white shadow-xs' : 'text-slate-600 hover:text-[#0B3D91]'
                }`}
              >
                А–Я
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PRESENT', 'REJECTED', 'NOT_YET'] as const).map((filterVal) => (
            <button
              key={filterVal}
              type="button"
              onClick={() => setStatusFilter(filterVal)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === filterVal
                  ? 'bg-[#0B3D91] text-white shadow-xs'
                  : 'bg-[#F5F8FD] text-slate-600 hover:bg-[#E8F0FE] hover:text-[#0B3D91] border border-[#D6E2F5]'
              }`}
            >
              {filterVal === 'ALL'
                ? `Все студенты группы (${roster.length})`
                : filterVal === 'PRESENT'
                ? `Присутствуют (${roster.filter((r) => r.status === 'PRESENT').length})`
                : filterVal === 'REJECTED'
                ? `Отклонено (${roster.filter((r) => r.status === 'REJECTED').length})`
                : `Не отметились (${roster.filter((r) => r.status === 'NOT_YET').length})`}
            </button>
          ))}
        </div>

        {/* Detailed Table showing who checked in and when for each of the 3 lesson hours */}
        <div className="overflow-x-auto rounded-xl border border-[#D6E2F5]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider sticky top-0 border-b border-[#D6E2F5]">
              <tr>
                <th className="py-3 px-3 text-center w-12">№</th>
                <th className="py-3 px-4">Студент</th>
                <th className="py-3 px-3">Час 1 (16:00–17:00)</th>
                <th className="py-3 px-3">Час 2 (17:00–18:00)</th>
                <th className="py-3 px-3">Час 3 (18:00–19:00)</th>
                <th className="py-3 px-3 text-center">Итого (из 3)</th>
                <th className="py-3 px-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E2F5]/70">
              {filteredRoster.map(({ student, h1Record, h2Record, h3Record, presentCount, earliestCheckIn }, idx) => {
                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'
                    } hover:bg-blue-50/50`}
                  >
                    {/* Order / Number */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                      {earliestCheckIn ? (
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-[#0B3D91] font-bold text-[10px] inline-flex items-center justify-center">
                          #{idx + 1}
                        </span>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </td>

                    {/* Student details */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0F1F3D]">{student.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {student.studentId || student.username}
                      </div>
                    </td>

                    {/* Hour 1 (16:00 - 17:00) */}
                    <td className="py-3 px-3">
                      {h1Record?.verificationStatus === 'PRESENT' ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{h1Record.checkInTime.split(' ')[1] || '—'}</span>
                          {h1Record.isOverride && <span className="text-[9px] text-emerald-600 font-sans">(руч.)</span>}
                        </div>
                      ) : h1Record?.verificationStatus === 'REJECTED' ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>{h1Record.checkInTime.split(' ')[1] || 'Откл.'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Hour 2 (17:00 - 18:00) */}
                    <td className="py-3 px-3">
                      {h2Record?.verificationStatus === 'PRESENT' ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{h2Record.checkInTime.split(' ')[1] || '—'}</span>
                          {h2Record.isOverride && <span className="text-[9px] text-emerald-600 font-sans">(руч.)</span>}
                        </div>
                      ) : h2Record?.verificationStatus === 'REJECTED' ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>{h2Record.checkInTime.split(' ')[1] || 'Откл.'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Hour 3 (18:00 - 19:00) */}
                    <td className="py-3 px-3">
                      {h3Record?.verificationStatus === 'PRESENT' ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{h3Record.checkInTime.split(' ')[1] || '—'}</span>
                          {h3Record.isOverride && <span className="text-[9px] text-emerald-600 font-sans">(руч.)</span>}
                        </div>
                      ) : h3Record?.verificationStatus === 'REJECTED' ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>{h3Record.checkInTime.split(' ')[1] || 'Откл.'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Total points */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-bold text-xs ${
                        presentCount === trackedHours
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : presentCount === 2
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : presentCount === 1
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {presentCount} / {trackedHours}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const initialHour: 1 | 2 | 3 = (sessionTimeStatus.currentHourSlot || 1);
                          const activeRec = initialHour === 1 ? h1Record : initialHour === 2 ? h2Record : h3Record;
                          setOverrideModal({
                            isOpen: true,
                            studentId: student.id,
                            studentName: student.fullName,
                            hourSlot: initialHour,
                            currentRecordId: activeRec?.id,
                            initialStatus: activeRec?.verificationStatus || 'NOT_YET',
                          });
                          setOverrideNewStatus(activeRec?.verificationStatus === 'PRESENT' ? 'REJECTED' : 'PRESENT');
                          setOverrideReason('');
                          setOverrideError(null);
                        }}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 cursor-pointer ${
                          sessionTimeStatus.active
                            ? 'text-[#0B3D91] hover:bg-[#E8F0FE] border-[#D6E2F5]'
                            : 'text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={!sessionTimeStatus.active ? 'Отметку можно ставить только во время урока' : 'Поставить/изменить отметку'}
                      >
                        {!sessionTimeStatus.active ? <Lock className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        <span>{sessionTimeStatus.active ? 'Отметка' : 'Вне урока'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <section className="rounded-2xl border border-[#D6E2F5] bg-white p-5">
        <h3 className="font-bold">Manual review requests</h3>
        {!reviewRequests.length && <p className="mt-2 text-sm text-slate-500">No pending reviews for this session.</p>}
        {reviewRequests.map((record) => <article key={record.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
          <span>{record.studentName} · Hour {record.hourSlot} · {record.manualReviewNote}</span>
          <button type="button" className="font-semibold text-[#0B3D91] underline" onClick={() => {
            setOverrideModal({ isOpen: true, studentId: record.studentId, studentName: record.studentName,
              hourSlot: record.hourSlot ?? 1, currentRecordId: record.id, initialStatus: 'MANUAL_REVIEW' });
            setOverrideNewStatus('PRESENT');
            setOverrideReason('');
            setOverrideError(null);
          }}>Review attendance</button>
        </article>)}
      </section>

      {/* Manual Override Modal with Hour Selection */}
      {overrideModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D6E2F5] shadow-2xl max-w-md w-full p-6 animate-scaleUp space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6E2F5]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0B3D91]" />
                <h3 className="font-bold text-sm text-[#0F1F3D]">
                  Manual attendance override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModal({ isOpen: false, studentId: '', studentName: '', hourSlot: 1, initialStatus: 'NOT_YET' })}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>


            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500">Студент:</span>
                <p className="text-sm font-bold text-[#0F1F3D]">
                  {overrideModal.studentName}
                </p>
                <span className="text-[11px] text-[#0B3D91] font-semibold">
                  Предмет: {selectedCourseCode} ({currentSession?.dayOfWeek} {currentSession?.startTime}–{currentSession?.endTime})
                </span>
              </div>

              {/* Hour Slot Switcher (Hour 1, 2, or 3) */}
              <div>
                <label className="block text-xs font-bold text-[#0F1F3D] mb-1.5">
                  Выберите час занятия для выставления отметки
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {hourSlots.map((slot) => {
                    const studentRecordForSlot = sessionRecords.find(
                      (r) => r.studentId === overrideModal.studentId && (r.hourSlot || 1) === slot
                    );
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setOverrideModal((prev) => ({
                            ...prev,
                            hourSlot: slot,
                            currentRecordId: studentRecordForSlot?.id,
                          }));
                          setOverrideNewStatus(studentRecordForSlot?.verificationStatus === 'PRESENT' ? 'REJECTED' : 'PRESENT');
                        }}
                        className={`py-2 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                          overrideModal.hourSlot === slot
                            ? 'bg-[#0B3D91] text-white border-[#0B3D91] shadow-xs'
                            : 'bg-[#F5F8FD] text-slate-700 border-[#D6E2F5] hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold text-xs">Час {slot}</div>
                        <div className="text-[9px] opacity-90">
                          {currentSession?.startTime}–{currentSession?.endTime}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1F3D] mb-1.5">
                  Статус для Часа {overrideModal.hourSlot}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideNewStatus('PRESENT')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      overrideNewStatus === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#F5F8FD] text-slate-700 hover:bg-slate-100 border border-[#D6E2F5]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Присутствует</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideNewStatus('REJECTED')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      overrideNewStatus === 'REJECTED'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-[#F5F8FD] text-slate-700 hover:bg-slate-100 border border-[#D6E2F5]'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Отклонено</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1F3D] mb-1.5">
                  Обязательная причина изменения (для журнала аудита) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => {
                    setOverrideReason(e.target.value);
                    if (overrideError) setOverrideError(null);
                  }}
                  placeholder="Например: Студент лично присутствует на занятии в аудитории..."
                  className="w-full p-2.5 text-xs bg-white border border-[#D6E2F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
                />
              </div>

              {overrideError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{overrideError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D6E2F5]">
                <button
                  type="button"
                  onClick={() => setOverrideModal({ isOpen: false, studentId: '', studentName: '', hourSlot: 1, initialStatus: 'NOT_YET' })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!currentSession}
                  className="px-4 py-2 text-xs font-bold bg-[#0B3D91] hover:bg-[#0A3278] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {sessionTimeStatus.active ? 'Сохранить (Записать в аудит)' : 'Заблокировано по времени'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
