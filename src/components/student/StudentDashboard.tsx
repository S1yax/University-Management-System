import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  MapPin,
  TrendingUp,
  Award,
  AlertTriangle,
  ArrowRight,
  Clock,
  Building,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const StudentDashboard: React.FC = () => {
  const { currentUser, classSessions, attendanceRecords, setActivePath, getStudentAttendanceRate, courses, enrollments, t } = useApp();

  const bisRate = currentUser
    ? getStudentAttendanceRate(currentUser.id, 'BIS201')
    : { attended: 0, total: 8, percentage: 0, isAtRisk: false };

  // Student enrollments
  const myEnrollments = enrollments.filter(
    (e) => e.studentId === currentUser?.id && e.status === 'Approved'
  );
  const totalCredits = myEnrollments.reduce((acc, curr) => acc + curr.credits, 0);

  // Active session
  const activeSession = classSessions.find((s) => s.id === 'ses-8') || classSessions[7];
  const isCheckedIn = attendanceRecords.some(
    (r) => r.sessionId === activeSession?.id && r.studentId === currentUser?.id && r.verificationStatus === 'PRESENT'
  );

  // Recharts data: Weekly Attendance Trend in shades of blue
  const attendanceTrendData = [
    { week: 'W1', attendance: 100 },
    { week: 'W2', attendance: 95 },
    { week: 'W3', attendance: 92 },
    { week: 'W4', attendance: 90 },
    { week: 'W5', attendance: 94 },
    { week: 'W6', attendance: 88 },
    { week: 'W7', attendance: 91 },
    { week: 'W8', attendance: bisRate.percentage },
  ];

  // Course Grade Points Chart
  const gradeData = myEnrollments.map((e) => ({
    course: e.courseCode,
    score: e.score || 85,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0B3D91] mb-1">
              Welcome back to WSP KBTU
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F1F3D] tracking-tight">
              {currentUser?.fullName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Student ID: <span className="font-mono font-semibold text-[#0B3D91]">{currentUser?.studentId}</span> • {currentUser?.major} (Year {currentUser?.year})
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActivePath('attendance-checkin')}
            className="px-4 py-2.5 bg-[#0B3D91] hover:bg-[#0A3278] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
          >
            <MapPin className="w-4 h-4" />
            <span>Open GPS Check-in</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* METRIC CARDS WITH LARGE NUMBERS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* GPA */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cumulative GPA
            </span>
            <Award className="w-5 h-5 text-[#0B3D91]" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0B3D91]">
            {currentUser?.gpa ? currentUser.gpa.toFixed(2) : '3.85'}
          </div>
          <p className="text-[11px] text-slate-500">
            Grading Scale: 4.00 (Honor List)
          </p>
        </div>

        {/* Credits */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Enrolled Credits
            </span>
            <BookOpen className="w-5 h-5 text-[#0B3D91]" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0F1F3D]">
            {totalCredits} <span className="text-xl font-normal text-slate-400">/ 21</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Maximum academic limit: 21 ECTS
          </p>
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              BIS201 Attendance
            </span>
            <MapPin className="w-5 h-5 text-[#0B3D91]" />
          </div>
          <div className={`text-3xl sm:text-4xl font-extrabold ${bisRate.isAtRisk ? 'text-red-600' : 'text-emerald-700'}`}>
            {bisRate.percentage}%
          </div>
          <div className="text-[11px]">
            {bisRate.isAtRisk ? (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Below 80% (Disqualification Risk)
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Above 80% Exam Threshold
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVE SESSION HERO CARD */}
      <div className="bg-gradient-to-r from-[#0B3D91] to-[#144bb0] text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>TODAY'S LECTURE SESSION</span>
          </div>
          <h3 className="text-xl font-extrabold">
            BIS201: {activeSession?.title}
          </h3>
          <p className="text-xs text-blue-100 flex items-center gap-3">
            <span>Hall 301 (Main Campus)</span>
            <span>•</span>
            <span>Monday 16:00 – 19:00</span>
            <span>•</span>
            <span>Instructor: Ainur Issabek</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActivePath('attendance-checkin')}
          className={`px-5 py-3 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all shadow-md shrink-0 ${
            isCheckedIn
              ? 'bg-emerald-500 text-white cursor-default'
              : 'bg-white text-[#0B3D91] hover:bg-[#E8F0FE]'
          }`}
        >
          {isCheckedIn ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Checked in (Present)</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              <span>Check in with GPS</span>
            </>
          )}
        </button>
      </div>

      {/* CHARTS IN SHADES OF BLUE (RECHARTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance Trend Chart */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F1F3D]">
              Attendance Consistency Trend
            </h3>
            <span className="text-[11px] font-bold text-[#0B3D91]">Weeks 1 – 8</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData}>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B3D91" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0B3D91" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F0FE" />
                <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[50, 100]} stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    borderColor: '#D6E2F5',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="attendance"
                  stroke="#0B3D91"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#blueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Academic Scores */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F1F3D]">
              Course Performance Assessment
            </h3>
            <span className="text-[11px] font-bold text-[#0B3D91]">Current Scores (100)</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F0FE" />
                <XAxis dataKey="course" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    borderColor: '#D6E2F5',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="score" fill="#0B3D91" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
