import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Calendar,
  GraduationCap,
  PlusCircle,
  MessageSquare,
  Star,
  Newspaper,
  FileSpreadsheet,
  Users,
  FlaskConical,
  UserCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Clock,
  Building,
  Award,
  Search,
  Filter,
  Send,
  Download,
  AlertCircle,
  MapPin,
  Check,
} from 'lucide-react';
import { NEWS_ITEMS, MESSAGES } from '../../data/mockData';

// MY COURSES PAGE
export const MyCoursesPage: React.FC = () => {
  const { courses, enrollments, currentUser } = useApp();
  const myCourses = courses.filter((c) =>
    currentUser?.role === 'TEACHER'
      ? c.instructorId === currentUser.id
      : enrollments.some((e) => e.studentId === currentUser?.id && e.courseCode === c.code)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">My Enrolled Courses</h2>
        <p className="text-xs text-slate-500 mt-1">Fall 2026 Academic Semester • KBTU SITE</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {myCourses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-3 hover:border-[#0B3D91] transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#0B3D91]">
                  {c.code} • {c.credits} ECTS
                </span>
                <h3 className="font-extrabold text-base text-[#0F1F3D] mt-2">{c.title}</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">{c.room}</span>
            </div>

            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{c.description}</p>

            <div className="pt-3 border-t border-[#D6E2F5] flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0B3D91]" />
                {c.schedule}
              </span>
              <span>Instructor: <strong className="text-[#0F1F3D]">{c.instructorName}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// SCHEDULE PAGE
export const SchedulePage: React.FC = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timetable = [
    { day: 'Monday', time: '16:00 – 19:00', course: 'BIS201 Basics of Information Systems', room: 'Hall 301', teacher: 'Ainur Issabek' },
    { day: 'Tuesday', time: '14:00 – 17:00', course: 'DB202 Database Systems & SQL', room: 'Computer Lab 204', teacher: 'Miras Asubay' },
    { day: 'Wednesday', time: '10:00 – 13:00', course: 'CS101 Introduction to Computer Science', room: 'Auditorium 442', teacher: 'Arman Myrzakanurov' },
    { day: 'Thursday', time: '11:00 – 14:00', course: 'NET203 Computer Networks', room: 'Auditorium 442', teacher: 'Arman Myrzakanurov' },
    { day: 'Friday', time: '09:00 – 12:00', course: 'MATH101 Discrete Mathematics', room: 'Hall 301', teacher: 'Ainur Issabek' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Weekly Academic Timetable</h2>
        <p className="text-xs text-slate-500 mt-1">Fall 2026 • Main Campus (Tole Bi 59)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {days.map((day) => {
          const item = timetable.find((t) => t.day === day);
          return (
            <div key={day} className="bg-white rounded-xl border border-[#D6E2F5] p-4 shadow-sm space-y-3">
              <div className="font-extrabold text-xs text-[#0B3D91] uppercase tracking-wider pb-2 border-b border-[#D6E2F5]">
                {day}
              </div>
              {item ? (
                <div className="p-3 bg-[#F5F8FD] rounded-lg border border-[#D6E2F5] space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#0B3D91]" /> {item.time}
                  </span>
                  <div className="font-bold text-xs text-[#0F1F3D] leading-tight">
                    {item.course}
                  </div>
                  <div className="text-[11px] text-[#0B3D91] font-medium flex items-center gap-1">
                    <Building className="w-3 h-3" /> {item.room}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {item.teacher}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-6 text-center italic">
                  No classes
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// GRADES & TRANSCRIPT PAGE
export const GradesTranscriptPage: React.FC = () => {
  const { currentUser, enrollments } = useApp();
  const myGrades = enrollments.filter((e) => e.studentId === currentUser?.id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F1F3D]">Academic Transcript & Grades</h2>
          <p className="text-xs text-slate-500 mt-1">Official Electronic Transcript • Cumulative GPA: <strong>{currentUser?.gpa || '3.85'}</strong></p>
        </div>
        <div className="px-4 py-2 bg-[#E8F0FE] text-[#0B3D91] font-bold text-xs rounded-xl border border-[#D6E2F5]">
          Status: Good Standing (Honor Roll)
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Course</th>
              <th className="py-3 px-4">Semester</th>
              <th className="py-3 px-4">Credits</th>
              <th className="py-3 px-4">Points</th>
              <th className="py-3 px-4">Letter Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6E2F5]/70">
            {myGrades.map((g, idx) => (
              <tr key={g.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'}>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{g.courseCode}</td>
                <td className="py-3 px-4 text-slate-600">{g.semester}</td>
                <td className="py-3 px-4 font-semibold">{g.credits} ECTS</td>
                <td className="py-3 px-4 font-bold text-[#0B3D91]">{g.score || 90}/100</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded font-extrabold bg-blue-50 text-[#0B3D91] border border-blue-200">
                    {g.grade || 'A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// COURSE REGISTRATION PAGE
export const CourseRegistrationPage: React.FC = () => {
  const { courses, enrollments, currentUser } = useApp();
  const [registered, setRegistered] = useState<string[]>(['BIS201', 'CS101', 'DB202', 'NET203', 'MATH101']);

  const handleRegister = (code: string) => {
    if (!registered.includes(code)) {
      setRegistered([...registered, code]);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F1F3D]">Course Registration Portal</h2>
          <p className="text-xs text-slate-500 mt-1">Maximum 21 ECTS per semester • Priority window active</p>
        </div>
        <div className="text-xs font-bold text-[#0B3D91] bg-[#E8F0FE] px-3 py-1.5 rounded-xl border border-[#D6E2F5]">
          Credits Selected: {registered.length * 3} / 21
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((c) => {
          const isReg = registered.includes(c.code);
          return (
            <div key={c.id} className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#0B3D91]">
                    {c.code} • {c.credits} Credits
                  </span>
                  <h3 className="font-extrabold text-sm text-[#0F1F3D] mt-1.5">{c.title}</h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">{c.enrolledCount}/{c.maxCapacity} Seats</span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
              <div className="pt-3 border-t border-[#D6E2F5] flex items-center justify-between">
                <span className="text-xs text-slate-500">Instructor: <strong>{c.instructorName}</strong></span>
                <button
                  type="button"
                  onClick={() => handleRegister(c.code)}
                  disabled={isReg}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isReg
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                      : 'bg-[#0B3D91] hover:bg-[#0A3278] text-white shadow-xs'
                  }`}
                >
                  {isReg ? 'Registered' : 'Register Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// MESSAGES PAGE
export const MessagesPage: React.FC = () => {
  const [messagesList, setMessagesList] = useState(MESSAGES);
  const [selectedMsg, setSelectedMsg] = useState(messagesList[0]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Academic Communication Center</h2>
        <p className="text-xs text-slate-500 mt-1">Official notices, faculty communication & administrative memos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-sm min-h-[450px]">
        {/* Inbox list */}
        <div className="border-r border-[#D6E2F5] divide-y divide-[#D6E2F5]/70 overflow-y-auto">
          {messagesList.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedMsg(m)}
              className={`p-4 text-xs cursor-pointer transition-colors ${
                selectedMsg.id === m.id ? 'bg-[#E8F0FE]' : 'hover:bg-[#F5F8FD]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B3D91]">{m.sender}</span>
                <span className="text-[10px] text-slate-400">{m.date.split(' ')[0]}</span>
              </div>
              <p className="font-semibold text-[#0F1F3D] mt-1 truncate">{m.subject}</p>
              <p className="text-slate-500 text-[11px] truncate mt-0.5">{m.content}</p>
            </div>
          ))}
        </div>

        {/* Message View */}
        <div className="md:col-span-2 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="pb-3 border-b border-[#D6E2F5]">
              <h3 className="font-extrabold text-base text-[#0F1F3D]">{selectedMsg.subject}</h3>
              <p className="text-xs text-slate-500 mt-1">
                From: <strong>{selectedMsg.sender}</strong> ({selectedMsg.senderRole}) • {selectedMsg.date}
              </p>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{selectedMsg.content}</p>
          </div>

          <div className="pt-4 border-t border-[#D6E2F5] flex justify-end gap-2">
            <input
              type="text"
              placeholder="Type a quick reply to faculty..."
              className="flex-1 h-9 px-3 text-xs bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
            <button className="px-4 py-2 bg-[#0B3D91] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs">
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// TEACHER RATINGS PAGE
export const TeacherRatingsPage: React.FC = () => {
  const [rated, setRated] = useState<Record<string, number>>({ 'Ainur Issabek': 5, 'Arman Myrzakanurov': 5 });
  const teachers = ['Ainur Issabek (BIS201)', 'Arman Myrzakanurov (CS101)', 'Miras Asubay (DB202)'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Faculty Evaluation & Teacher Ratings</h2>
        <p className="text-xs text-slate-500 mt-1">Anonymous student feedback for Fall 2026 course quality</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {teachers.map((tName) => (
          <div key={tName} className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-[#0F1F3D]">{tName}</h3>
            <p className="text-xs text-slate-500">Rate pedagogical quality, lecture clarity, and fairness.</p>
            <div className="flex gap-1.5 pt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRated({ ...rated, [tName]: star })}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform"
                >
                  <Star className="w-5 h-5 fill-amber-400" />
                </button>
              ))}
            </div>
            <span className="text-xs text-emerald-700 font-bold block pt-1">
              ✓ Rating Submitted: {rated[tName] || 5}/5
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// NEWS PAGE
export const NewsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">KBTU Official News Feed</h2>
        <p className="text-xs text-slate-500 mt-1">Announcements, academic deadlines & campus events</p>
      </div>

      <div className="space-y-4">
        {NEWS_ITEMS.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded-full font-bold bg-[#E8F0FE] text-[#0B3D91]">
                {item.category}
              </span>
              <span className="text-slate-400 font-medium">{item.date}</span>
            </div>
            <h3 className="font-extrabold text-base text-[#0F1F3D]">{item.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{item.summary}</p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-[#D6E2F5]">
              Published by: {item.author}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// GRADEBOOK PAGE (Teacher)
export const GradebookPage: React.FC = () => {
  const { users, enrollments } = useApp();
  const students = users.filter((u) => u.role === 'STUDENT');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F1F3D]">Electronic Gradebook (BIS201)</h2>
          <p className="text-xs text-slate-500 mt-1">Fall 2026 • Instructor: Ainur Issabek</p>
        </div>
        <button className="px-4 py-2 bg-white border border-[#D6E2F5] text-[#0B3D91] font-bold text-xs rounded-xl flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Gradebook
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Student ID</th>
              <th className="py-3 px-4">Assignments (30%)</th>
              <th className="py-3 px-4">Midterm (30%)</th>
              <th className="py-3 px-4">Total Score</th>
              <th className="py-3 px-4">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6E2F5]/70">
            {students.map((s, idx) => (
              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'}>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{s.fullName}</td>
                <td className="py-3 px-4 font-mono text-slate-600">{s.studentId}</td>
                <td className="py-3 px-4">28/30</td>
                <td className="py-3 px-4">27/30</td>
                <td className="py-3 px-4 font-bold text-[#0B3D91]">
                  {s.username === 's_nurlybay' ? '72' : s.username === 's_zholdassali' ? '74' : '94'}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded font-bold bg-blue-50 text-[#0B3D91] border border-blue-200">
                    {s.username === 's_nurlybay' ? 'C+' : s.username === 's_zholdassali' ? 'C+' : 'A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// LESSONS PAGE (Teacher)
export const LessonsPage: React.FC = () => {
  const { classSessions } = useApp();
  const bisSessions = classSessions.filter((s) => s.courseCode === 'BIS201');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">15-Week Syllabus & Lesson Plan (BIS201)</h2>
        <p className="text-xs text-slate-500 mt-1">Hall 301 • Mondays 16:00 – 19:00 • Allowed Radius 150m</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {bisSessions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-[#D6E2F5] p-4 shadow-sm flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#0B3D91]">
                WEEK {s.sessionNumber}
              </span>
              <h4 className="font-bold text-xs text-[#0F1F3D]">{s.title}</h4>
              <p className="text-[11px] text-slate-500">{s.date} • {s.startTime}–{s.endTime} • {s.roomName}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// STUDENTS PAGE (Teacher)
export const StudentsPage: React.FC = () => {
  const { users } = useApp();
  const students = users.filter((u) => u.role === 'STUDENT');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Enrolled Student Roster (BIS201)</h2>
        <p className="text-xs text-slate-500 mt-1">Class of Fall 2026 • 36 Total Registered Students</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Full Name</th>
              <th className="py-3 px-4">Student ID</th>
              <th className="py-3 px-4">Major</th>
              <th className="py-3 px-4">Year</th>
              <th className="py-3 px-4">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6E2F5]/70">
            {students.map((s, idx) => (
              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'}>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{s.fullName}</td>
                <td className="py-3 px-4 font-mono font-semibold text-[#0B3D91]">{s.studentId}</td>
                <td className="py-3 px-4 text-slate-600">{s.major}</td>
                <td className="py-3 px-4">Year {s.year}</td>
                <td className="py-3 px-4 text-slate-500">{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// RESEARCH PAGE (Teacher)
export const ResearchPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F1F3D]">Faculty Scientific Research & Publications</h2>
          <p className="text-xs text-slate-500 mt-1">Scopus / Web of Science Indexing & Citation Indices</p>
        </div>
        <div className="px-4 py-2 bg-[#E8F0FE] text-[#0B3D91] font-bold text-xs rounded-xl border border-[#D6E2F5]">
          Faculty h-index: <strong>14</strong> • Citations: <strong>680</strong>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0B3D91]">
            IEEE Transactions on Learning Technologies (2026)
          </span>
          <h3 className="font-extrabold text-sm text-[#0F1F3D]">
            Geolocation-Based Continuous Attendance Authentication in Massive Lecture Theatres
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Co-authored by Ainur Issabek and KBTU SITE researchers on Haversine geofencing and Wi-Fi multipath mitigation.
          </p>
        </div>
      </div>
    </div>
  );
};

// COURSES CATALOG (Manager / Admin)
export const CoursesCatalogPage: React.FC = () => {
  const { courses } = useApp();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">University Course Catalog</h2>
        <p className="text-xs text-slate-500 mt-1">Curriculum registry, instructor assignments & maximum seat allocations</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Credits</th>
              <th className="py-3 px-4">Instructor</th>
              <th className="py-3 px-4">Capacity</th>
              <th className="py-3 px-4">Room</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6E2F5]/70">
            {courses.map((c, idx) => (
              <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'}>
                <td className="py-3 px-4 font-bold text-[#0B3D91]">{c.code}</td>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{c.title}</td>
                <td className="py-3 px-4 font-semibold">{c.credits} ECTS</td>
                <td className="py-3 px-4">{c.instructorName}</td>
                <td className="py-3 px-4 font-semibold text-slate-700">{c.enrolledCount}/{c.maxCapacity}</td>
                <td className="py-3 px-4 text-slate-600">{c.room}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ENROLLMENTS PAGE (Manager)
export const EnrollmentsPage: React.FC = () => {
  const { enrollments } = useApp();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Registrations & Enrollments Queue</h2>
        <p className="text-xs text-slate-500 mt-1">Academic Registrar validation against prerequisites and credit caps</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Course</th>
              <th className="py-3 px-4">Semester</th>
              <th className="py-3 px-4">Credits</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6E2F5]/70">
            {enrollments.map((e, idx) => (
              <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'}>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{e.studentName}</td>
                <td className="py-3 px-4 font-bold text-[#0B3D91]">{e.courseCode}</td>
                <td className="py-3 px-4 text-slate-600">{e.semester}</td>
                <td className="py-3 px-4">{e.credits} ECTS</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// PERFORMANCE REPORTS PAGE (Manager)
export const PerformanceReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Academic Performance Analytics</h2>
        <p className="text-xs text-slate-500 mt-1">Departmental GPA distributions, passing ratios, and retention rates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">Average School GPA</span>
          <div className="text-3xl font-extrabold text-[#0B3D91]">3.42</div>
          <p className="text-[11px] text-emerald-600 font-bold">+0.12 vs Fall 2025</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">Exam Clearance Ratio</span>
          <div className="text-3xl font-extrabold text-emerald-700">94.4%</div>
          <p className="text-[11px] text-slate-500">Met 80% attendance requirement</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500">Early Warnings Issued</span>
          <div className="text-3xl font-extrabold text-red-600">2</div>
          <p className="text-[11px] text-slate-500">Immediate advisor intervention</p>
        </div>
      </div>
    </div>
  );
};

// MENTORS PAGE (Manager)
export const MentorsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Academic Advisors & Mentors</h2>
        <p className="text-xs text-slate-500 mt-1">Cohort advising assignments and student support groups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#0B3D91]">Advisor</span>
          <h3 className="font-extrabold text-sm text-[#0F1F3D]">Ainur Issabek</h3>
          <p className="text-xs text-slate-600">Advisor for Information Systems 2nd Year Cohort (Groups IS-2401 to IS-2404).</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#0B3D91]">Advisor</span>
          <h3 className="font-extrabold text-sm text-[#0F1F3D]">Arman Myrzakanurov</h3>
          <p className="text-xs text-slate-600">Advisor for Computer Science & Software Engineering 1st Year Cohort.</p>
        </div>
      </div>
    </div>
  );
};

// USERS MANAGEMENT PAGE (Admin)
export const UsersPage: React.FC = () => {
  const { users } = useApp();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">User Accounts & Directory</h2>
        <p className="text-xs text-slate-500 mt-1">Identity directory for KBTU students, faculty, and administrative staff</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Full Name</th>
              <th className="py-3 px-4">Username</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Department / ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6E2F5]/70">
            {users.map((u, idx) => (
              <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'}>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{u.fullName}</td>
                <td className="py-3 px-4 font-mono font-bold text-[#0B3D91]">{u.username}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'TEACHER' ? 'bg-amber-100 text-amber-800' :
                    u.role === 'MANAGER' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">{u.email}</td>
                <td className="py-3 px-4 text-slate-500">{u.studentId || u.department || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ROLES & PERMISSIONS PAGE (Admin)
export const RolesPermissionsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Role-Based Access Control (RBAC) Matrix</h2>
        <p className="text-xs text-slate-500 mt-1">Strict isolation policy: Students cannot access Teacher or Admin routes (403 Enforcement)</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Permission / Resource</th>
              <th className="py-3 px-4 text-center">STUDENT</th>
              <th className="py-3 px-4 text-center">TEACHER</th>
              <th className="py-3 px-4 text-center">MANAGER</th>
              <th className="py-3 px-4 text-center">ADMIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6E2F5]/70">
            {[
              { name: 'Perform GPS Check-in', s: true, t: false, m: false, a: false },
              { name: 'Open / Close Session Window', s: false, t: true, m: false, a: true },
              { name: 'Teacher Manual Attendance Override', s: false, t: true, m: false, a: true },
              { name: 'Send Early-Warning Alerts', s: false, t: false, m: true, a: true },
              { name: 'View Audit Log Trail', s: false, t: false, m: false, a: true },
              { name: 'Manage System Geofence Nodes', s: false, t: false, m: false, a: true },
              { name: 'View Team 39 Project Docs', s: true, t: true, m: true, a: true },
            ].map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'}>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{row.name}</td>
                <td className="py-3 px-4 text-center">{row.s ? '✓' : '—'}</td>
                <td className="py-3 px-4 text-center">{row.t ? '✓' : '—'}</td>
                <td className="py-3 px-4 text-center">{row.m ? '✓' : '—'}</td>
                <td className="py-3 px-4 text-center font-bold text-[#0B3D91]">{row.a ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// APPLICATIONS PAGE (Admin)
export const ApplicationsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Administrative Student Applications</h2>
        <p className="text-xs text-slate-500 mt-1">Dormitory requests, official certificate generation, and leave approvals</p>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-[#D6E2F5] p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0B3D91]">Academic Certificate</span>
            <h4 className="font-bold text-xs text-[#0F1F3D] mt-1">Official Enrollment Verification for Saniya Niyazkhan</h4>
            <p className="text-[11px] text-slate-500">Requested 2026-10-31 • Signed with KBTU Digital Seal</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Processed
          </span>
        </div>
      </div>
    </div>
  );
};

// SYSTEM SETTINGS PAGE (Admin)
export const SystemSettingsPage: React.FC = () => {
  const [radius, setRadius] = useState(150);
  const [lat, setLat] = useState('43.238949');
  const [lng, setLng] = useState('76.889709');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">System Settings & Campus Geofence Configuration</h2>
        <p className="text-xs text-slate-500 mt-1">Manage global GPS parameters, centroid coordinates, and allowed radius</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-[#0F1F3D] mb-1">
              Campus Allowed Radius (Meters)
            </label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full h-10 px-3 bg-white border border-[#D6E2F5] rounded-xl text-xs font-bold text-[#0B3D91]"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default: 150m for Hall 301 and surrounding lecture halls.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F1F3D] mb-1">
                Centroid Latitude
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#D6E2F5] rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F1F3D] mb-1">
                Centroid Longitude
              </label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#D6E2F5] rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F1F3D] mb-1">
              Wi-Fi AP Verification (Week 10 Ready)
            </label>
            <input
              type="text"
              defaultValue="KBTU-STUDENT-AP-301; KBTU-STUDENT-AP-442"
              className="w-full h-10 px-3 bg-slate-50 border border-[#D6E2F5] rounded-xl text-xs font-mono text-slate-700"
              readOnly
            />
          </div>

          {saved && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
              ✓ Geofence configurations persisted successfully!
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#0B3D91] hover:bg-[#0A3278] text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Save Geofence Settings
          </button>
        </form>
      </div>
    </div>
  );
};
