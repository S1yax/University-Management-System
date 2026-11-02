import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  Mail,
  Send,
  Filter,
  CheckCircle2,
  TrendingDown,
  Building,
  GraduationCap,
  BellRing,
} from 'lucide-react';

export const AtRiskAttendancePage: React.FC = () => {
  const {
    courses,
    users,
    enrollments,
    getStudentAttendanceRate,
    sendEarlyWarningNotice,
    t,
  } = useApp();

  const [selectedCourse, setSelectedCourse] = useState<string>('BIS201');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Enrolled students in selected course
  const enrolledStudents = users.filter((u) => {
    if (u.role !== 'STUDENT') return false;
    const isEnrolled = enrollments.some(
      (e) => e.studentId === u.id && e.courseCode === selectedCourse && e.status === 'Approved'
    );
    if (!isEnrolled) return false;

    if (selectedProgram !== 'ALL' && u.major !== selectedProgram) return false;
    if (selectedYear !== 'ALL' && String(u.year) !== selectedYear) return false;

    return true;
  });

  // Calculate attendance rate for each student
  const studentRates = enrolledStudents.map((student) => {
    const rate = getStudentAttendanceRate(student.id, selectedCourse);
    return {
      student,
      rate,
    };
  });

  // Filter only those at risk (< 80%)
  const atRiskList = studentRates.filter((item) => item.rate.isAtRisk);

  const handleSendNotice = (studentId: string) => {
    const res = sendEarlyWarningNotice(studentId, selectedCourse);
    if (res.success) {
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleSendAllNotices = () => {
    atRiskList.forEach((item) => {
      sendEarlyWarningNotice(item.student.id, selectedCourse);
    });
    setToastMessage(`Dispatched early-warning notices to all ${atRiskList.length} students at risk.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs text-emerald-700 font-bold hover:underline"
          >
            {t('close')}
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>ACADEMIC WARNING THRESHOLD: 80%</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0F1F3D]">
              {t('atRiskAttendance')} (15 Weekly Sessions)
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              In accordance with KBTU Academic Regulations, students who fail to maintain at least 80% attendance in lecture/practice sessions are disqualified from final examinations.
            </p>
          </div>

          {atRiskList.length > 0 && (
            <button
              type="button"
              onClick={handleSendAllNotices}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors shrink-0"
            >
              <BellRing className="w-4 h-4" />
              <span>Broadcast Notice to All ({atRiskList.length})</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-6 pt-5 border-t border-[#D6E2F5] grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Course filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl text-[#0F1F3D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            >
              {courses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Program filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Academic Program
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl text-[#0F1F3D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            >
              <option value="ALL">All Majors</option>
              <option value="Information Systems">Information Systems</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Computer Engineering">Computer Engineering</option>
            </select>
          </div>

          {/* Year filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Study Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl text-[#0F1F3D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>
        </div>
      </div>

      {/* At-Risk Students Table */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-sm text-[#0F1F3D]">
              Disqualification Candidates in {selectedCourse} ({atRiskList.length} students)
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Total Course Roster: {enrolledStudents.length}
          </span>
        </div>

        {atRiskList.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-900">
              No students at risk in this filter!
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              All enrolled students currently meet the required 80% attendance rate.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#D6E2F5]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider sticky top-0 border-b border-[#D6E2F5]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">ID / Major</th>
                  <th className="py-3 px-4">Attended / Total</th>
                  <th className="py-3 px-4">Attendance Rate</th>
                  <th className="py-3 px-4">Status Risk</th>
                  <th className="py-3 px-4 text-right">Early-Warning Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6E2F5]/70">
                {atRiskList.map(({ student, rate }, idx) => (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'
                    } hover:bg-red-50/40`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F1F3D]">{student.fullName}</div>
                      <div className="text-[11px] text-slate-500">{student.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-[#0B3D91]">
                        {student.studentId}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {student.major} (Yr {student.year})
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F1F3D]">
                      {rate.attended} of {rate.total} classes
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-red-600 text-sm">
                          {rate.percentage}%
                        </span>
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-[#D6E2F5]">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${rate.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        At Risk (&lt;80%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSendNotice(student.id)}
                        className="px-3 py-1.5 bg-[#0B3D91] hover:bg-[#0A3278] text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send early-warning email/SMS</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
