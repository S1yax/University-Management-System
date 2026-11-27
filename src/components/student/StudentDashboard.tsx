import React, { useEffect, useState } from 'react';
import { campusNow, selectSession, useApp } from '../../context/AppContext';
import { coursesApi, type AttestationItem } from '../../api/coursesApi';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  MapPin,
  TrendingUp,
  Award,
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
  Cell,
} from 'recharts';

export const StudentDashboard: React.FC = () => {
  const [attestationItems, setAttestationItems] = useState<AttestationItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const { currentUser, classSessions, attendanceRecords, setActivePath, checkSessionTime, enrollments, demoTime } = useApp();
  const studentId = currentUser?.studentId;

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    let pending = false;
    setDataLoading(true);
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await coursesApi.attestation({ studentId });
        if (!active) return;
        if (response.code !== 200) throw new Error('Could not load course assessments.');
        setAttestationItems(response.body.items);
        setDataError('');
      } catch {
        if (active) setDataError('Could not load course assessments.');
      } finally {
        pending = false;
        if (active) setDataLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [studentId]);

  const approvedEnrollments = enrollments.filter((e) => e.studentId === studentId && e.status === 'Approved');
  const totalCredits = approvedEnrollments.reduce((sum, e) => sum + e.credits, 0);
  const approvedEcts = approvedEnrollments.reduce((sum, e) => sum + (e.ectsCredits ?? e.credits), 0);
  const completedSessions = classSessions.filter((session) => session.completed);
  const recordedSessions = completedSessions.filter((session) => session.hasAttendanceRecords);
  const recordedIds = new Set(recordedSessions.map((session) => session.id));
  const presentRecords = attendanceRecords.filter((record) => recordedIds.has(record.sessionId) && record.verificationStatus === 'PRESENT');
  const scheduledHours = completedSessions.reduce((sum, session) => sum + (session.trackedHours ?? 1), 0);
  const recordedHours = recordedSessions.reduce((sum, session) => sum + (session.trackedHours ?? 1), 0);
  const attendance = recordedHours ? Math.round(100 * presentRecords.length / recordedHours) : null;
  const scheduledAttendance = scheduledHours ? Math.round(100 * presentRecords.length / scheduledHours) : null;
  const today = campusNow().date;
  const todaySession = selectSession(classSessions, demoTime);
  const upcoming = classSessions.find((session) => session.date > today);
  const featuredSession = todaySession ?? upcoming;
  const sessionTime = todaySession ? checkSessionTime(todaySession.id) : undefined;
  const canCheckIn = todaySession?.status === 'OPEN' && sessionTime?.active;
  const isCheckedIn = attendanceRecords.some((r) => r.sessionId === todaySession?.id &&
    r.hourSlot === sessionTime?.currentHourSlot && r.verificationStatus === 'PRESENT');
  const gpa = currentUser?.gpa ?? currentUser?.demoGpa;
  const isDemoGpa = currentUser?.gpa == null && currentUser?.demoGpa != null;
  const weeks = new Map<number, { present: number; total: number }>();
  for (const session of recordedSessions) {
    const week = weeks.get(session.sessionNumber) ?? { present: 0, total: 0 };
    week.total += session.trackedHours ?? 1;
    week.present += presentRecords.filter((record) => record.sessionId === session.id).length;
    weeks.set(session.sessionNumber, week);
  }
  const attendanceTrendData = [...weeks].sort(([a], [b]) => a - b).map(([week, value]) => ({
    week: 'W' + week, attendance: Math.round(100 * value.present / value.total),
  }));

// Course Grade Points Chart
const gradeData = attestationItems.map((item) => ({
  course: item.course_code,
  score: item.total ?? item.rating,
  demo: item.demo,
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
              {isDemoGpa ? 'Demo GPA' : 'Cumulative GPA'}
            </span>
            <Award className="w-5 h-5 text-[#0B3D91]" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0B3D91]">
            {gpa?.toFixed(2) ?? '—'}
          </div>
          <p className="text-[11px] text-slate-500">
            {isDemoGpa ? 'Example final grades · 4.00 scale' : gpa == null ? 'GPA not available' : 'Grading scale: 4.00'}
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
            {totalCredits} <span className="text-xl font-normal text-slate-400">credits</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {approvedEcts} approved ECTS · 21 ECTS registration limit
          </p>
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recorded Attendance
            </span>
            <MapPin className="w-5 h-5 text-[#0B3D91]" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0B3D91]">
            {attendance === null ? '—' : attendance + '%'}
          </div>
          <p className="text-[11px] text-slate-600">
            {recordedHours ? presentRecords.length + ' of ' + recordedHours + ' hours in sessions with check-ins' : 'No check-ins recorded for your completed sessions'}
          </p>
          {recordedHours < scheduledHours && <p className="text-[11px] text-slate-500">
            {completedSessions.length - recordedSessions.length} completed sessions have no check-in data.
            {' '}Across all scheduled hours: {scheduledAttendance}%.
          </p>}
        </div>
      </div>

      {/* ACTIVE SESSION HERO CARD */}
      <div className="bg-gradient-to-r from-[#0B3D91] to-[#144bb0] text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{todaySession ? 'TODAY’S LECTURE SESSION' : 'NEXT SCHEDULED LECTURE'}</span>
          </div>
          <h3 className="text-xl font-extrabold">
            {featuredSession ? featuredSession.courseCode + ' · ' + featuredSession.title : 'No upcoming lectures'}
          </h3>
          <p className="text-xs text-blue-100 flex items-center gap-3">
            {featuredSession && <span>{featuredSession.date} · {featuredSession.startTime}–{featuredSession.endTime} · {featuredSession.roomName} · {featuredSession.instructorName}</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActivePath(canCheckIn || isCheckedIn ? 'attendance-checkin' : 'schedule')}
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
              <span>{canCheckIn ? 'Check in with GPS' : 'View schedule'}</span>
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
              Recorded Attendance Trend
            </h3>
            <span className="text-[11px] font-bold text-[#0B3D91]">{attendanceTrendData.length} weeks</span>
          </div>
          {!attendanceTrendData.length ? <p className="py-6 text-sm text-slate-500">No recorded attendance to chart.</p> : <div className="h-56 w-full">
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
                <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} />
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
          </div>}
        </div>

        {/* Current Academic Scores */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F1F3D]">
              Course Performance Assessment
            </h3>
            <span className="text-[11px] font-bold text-[#0B3D91]">{gradeData.some((item) => item.demo) ? 'Includes demo scores' : 'Current Scores (100)'}</span>
          </div>
          {dataLoading ? <p role="status" className="py-6 text-sm">Loading assessments…</p> : dataError ? <p role="alert" className="py-6 text-sm text-red-700">{dataError}</p> : !gradeData.length ? <p className="py-6 text-sm text-slate-500">No grades available.</p> : <div className="h-56 w-full">
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
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {gradeData.map((item) => <Cell key={item.course} fill={item.demo ? '#5079B5' : '#0B3D91'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}
        </div>
      </div>
    </div>
  );
};
