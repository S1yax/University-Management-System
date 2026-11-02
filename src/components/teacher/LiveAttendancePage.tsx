import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  Filter,
  AlertCircle,
  Building,
  ShieldCheck,
} from 'lucide-react';
import { formatDistance } from '../../utils/geo';
import { VerificationStatus } from '../../types';

export const LiveAttendancePage: React.FC = () => {
  const {
    classSessions,
    toggleSessionStatus,
    attendanceRecords,
    users,
    enrollments,
    overrideAttendance,
    createManualAttendance,
    currentUser,
    t,
  } = useApp();

  // Selected session (default to Session 8 - BIS201)
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ses-8');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'REJECTED' | 'NOT_YET'>('ALL');

  // Override Modal state
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    studentId: string;
    studentName: string;
    currentRecordId?: string;
    initialStatus: VerificationStatus | 'NOT_YET';
  }>({
    isOpen: false,
    studentId: '',
    studentName: '',
    initialStatus: 'NOT_YET',
  });

  const [overrideNewStatus, setOverrideNewStatus] = useState<VerificationStatus>('PRESENT');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const currentSession = classSessions.find((s) => s.id === selectedSessionId) || classSessions[7];

  // Enrolled students in BIS201
  const enrolledStudentIds = enrollments
    .filter((e) => e.courseCode === currentSession?.courseCode && e.status === 'Approved')
    .map((e) => e.studentId);

  const studentList = users.filter((u) => u.role === 'STUDENT' && enrolledStudentIds.includes(u.id));

  // Current session attendance records
  const sessionRecords = attendanceRecords.filter((r) => r.sessionId === currentSession?.id);

  // Present count
  const presentCount = sessionRecords.filter((r) => r.verificationStatus === 'PRESENT').length;
  const totalEnrolled = studentList.length || 36; // 36 enrolled students

  // Table rows with merged status
  const roster = studentList.map((student) => {
    const record = sessionRecords.find((r) => r.studentId === student.id);
    let status: 'PRESENT' | 'REJECTED' | 'NOT_YET' = 'NOT_YET';
    if (record) {
      if (record.verificationStatus === 'PRESENT') status = 'PRESENT';
      else if (record.verificationStatus === 'REJECTED') status = 'REJECTED';
    }
    return {
      student,
      record,
      status,
    };
  });

  // Filtered roster
  const filteredRoster = roster.filter(({ student, status }) => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ? true : status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // CSV Export
  const handleExportCSV = () => {
    if (!currentSession) return;
    const headers = [
      'Student ID',
      'Full Name',
      'Username',
      'Status',
      'Distance (m)',
      'Check-in Time',
      'Override Note',
    ];

    const rows = roster.map(({ student, record, status }) => [
      student.studentId || '',
      `"${student.fullName}"`,
      student.username,
      status,
      record ? record.distanceToCenterM : '',
      record ? record.checkInTime : '',
      record?.isOverride ? `"${record.overrideReason}"` : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Attendance_${currentSession.courseCode}_Session${currentSession.sessionNumber}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Override with REQUIRED reason
  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideError('A specific justification reason is strictly REQUIRED for audit logging.');
      return;
    }

    if (overrideModal.currentRecordId) {
      overrideAttendance(overrideModal.currentRecordId, overrideNewStatus, overrideReason.trim());
    } else {
      createManualAttendance(
        currentSession.id,
        overrideModal.studentId,
        overrideNewStatus,
        overrideReason.trim()
      );
    }

    setOverrideModal({ isOpen: false, studentId: '', studentName: '', initialStatus: 'NOT_YET' });
    setOverrideReason('');
    setOverrideError(null);
  };

  const isSessionOpen = currentSession?.status === 'OPEN';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Session Control Header */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5]">
                {currentSession?.courseCode} • Session #{currentSession?.sessionNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isSessionOpen
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Radio className={`w-3 h-3 ${isSessionOpen ? 'animate-pulse text-emerald-600' : ''}`} />
                {isSessionOpen ? 'WINDOW OPEN' : 'WINDOW CLOSED'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0F1F3D]">
              {currentSession?.title}
            </h2>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
              <span>{currentSession?.roomName} (Main Campus)</span>
              <span>•</span>
              <span>{currentSession?.dayOfWeek} 16:00 – 19:00</span>
              <span>•</span>
              <span>Radius: 150m</span>
            </div>
          </div>

          {/* Action buttons: Open/Close & Export */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => toggleSessionStatus(currentSession.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
                isSessionOpen
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isSessionOpen ? 'Close Check-in Window' : 'Open Check-in Window'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-white border border-[#D6E2F5] hover:bg-[#E8F0FE] text-[#0B3D91] font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-[#0B3D91]" />
              <span>{t('exportCsv')}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Counter & Progress Bar: e.g. "28 / 40 checked in" */}
        <div className="mt-6 pt-5 border-t border-[#D6E2F5] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#0F1F3D] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0B3D91]" />
              <span>Live Attendance Counter</span>
            </span>
            <span className="text-[#0B3D91] text-sm">
              {presentCount} / {totalEnrolled} checked in ({Math.round((presentCount / totalEnrolled) * 100)}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-[#D6E2F5]">
            <div
              className="h-full bg-[#0B3D91] rounded-full transition-all duration-500"
              style={{ width: `${(presentCount / totalEnrolled) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Roster Table with Search and Status Filter */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or ID..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#D6E2F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'PRESENT', 'REJECTED', 'NOT_YET'] as const).map((filterVal) => (
              <button
                key={filterVal}
                type="button"
                onClick={() => setStatusFilter(filterVal)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === filterVal
                    ? 'bg-[#0B3D91] text-white shadow-xs'
                    : 'bg-[#F5F8FD] text-slate-600 hover:bg-[#E8F0FE] hover:text-[#0B3D91] border border-[#D6E2F5]'
                }`}
              >
                {filterVal === 'ALL'
                  ? 'All Students'
                  : filterVal === 'PRESENT'
                  ? `Present (${roster.filter((r) => r.status === 'PRESENT').length})`
                  : filterVal === 'REJECTED'
                  ? `Rejected (${roster.filter((r) => r.status === 'REJECTED').length})`
                  : `Not yet (${roster.filter((r) => r.status === 'NOT_YET').length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Live Roster Table */}
        <div className="overflow-x-auto rounded-xl border border-[#D6E2F5]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider sticky top-0 border-b border-[#D6E2F5]">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Check-in Time</th>
                <th className="py-3 px-4">Distance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Manual Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E2F5]/70">
              {filteredRoster.map(({ student, record, status }, idx) => (
                <tr
                  key={student.id}
                  className={`transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'
                  } hover:bg-blue-50/50`}
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#0F1F3D]">{student.fullName}</div>
                    <div className="text-[11px] text-slate-500">{student.email}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    {student.studentId || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {record?.checkInTime ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {record.checkInTime.split(' ')[1]}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {record?.distanceToCenterM !== undefined ? (
                      <span className="font-semibold text-slate-700">
                        {formatDistance(record.distanceToCenterM)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {status === 'PRESENT' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {t('present')} {record?.isOverride && '(Override)'}
                      </span>
                    ) : status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        {t('rejected')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {t('notYet')}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideModal({
                          isOpen: true,
                          studentId: student.id,
                          studentName: student.fullName,
                          currentRecordId: record?.id,
                          initialStatus: status,
                        });
                        setOverrideNewStatus(status === 'PRESENT' ? 'REJECTED' : 'PRESENT');
                        setOverrideReason('');
                        setOverrideError(null);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0B3D91] hover:bg-[#E8F0FE] rounded-lg border border-[#D6E2F5] transition-colors inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Override</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Modal */}
      {overrideModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D6E2F5] shadow-2xl max-w-md w-full p-6 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6E2F5]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0B3D91]" />
                <h3 className="font-bold text-sm text-[#0F1F3D]">
                  Manual Attendance Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModal({ isOpen: false, studentId: '', studentName: '', initialStatus: 'NOT_YET' })}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="mt-4 space-y-4">
              <div>
                <span className="text-xs text-slate-500">Student:</span>
                <p className="text-sm font-bold text-[#0F1F3D]">
                  {overrideModal.studentName}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1F3D] mb-1.5">
                  New Attendance Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideNewStatus('PRESENT')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                      overrideNewStatus === 'PRESENT'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/20'
                        : 'bg-white border-[#D6E2F5] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideNewStatus('REJECTED')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                      overrideNewStatus === 'REJECTED'
                        ? 'bg-red-50 text-red-800 border-red-400 ring-2 ring-red-400/20'
                        : 'bg-white border-[#D6E2F5] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Rejected</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0F1F3D]">
                    Required Override Reason <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Written to Audit Log
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => {
                    setOverrideReason(e.target.value);
                    if (overrideError) setOverrideError(null);
                  }}
                  placeholder="e.g., Student is physically present in Hall 301, verified via student ID card due to indoor GPS glitch."
                  className="w-full p-2.5 text-xs bg-white border border-[#D6E2F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
                />
              </div>

              {overrideError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{overrideError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideModal({ isOpen: false, studentId: '', studentName: '', initialStatus: 'NOT_YET' })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#0B3D91] hover:bg-[#0A3278] text-white rounded-xl shadow-xs"
                >
                  Confirm & Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
