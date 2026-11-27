import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  AlertTriangle,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export const ManagerDashboard: React.FC = () => {
  const { currentUser, setActivePath, courses, enrollments, users, t, auditLogs, getStudentAttendanceRate } = useApp();

  const totalEnrollments = enrollments.length;
  const approvedEnrollments = enrollments.filter((e) => e.status === 'Approved').length;

  const courseCapacityData = courses.map((c) => ({
    name: c.code,
    enrolled: c.enrolledCount,
    max: c.maxCapacity,
  }));

  const studentCount = users.filter((user) => user.role === 'STUDENT').length;
  const teacherCount = users.filter((user) => user.role === 'TEACHER').length;
  const approved = enrollments.filter((enrollment) => enrollment.status === 'Approved');
  const withAttendance = new Set<string>();
  const atRisk = new Set<string>();
  for (const enrollment of approved) {
    const rate = getStudentAttendanceRate(enrollment.studentId, enrollment.courseCode);
    if (rate.total) withAttendance.add(enrollment.studentId);
    if (rate.isAtRisk) atRisk.add(enrollment.studentId);
  }
  const compliant = withAttendance.size - atRisk.size;
  const attendanceDistributionData = [
    { name: 'Compliant (≥80%)', value: compliant, color: '#0B3D91' },
    { name: 'At risk (<80%)', value: atRisk.size, color: '#EF4444' },
  ];
  const finalGrades = approved.flatMap((entry) => entry.score === undefined ? [] : [entry.score]);
  const average = finalGrades.length ? (finalGrades.reduce((sum, value) => sum + value, 0) / finalGrades.length).toFixed(1) : '—';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0B3D91] mb-1">
              Academic Registrar & Management Portal
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F1F3D]">
              {currentUser?.fullName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {studentCount} students · {teacherCount} teachers
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActivePath('at-risk-attendance')}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Open At-Risk Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Courses
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0B3D91]">
            {courses.length}
          </div>
          <p className="text-[11px] text-slate-500">Academic catalog</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Student Registrations
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0F1F3D]">
            {totalEnrollments}
          </div>
          <p className="text-[11px] text-emerald-600 font-bold">{approvedEnrollments} approved · {enrollments.filter((e) => e.status === 'Pending').length} pending</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Students Below 80% Threshold
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-red-600">
            {atRisk.size}
          </div>
          <p className="text-[11px] text-red-600 font-medium">Across active courses</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-[#D6E2F5] bg-white p-5">
          <h3 className="font-bold">Academic performance</h3>
          <p className="mt-1 text-sm">Average final score {average} · {finalGrades.length} final grades</p>
          <button className="mt-2 text-sm text-[#0B3D91] underline" onClick={() => setActivePath('performance-reports')}>View performance report</button>
        </article>
        <article className="rounded-2xl border border-[#D6E2F5] bg-white p-5">
          <h3 className="font-bold">System activity</h3>
          <p className="mt-1 text-sm">{auditLogs.length} recent entries</p>
          <button className="mt-2 text-sm text-[#0B3D91] underline" onClick={() => setActivePath('audit-log')}>View audit log</button>
        </article>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Course Capacity */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F1F3D]">
              Course Capacity Utilization
            </h3>
            <span className="text-[11px] font-bold text-[#0B3D91]">Capacities</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseCapacityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F0FE" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    borderColor: '#D6E2F5',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="enrolled" fill="#0B3D91" name="Enrolled" radius={[4, 4, 0, 0]} />
                <Bar dataKey="max" fill="#D6E2F5" name="Capacity" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Compliance Pie */}
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F1F3D]">
              Academic Clearance Rate (80% Rule)
            </h3>
            <span className="text-[11px] font-bold text-emerald-600">{withAttendance.size ? Math.round(compliant / withAttendance.size * 100) + '% compliant' : 'No attendance data'}</span>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    borderColor: '#D6E2F5',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
