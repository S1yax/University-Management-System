import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Radio,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Building,
  Power,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const TeacherDashboard: React.FC = () => {
  const { currentUser, classSessions, attendanceRecords, setActivePath, toggleSessionStatus, t } = useApp();

  const activeSession = classSessions.find((s) => s.id === 'ses-8') || classSessions[7];
  const isSessionOpen = activeSession?.status === 'OPEN';

  const sessionRecords = attendanceRecords.filter((r) => r.sessionId === activeSession?.id);
  const presentCount = sessionRecords.filter((r) => r.verificationStatus === 'PRESENT').length;
  const totalStudents = 36;

  const weeklyAttendanceData = [
    { week: 'W1', present: 35, absent: 1 },
    { week: 'W2', present: 33, absent: 3 },
    { week: 'W3', present: 34, absent: 2 },
    { week: 'W4', present: 32, absent: 4 },
    { week: 'W5', present: 34, absent: 2 },
    { week: 'W6', present: 31, absent: 5 },
    { week: 'W7', present: 33, absent: 3 },
    { week: 'W8', present: presentCount, absent: totalStudents - presentCount },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0B3D91] mb-1">
              Faculty Management Console
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F1F3D]">
              {currentUser?.fullName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Department: {currentUser?.department} • BIS201 Basics of Information Systems
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActivePath('live-attendance')}
            className="px-4 py-2.5 bg-[#0B3D91] hover:bg-[#0A3278] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
          >
            <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
            <span>Open Live Attendance</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Enrolled Students
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0B3D91]">
            36
          </div>
          <p className="text-[11px] text-slate-500">BIS201 • Fall 2026 Semester</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Current Session Checked In
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0F1F3D]">
            {presentCount} <span className="text-xl font-normal text-slate-400">/ 36</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-bold">
            {Math.round((presentCount / 36) * 100)}% present in Hall 301
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Students At-Risk (&lt;80%)
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-red-600">
            2
          </div>
          <p className="text-[11px] text-red-600 font-medium">
            Mubarak Nurlybay, Amir Zholdassali
          </p>
        </div>
      </div>

      {/* ACTIVE SESSION CONTROLLER */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#0B3D91]">
                WEEK {activeSession?.sessionNumber}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  isSessionOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isSessionOpen ? 'CHECK-IN OPEN' : 'CHECK-IN CLOSED'}
              </span>
            </div>
            <h3 className="font-bold text-base text-[#0F1F3D]">
              {activeSession?.courseCode}: {activeSession?.title}
            </h3>
            <p className="text-xs text-slate-500">
              {activeSession?.roomName} • Allowed radius 150m from (43.238949, 76.889709)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleSessionStatus(activeSession.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs ${
                isSessionOpen
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isSessionOpen ? 'Close Window' : 'Open Window'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePath('live-attendance')}
              className="px-4 py-2.5 bg-[#0B3D91] hover:bg-[#0A3278] text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
            >
              Live Student Roster
            </button>
          </div>
        </div>
      </div>

      {/* ATTENDANCE RECHARTS VISUALIZATION */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F1F3D]">
            Weekly Student Attendance Distribution (BIS201)
          </h3>
          <span className="text-[11px] font-bold text-[#0B3D91]">Target &gt; 80%</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyAttendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8F0FE" />
              <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
              <YAxis domain={[0, 40]} stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  borderColor: '#D6E2F5',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="present" fill="#0B3D91" name="Present" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" fill="#D6E2F5" name="Absent" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
