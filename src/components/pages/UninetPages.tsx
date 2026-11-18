import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  BookOpen,
  Calendar,
  CalendarDays,
  Search,
  Wallet,
  Receipt,
  Edit3,
  CalendarPlus,
  ArrowLeftRight,
  Mail,
  ClipboardCheck,
  HelpCircle,
  Plane,
  Building2,
  User,
  Newspaper,
  Folder,
  Download,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Send,
  Building,
  CreditCard,
  QrCode,
  FileCheck,
  Check,
  Sparkles,
  MapPin,
  Flame,
} from 'lucide-react';
import { AttendanceCheckInPage } from '../student/AttendanceCheckInPage';
import { LiveAttendancePage } from '../teacher/LiveAttendancePage';

// ==========================================
// 1. JOURNAL PAGE (Attendance & GPS Check-In)
// ==========================================
export const JournalPage: React.FC = () => {
  const { currentUser } = useApp();

  if (currentUser?.role === 'TEACHER') {
    return <LiveAttendancePage />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E3A8A] text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Электронный журнал и фиксация посещаемости</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              Academic Journal & GPS Check-In
            </h1>
            <p className="text-xs text-blue-100 mt-1 max-w-xl">
              Журнал посещаемости занятий, отметка присутствия по геолокации в Hall 301 (BIS201) и учет 3 академических часов урока.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-xl text-center">
            <span className="text-[10px] text-blue-200 font-bold block">Текущий курс</span>
            <span className="text-sm font-extrabold text-white">BIS201 • Fall 2026</span>
          </div>
        </div>
      </div>

      <AttendanceCheckInPage />
    </div>
  );
};

// ==========================================
// 2. SYLLABUS PAGE
// ==========================================
export const SyllabusPage: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState('BIS201');

  const syllabusList: Record<string, {
    title: string;
    code: string;
    instructor: string;
    credits: number;
    hours: string;
    prerequisites: string;
    description: string;
    rubric: { item: string; weight: string; desc: string }[];
    weeks: { week: number; topic: string; practice: string }[];
  }> = {
    BIS201: {
      title: 'Basics of Information Systems',
      code: 'BIS201',
      instructor: 'Ainur Issabek, Senior Lecturer (SITE)',
      credits: 5,
      hours: 'Lectures: 30h | Labs: 30h | SIS: 90h',
      prerequisites: 'CS101 Introduction to CS',
      description: 'Foundations of corporate information systems, database architectures, enterprise software, geofencing and real-time attendance verification mechanisms in university environments.',
      rubric: [
        { item: 'Attestation 1 (Weeks 1-7)', weight: '30%', desc: 'Quizzes (10%), Lab Assignments (15%), Attendance & Class Activity (5%)' },
        { item: 'Attestation 2 (Weeks 8-14)', weight: '30%', desc: 'Midterm Project (15%), Practical Labs (10%), Attendance (5%)' },
        { item: 'Final Examination', weight: '40%', desc: 'Comprehensive theoretical and practical exam in Hall 301' },
      ],
      weeks: [
        { week: 1, topic: 'Introduction to Enterprise Information Systems & ERP', practice: 'Architecture modeling & requirements analysis' },
        { week: 2, topic: 'Relational Database Fundamentals & ERD Schema Design', practice: 'PostgreSQL schema, Primary & Foreign keys' },
        { week: 3, topic: 'Hardware, Network & Cloud Infrastructure', practice: 'Cloud hosting setup (Vercel & Supabase)' },
        { week: 4, topic: 'Security, NIST SP 800-63B Authentication & Authorization', practice: 'Password hashing, lockout, RBAC policies' },
        { week: 5, topic: 'Mobile & Location-Based Services (LBS)', practice: 'Haversine formula & GPS geofencing radius (150m)' },
        { week: 6, topic: 'API Design & Client-Server Integration', practice: 'REST APIs, JSON payloads, async state' },
        { week: 7, topic: 'Attestation 1 Review & Defense of Project Phase 1', practice: 'Team presentations & schema defense' },
        { week: 8, topic: 'Multi-hour Lesson Scheduling & Real-time Verification', practice: 'Hour slot tracking (16:00-19:00, 3 points)' },
        { week: 9, topic: 'Automated Audit Logging & Compliance Standards', practice: 'Immutable security log implementation' },
        { week: 10, topic: 'Data Analytics & At-Risk Academic Intervention', practice: 'Attendance threshold (< 80%) detection views' },
        { week: 11, topic: 'Load Testing & Concurrency Control', practice: 'Vitest 300 concurrent student simulation' },
        { week: 12, topic: 'System Integration & Deployment Automation', practice: 'Production CI/CD on Vercel with SSL' },
        { week: 13, topic: 'Project Final Polish & Usability Testing', practice: 'Cross-browser & mobile device testing' },
        { week: 14, topic: 'Attestation 2 Final Defense', practice: 'Team 39 complete portal verification' },
        { week: 15, topic: 'Final Exam Preparation & Course Wrap-up', practice: 'Sample exam review' },
      ],
    },
    DB202: {
      title: 'Database Systems & SQL',
      code: 'DB202',
      instructor: 'Miras Asubay, Assistant Professor',
      credits: 5,
      hours: 'Lectures: 30h | Labs: 30h | SIS: 90h',
      prerequisites: 'CS101, MATH101',
      description: 'Advanced relational modeling, ACID properties, indexing, query optimization, and transaction management in PostgreSQL.',
      rubric: [
        { item: 'Attestation 1', weight: '30%', desc: 'SQL Queries, Normalization, DDL/DML' },
        { item: 'Attestation 2', weight: '30%', desc: 'Indexes, Stored Procedures, Triggers' },
        { item: 'Final Examination', weight: '40%', desc: 'Practical SQL lab test' },
      ],
      weeks: [
        { week: 1, topic: 'Relational Model & Codd Rules', practice: 'PostgreSQL installation' },
        { week: 2, topic: 'SQL DDL: CREATE, ALTER, DROP', practice: 'Constraint modeling' },
        { week: 3, topic: 'Complex Joins & Aggregations', practice: 'Multi-table queries' },
        { week: 4, topic: 'Subqueries & CTEs', practice: 'Analytical reporting' },
      ],
    },
    CS101: {
      title: 'Introduction to Computer Science',
      code: 'CS101',
      instructor: 'Arman Myrzakanurov',
      credits: 6,
      hours: 'Lectures: 30h | Labs: 45h | SIS: 105h',
      prerequisites: 'None',
      description: 'Principles of computation, algorithms, data structures, and software development practices.',
      rubric: [
        { item: 'Attestation 1', weight: '30%', desc: 'Algorithm tests' },
        { item: 'Attestation 2', weight: '30%', desc: 'Data structures lab' },
        { item: 'Final Examination', weight: '40%', desc: 'Coding exam' },
      ],
      weeks: [
        { week: 1, topic: 'Binary Representation & Logic', practice: 'Bitwise operations' },
        { week: 2, topic: 'Control Structures & Functions', practice: 'Functional decomposition' },
      ],
    },
  };

  const curr = syllabusList[selectedCourse] || syllabusList.BIS201;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Course Syllabus Directory</h2>
          <p className="text-xs text-slate-500 mt-1">Official KBTU Academic Syllabi • Fall Semester 2026</p>
        </div>
        <button
          onClick={() => alert(`Скачивание официального силлабуса ${curr.code} (PDF) начато.`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D91] hover:bg-[#082B66] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Syllabus (PDF)</span>
        </button>
      </div>

      {/* Course Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['BIS201', 'DB202', 'CS101'].map((code) => (
          <button
            key={code}
            onClick={() => setSelectedCourse(code)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCourse === code
                ? 'bg-[#0B3D91] text-white shadow-xs'
                : 'bg-white border border-[#D6E2F5] text-slate-600 hover:text-[#0B3D91]'
            }`}
          >
            {code}
          </button>
        ))}
      </div>

      {/* Course Overview */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-6 shadow-xs space-y-4">
        <div className="border-b border-[#D6E2F5] pb-4">
          <span className="text-xs font-extrabold text-[#0B3D91] bg-blue-50 px-2.5 py-1 rounded-md">
            {curr.code} • {curr.credits} ECTS Credits
          </span>
          <h3 className="text-lg font-black text-[#0F1F3D] mt-2">{curr.title}</h3>
          <p className="text-xs text-slate-600 mt-1"><strong>Instructor:</strong> {curr.instructor}</p>
          <p className="text-xs text-slate-500 mt-0.5"><strong>Prerequisites:</strong> {curr.prerequisites}</p>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">{curr.description}</p>

        {/* Grading Rubric */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-[#0F1F3D] uppercase tracking-wider mb-2.5">
            Grading Policy & Evaluation Breakdown
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {curr.rubric.map((r, i) => (
              <div key={i} className="p-3 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#0F1F3D]">{r.item}</span>
                  <span className="text-xs font-extrabold text-[#0B3D91] bg-white px-2 py-0.5 rounded border border-[#D6E2F5]">
                    {r.weight}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Breakdown */}
        <div className="pt-4 border-t border-[#D6E2F5]">
          <h4 className="text-xs font-bold text-[#0F1F3D] uppercase tracking-wider mb-3">
            Weekly Schedule & Course Plan (15 Weeks)
          </h4>
          <div className="divide-y divide-slate-100 border border-[#D6E2F5] rounded-xl overflow-hidden">
            {curr.weeks.map((w) => (
              <div key={w.week} className="p-3 bg-white hover:bg-[#F5F8FD] transition-colors flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#E8F0FE] text-[#0B3D91] font-extrabold text-xs flex items-center justify-center shrink-0">
                  W{w.week}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#0F1F3D]">{w.topic}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Practice / Lab: {w.practice}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. ATTESTATION PAGE
// ==========================================
export const AttestationPage: React.FC = () => {
  const attestations = [
    {
      code: 'BIS201',
      title: 'Basics of Information Systems',
      credits: 5,
      attestation1: 28.5,
      attestation2: 27.0,
      currentTotal: 55.5,
      examMax: 40,
      predictedGrade: 'A (95.5%)',
      status: 'Admitted to Exam',
      isAdmitted: true,
    },
    {
      code: 'DB202',
      title: 'Database Systems & SQL',
      credits: 5,
      attestation1: 29.0,
      attestation2: 28.5,
      currentTotal: 57.5,
      examMax: 40,
      predictedGrade: 'A (97.5%)',
      status: 'Admitted to Exam',
      isAdmitted: true,
    },
    {
      code: 'CS101',
      title: 'Introduction to Computer Science',
      credits: 6,
      attestation1: 27.0,
      attestation2: 26.5,
      currentTotal: 53.5,
      examMax: 40,
      predictedGrade: 'A- (93.5%)',
      status: 'Admitted to Exam',
      isAdmitted: true,
    },
    {
      code: 'NET203',
      title: 'Computer Networks',
      credits: 5,
      attestation1: 25.0,
      attestation2: 26.0,
      currentTotal: 51.0,
      examMax: 40,
      predictedGrade: 'B+ (91.0%)',
      status: 'Admitted to Exam',
      isAdmitted: true,
    },
    {
      code: 'MATH101',
      title: 'Discrete Mathematics',
      credits: 5,
      attestation1: 28.0,
      attestation2: 29.0,
      currentTotal: 57.0,
      examMax: 40,
      predictedGrade: 'A (97.0%)',
      status: 'Admitted to Exam',
      isAdmitted: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Academic Attestation & Grade Points</h2>
          <p className="text-xs text-slate-500 mt-1">
            Current Semester Attestation Progress (Attestation 1: 30% • Attestation 2: 30% • Exam: 40%)
          </p>
        </div>
        <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>All 5 Courses Admitted</span>
        </div>
      </div>

      <div className="space-y-4">
        {attestations.map((item) => (
          <div key={item.code} className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D6E2F5] pb-3">
              <div>
                <span className="text-xs font-extrabold text-[#0B3D91] bg-[#E8F0FE] px-2 py-0.5 rounded">
                  {item.code} • {item.credits} ECTS
                </span>
                <h3 className="text-base font-extrabold text-[#0F1F3D] mt-1">{item.title}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {item.status}
                </span>
                <div className="text-[11px] text-slate-500 mt-1">
                  Expected Final: <strong className="text-[#0B3D91]">{item.predictedGrade}</strong>
                </div>
              </div>
            </div>

            {/* Points Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5]">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">1st Attestation</span>
                <span className="text-base font-black text-[#0B3D91]">{item.attestation1}</span>
                <span className="text-[10px] text-slate-400 block">/ 30.0 pts</span>
              </div>
              <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5]">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">2nd Attestation</span>
                <span className="text-base font-black text-[#0B3D91]">{item.attestation2}</span>
                <span className="text-[10px] text-slate-400 block">/ 30.0 pts</span>
              </div>
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold text-[#0B3D91] uppercase block">Total Pre-Exam</span>
                <span className="text-base font-black text-[#0B3D91]">{item.currentTotal}</span>
                <span className="text-[10px] text-blue-600 block">/ 60.0 pts</span>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Exam Weight</span>
                <span className="text-base font-black text-emerald-700">{item.examMax}</span>
                <span className="text-[10px] text-emerald-600 block">/ 40.0 pts</span>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Рейтинг допуска (мин. 30.0)</span>
                <span>{item.currentTotal} / 60.0 баллов ({(item.currentTotal / 60 * 100).toFixed(0)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                  style={{ width: `${(item.currentTotal / 60) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 4. COURSE MATERIALS PAGE
// ==========================================
export const CourseMaterialsPage: React.FC = () => {
  const materials = [
    { name: 'Lecture 01 — Introduction to IS & ERP Systems.pdf', course: 'BIS201', size: '3.4 MB', date: '01.09.2026' },
    { name: 'Lecture 02 — Relational Modeling & Haversine GPS Algorithm.pdf', course: 'BIS201', size: '4.8 MB', date: '08.09.2026' },
    { name: 'Lab 03 — Multi-Hour Session Check-In & Slot Tracking.zip', course: 'BIS201', size: '1.2 MB', date: '15.09.2026' },
    { name: 'Lecture 04 — NIST SP 800-63B Auth & Password Security.pdf', course: 'BIS201', size: '2.9 MB', date: '22.09.2026' },
    { name: 'Lecture 01-05 — Complete PostgreSQL & Database Design.pdf', course: 'DB202', size: '8.1 MB', date: '29.09.2026' },
    { name: 'Lab Manual 01 — Algorithms & Python Complexity.pdf', course: 'CS101', size: '2.1 MB', date: '06.10.2026' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Course Materials & Lecture Files</h2>
          <p className="text-xs text-slate-500 mt-1">Download official lectures, laboratory guides, and reading packets</p>
        </div>
        <button
          onClick={() => alert('Архив всех материалов семестра (ZIP) сформирован.')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D91] hover:bg-[#082B66] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download All (.ZIP)</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-xs divide-y divide-slate-100">
        {materials.map((m, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between hover:bg-[#F5F8FD] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B3D91] flex items-center justify-center font-bold text-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0F1F3D]">{m.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  <span className="font-bold text-[#0B3D91]">{m.course}</span> • {m.size} • Uploaded {m.date}
                </div>
              </div>
            </div>
            <button
              onClick={() => alert(`Загрузка файла: ${m.name}`)}
              className="px-3 py-1.5 text-xs font-bold text-[#0B3D91] hover:bg-blue-50 rounded-lg transition-colors border border-[#D6E2F5] cursor-pointer"
            >
              Скачать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 5. EXAM SCHEDULE PAGE
// ==========================================
export const ExamSchedulePage: React.FC = () => {
  const exams = [
    { course: 'BIS201 Basics of Information Systems', date: '14 Nov 2026', time: '10:00 – 12:00', room: 'Hall 301', type: 'Written & Project Defense', proctor: 'Ainur Issabek' },
    { course: 'DB202 Database Systems & SQL', date: '16 Nov 2026', time: '14:00 – 16:00', room: 'Computer Lab 204', type: 'Computer SQL Test', proctor: 'Miras Asubay' },
    { course: 'CS101 Introduction to Computer Science', date: '18 Nov 2026', time: '09:00 – 11:00', room: 'Auditorium 442', type: 'Written Examination', proctor: 'Arman Myrzakanurov' },
    { course: 'MATH101 Discrete Mathematics', date: '20 Nov 2026', time: '11:00 – 13:00', room: 'Hall 301', type: 'Written Examination', proctor: 'Bolat Talgatov' },
    { course: 'NET203 Computer Networks', date: '22 Nov 2026', time: '13:00 – 15:00', room: 'Lab 204', type: 'Packet Tracer Lab Exam', proctor: 'Arman Myrzakanurov' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Midterm & Final Examination Timetable</h2>
          <p className="text-xs text-slate-500 mt-1">Fall 2026 Official KBTU Exam Session • Main Campus (Tole Bi 59)</p>
        </div>
        <div className="px-3 py-1.5 bg-blue-50 text-[#0B3D91] border border-blue-200 rounded-xl text-xs font-bold">
          ID Card Required
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.map((ex, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#0B3D91] bg-[#E8F0FE] px-2 py-0.5 rounded">
                  {ex.date}
                </span>
                <h3 className="text-sm font-bold text-[#0F1F3D] mt-2">{ex.course}</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {ex.room}
              </span>
            </div>

            <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0B3D91]" />
                <span>Время экзамена: <strong>{ex.time}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#0B3D91]" />
                <span>Формат: <strong>{ex.type}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0B3D91]" />
                <span>Экзаменатор: <strong>{ex.proctor}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 6. DISCIPLINE SCHEDULE PAGE
// ==========================================
export const DisciplineSchedulePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const allDisciplines = [
    { code: 'BIS201', name: 'Basics of Information Systems', credits: 5, faculty: 'SITE', room: 'Hall 301', time: 'Mon 16:00 – 19:00', instructor: 'Ainur Issabek' },
    { code: 'DB202', name: 'Database Systems & SQL', credits: 5, faculty: 'SITE', room: 'Lab 204', time: 'Tue 14:00 – 17:00', instructor: 'Miras Asubay' },
    { code: 'CS101', name: 'Introduction to Computer Science', credits: 6, faculty: 'SITE', room: 'Aud 442', time: 'Wed 10:00 – 13:00', instructor: 'Arman Myrzakanurov' },
    { code: 'NET203', name: 'Computer Networks', credits: 5, faculty: 'SITE', room: 'Aud 442', time: 'Thu 11:00 – 14:00', instructor: 'Arman Myrzakanurov' },
    { code: 'MATH101', name: 'Discrete Mathematics', credits: 5, faculty: 'SITE', room: 'Hall 301', time: 'Fri 09:00 – 12:00', instructor: 'Ainur Issabek' },
    { code: 'FIN201', name: 'Corporate Finance', credits: 5, faculty: 'Business School', room: 'Aud 210', time: 'Wed 14:00 – 17:00', instructor: 'Dana Sadykova' },
    { code: 'ENG102', name: 'Academic English (Level B2)', credits: 3, faculty: 'General Education', room: 'Aud 118', time: 'Tue 09:00 – 12:00', instructor: 'Elena Kim' },
  ];

  const filtered = allDisciplines.filter(
    (d) =>
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.faculty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Discipline & Faculty Schedule Search</h2>
          <p className="text-xs text-slate-500 mt-1">Complete catalog of semester course offerings across KBTU</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по коду или названию..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl focus:outline-none focus:border-[#0B3D91]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Код</th>
              <th className="py-3 px-4">Дисциплина</th>
              <th className="py-3 px-4">Факультет</th>
              <th className="py-3 px-4">Время</th>
              <th className="py-3 px-4">Аудитория</th>
              <th className="py-3 px-4">Преподаватель</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <tr key={d.code} className="hover:bg-[#F5F8FD] transition-colors">
                <td className="py-3 px-4 font-extrabold text-[#0B3D91]">{d.code}</td>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{d.name}</td>
                <td className="py-3 px-4 text-slate-600">{d.faculty}</td>
                <td className="py-3 px-4 font-medium text-slate-700">{d.time}</td>
                <td className="py-3 px-4 font-mono font-bold text-slate-500">{d.room}</td>
                <td className="py-3 px-4 text-slate-700">{d.instructor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 7. FINANCIAL CABINET PAGE
// ==========================================
export const FinancialCabinetPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Финансовый кабинет студента</h2>
          <p className="text-xs text-slate-500 mt-1">Информация о гранте, договоре на обучение и состоянии расчетов</p>
        </div>
        <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
          Задолженность: 0 ₸ (Оплачено 100%)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Форма обучения</span>
          <div className="text-lg font-black text-[#0B3D91]">Государственный грант РК</div>
          <p className="text-xs text-slate-500">100% покрытие стоимости обучения МОН РК</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Номер договора</span>
          <div className="text-lg font-black text-[#0F1F3D]">KBTU-2023-SITE-1849</div>
          <p className="text-xs text-slate-500">Действует до 30.06.2027</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Стипендия</span>
          <div className="text-lg font-black text-emerald-600">47 135 ₸ / месяц</div>
          <p className="text-xs text-slate-500">Начисление каждого 25-го числа</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-[#0F1F3D]">План оплаты и взаиморасчеты (2026/2027 учебный год)</h3>
        <div className="border border-[#D6E2F5] rounded-xl overflow-hidden divide-y divide-slate-100">
          <div className="p-4 bg-[#F5F8FD] flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Период</span>
            <span>Сумма</span>
            <span>Источник</span>
            <span>Статус</span>
          </div>
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="font-bold text-[#0F1F3D]">Осенний семестр 2026</span>
            <span>1 200 000 ₸</span>
            <span className="text-slate-600">Государственный грант</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Покрыто</span>
          </div>
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="font-bold text-[#0F1F3D]">Весенний семестр 2027</span>
            <span>1 200 000 ₸</span>
            <span className="text-slate-600">Государственный грант</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Покрыто</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 8. BILLING PAGE
// ==========================================
export const BillingPage: React.FC = () => {
  const transactions = [
    { id: 'INV-9021', service: 'Проживание в Доме студентов #1 (Осень 2026)', amount: '120 000 ₸', date: '28.08.2026', method: 'Kaspi Pay QR', status: 'Оплачено' },
    { id: 'INV-8734', service: 'Залог за учебную литературу в библиотеке', amount: '15 000 ₸', date: '01.09.2026', method: 'Halyk Bank', status: 'Оплачено' },
    { id: 'INV-8120', service: 'Перевыпуск студенческой ID-карты', amount: '2 500 ₸', date: '10.10.2026', method: 'Kaspi Pay QR', status: 'Оплачено' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Billing & Invoices (Счета и оплата)</h2>
          <p className="text-xs text-slate-500 mt-1">Оплата университетских услуг, общежития и выписка электронных квитанций</p>
        </div>
        <button
          onClick={() => alert('Формирование счета на Kaspi Pay... QR-код отправлен в приложение Kaspi.')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Оплатить через Kaspi Pay</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider border-b border-[#D6E2F5]">
            <tr>
              <th className="py-3 px-4">Номер счета</th>
              <th className="py-3 px-4">Услуга / Назначение</th>
              <th className="py-3 px-4">Сумма</th>
              <th className="py-3 px-4">Дата</th>
              <th className="py-3 px-4">Способ</th>
              <th className="py-3 px-4">Статус</th>
              <th className="py-3 px-4 text-right">Чек</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-[#F5F8FD] transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-slate-600">{t.id}</td>
                <td className="py-3 px-4 font-bold text-[#0F1F3D]">{t.service}</td>
                <td className="py-3 px-4 font-black text-[#0B3D91]">{t.amount}</td>
                <td className="py-3 px-4 text-slate-500">{t.date}</td>
                <td className="py-3 px-4 text-slate-600">{t.method}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => alert(`Скачивание фискального чека ${t.id} (PDF)`)}
                    className="text-[#0B3D91] hover:underline font-bold text-xs cursor-pointer"
                  >
                    Квитанция
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 9. SCHEDULE CREATION PAGE
// ==========================================
export const ScheduleCreationPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Schedule Creation (Составление расписания)</h2>
          <p className="text-xs text-slate-500 mt-1">Интерактивный конструктор расписания на Весенний семестр 2027</p>
        </div>
        <button
          onClick={() => alert('Расписание сохранено и отправлено на валидацию эдвайзеру!')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D91] hover:bg-[#082B66] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Сохранить расписание</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Конфликтов по времени не обнаружено! Все выбранные секции не пересекаются в аудиториях.</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          В этом конструкторе вы можете выбрать удобные потоки лекций, практических занятий и лабораторных работ. Система в реальном времени проверяет пересечения по времени и количество свободных мест в группах.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-4 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-2">
            <span className="text-xs font-bold text-[#0B3D91]">BIS201 • Лекция + Лабораторная</span>
            <div className="text-xs text-slate-700">Понедельник 16:00 – 19:00 • Hall 301</div>
            <div className="text-[11px] text-slate-500">Преподаватель: Аинур Исабек (Занято 28 / 30 мест)</div>
          </div>
          <div className="p-4 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-2">
            <span className="text-xs font-bold text-[#0B3D91]">DB202 • Практика SQL</span>
            <div className="text-xs text-slate-700">Вторник 14:00 – 17:00 • Lab 204</div>
            <div className="text-[11px] text-slate-500">Преподаватель: Мирас Асубай (Занято 25 / 30 мест)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 10. ADD/DROP PAGE
// ==========================================
export const AddDropPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Период Add / Drop</h2>
          <p className="text-xs text-slate-500 mt-1">Официальный регламент добавления и исключения дисциплин</p>
        </div>
        <span className="px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
          Текущий статус: Закрыт (Доступен в начале семестра)
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-6 shadow-xs space-y-4 text-xs text-slate-700 leading-relaxed">
        <h3 className="text-sm font-bold text-[#0F1F3D]">Правила академической политики КБТУ по Add/Drop:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Период Add/Drop длится ровно <strong>первые две недели</strong> после старта семестра.</li>
          <li>В течение этого периода студент имеет право сменить элективную дисциплину или секцию без академических последствий (оценка «W» не выставляется).</li>
          <li>После окончания периода Add/Drop отказ от курса возможен только по заявлению через Деканат с фиксацией статуса Withdrawal («W»).</li>
        </ul>

        <div className="p-4 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-2">
          <div className="font-bold text-[#0F1F3D]">Подать петицию на позднее изменение дисциплин</div>
          <p className="text-slate-500">Если у вас есть уважительная причина (медицинская справка, форс-мажор), вы можете подать заявление декану факультета SITE.</p>
          <button
            onClick={() => alert('Форма подачи петиции Add/Drop отправлена в деканат SITE.')}
            className="px-3.5 py-1.5 bg-[#0B3D91] text-white font-bold rounded-lg cursor-pointer hover:bg-[#082B66]"
          >
            Подать петицию декану
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 11. REQUESTS PAGE (ЦОС / Справки)
// ==========================================
export const RequestsPage: React.FC = () => {
  const requests = [
    { id: 'REQ-10492', title: 'Справка с места учебы (с гербовой печатью)', date: '04.11.2026', status: 'Готово к скачиванию', download: true },
    { id: 'REQ-09821', title: 'Официальный транскрипт для визы / Посольства', date: '21.10.2026', status: 'Готово к скачиванию', download: true },
    { id: 'REQ-08412', title: 'Справка в военный комиссариат (Приложение 4)', date: '15.09.2026', status: 'Выдано на руки', download: false },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Requests (Центр обслуживания студентов / Заявления)</h2>
          <p className="text-xs text-slate-500 mt-1">Заказ справок с места учебы, транскриптов и официальных писем</p>
        </div>
        <button
          onClick={() => alert('Заявка на справку с места учебы успешно сформирована!')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D91] hover:bg-[#082B66] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Заказать новую справку</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-xs divide-y divide-slate-100">
        {requests.map((r) => (
          <div key={r.id} className="p-4 flex items-center justify-between hover:bg-[#F5F8FD] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B3D91] flex items-center justify-center font-bold text-xs shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0F1F3D]">{r.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{r.id} • Заказано {r.date}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                {r.status}
              </span>
              {r.download && (
                <button
                  onClick={() => alert(`Скачивание документа ${r.id} с электронной печатью КБТУ`)}
                  className="px-3 py-1 bg-[#0B3D91] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#082B66]"
                >
                  Скачать
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 12. SURVEYS PAGE
// ==========================================
export const SurveysPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Академические опросы и анкетирование (Surveys)</h2>
          <p className="text-xs text-slate-500 mt-1">Анонимная оценка качества преподавания дисциплин в КБТУ</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-6 shadow-xs space-y-4">
        <div className="p-4 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#0F1F3D]">Опрос «Преподаватель глазами студента» • Осенний семестр 2026</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Оценка курсов BIS201, DB202, CS101, NET203, MATH101</div>
          </div>
          <button
            onClick={() => alert('Форма анонимного опроса открыта. Спасибо за ваш отзыв!')}
            className="px-4 py-2 bg-[#0B3D91] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#082B66]"
          >
            Пройти опрос
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 13. ENTRY TESTS PAGE (from user screenshot 2)
// ==========================================
export const EntryTestsPage: React.FC = () => {
  const tests = [
    { title: 'English Placement Test (B2 Diagnostic)', status: 'Пройден', score: '88 / 100 (Upper-Intermediate)', date: '25.08.2026', passed: true },
    { title: 'Mathematics & Calculus Prerequisite Test', status: 'Пройден', score: '92 / 100', date: '26.08.2026', passed: true },
    { title: 'Academic Integrity & Plagiarism Awareness Quiz', status: 'Сдано 100%', score: '100 / 100', date: '01.09.2026', passed: true },
    { title: 'Health, Safety & Campus Protocol Assessment', status: 'Сдано', score: 'Зачет', date: '02.09.2026', passed: true },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-[#0B3D91] bg-blue-50 px-2 py-0.5 rounded w-fit mb-1 font-bold">
            https://uninet.kbtu.kz/student/entry-tests
          </div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Вступительные и диагностические тесты (Entry tests)</h2>
          <p className="text-xs text-slate-500 mt-1">Результаты входного тестирования, языковых и профильных экзаменов</p>
        </div>
        <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
          Все тесты успешно закрыты
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tests.map((t, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-xs font-bold text-[#0F1F3D]">{t.title}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {t.status}
              </span>
            </div>
            <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Результат:</span>
                <strong className="text-[#0B3D91]">{t.score}</strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Дата прохождения:</span>
                <span>{t.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 14. MOBILITY PAGE
// ==========================================
export const MobilityPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Академическая мобильность (Academic Mobility)</h2>
          <p className="text-xs text-slate-500 mt-1">Программы обмена студентами, стажировки и Erasmus+ с университетами-партнерами</p>
        </div>
        <button
          onClick={() => alert('Форма заявки на весенний семестр в Sejong University (Корея) открыта!')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D91] hover:bg-[#082B66] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Plane className="w-3.5 h-3.5" />
          <span>Подать заявку на обмен</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold text-[#0B3D91]">Sejong University (Корея)</span>
          <p className="text-xs text-slate-600">Сеул • Компьютерные науки и ИС • Стипендия и проживание</p>
          <div className="text-[11px] text-slate-400">Требования: GPA &gt; 3.2, IELTS &gt; 6.0</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold text-[#0B3D91]">Warsaw University of Tech (Польша)</span>
          <p className="text-xs text-slate-600">Варшава • Инженерия ПО и базы данных</p>
          <div className="text-[11px] text-slate-400">Требования: GPA &gt; 3.0, B2 English</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-2">
          <span className="text-xs font-bold text-[#0B3D91]">Riga Technical University (Латвия)</span>
          <p className="text-xs text-slate-600">Рига • Erasmus+ стипендия 850 € / месяц</p>
          <div className="text-[11px] text-slate-400">Требования: GPA &gt; 3.3, конкурсный отбор</div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 15. DORMITORY PAGE
// ==========================================
export const DormitoryPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Дом студентов КБТУ (Dormitory)</h2>
          <p className="text-xs text-slate-500 mt-1">Информация о проживании, правилах общежития и электронный пропуск</p>
        </div>
        <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
          Заселен: Дом #1, Комната 314
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-[#0F1F3D]">Данные о проживании</h3>
          <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Корпус:</span>
              <strong className="text-[#0B3D91]">Дом студентов #1 (ул. Толе би 59)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Комната:</span>
              <strong>314 (3-местная комната)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Оплата за семестр:</span>
              <strong className="text-emerald-700">120 000 ₸ (Оплачено полностью)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Комендантский час:</span>
              <strong>23:00 – 06:00</strong>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-[#0F1F3D]">Электронный пропуск турникета</h3>
          <div className="p-4 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] flex flex-col items-center justify-center space-y-2">
            <QrCode className="w-20 h-20 text-[#0B3D91]" />
            <span className="text-xs font-mono font-bold text-slate-700">PASS-21B030482-DORM1</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Активен для турникетов КБТУ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 16. USER PROFILE PAGE
// ==========================================
export const UserProfilePage: React.FC = () => {
  const { currentUser, setActivePath } = useApp();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Личный профиль студента (User profile)</h2>
          <p className="text-xs text-slate-500 mt-1">Учетные данные, корпоративная почта и академический статус</p>
        </div>
        <button
          onClick={() => setActivePath('change-password')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D91] hover:bg-[#082B66] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <span>Сменить пароль</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-[#D6E2F5] pb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#0B3D91] text-white flex items-center justify-center font-black text-2xl shadow-md">
            {currentUser?.fullName?.charAt(0) || 'S'}
          </div>
          <div>
            <h3 className="text-lg font-black text-[#0F1F3D]">{currentUser?.fullName}</h3>
            <span className="text-xs text-[#0B3D91] font-bold bg-blue-50 px-2.5 py-0.5 rounded">
              ID: {currentUser?.studentId || '21B030482'} • {currentUser?.role}
            </span>
            <p className="text-xs text-slate-500 mt-1">Школа информационных технологий и инженерии (SITE)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Корпоративный Email</span>
            <div className="font-bold text-[#0F1F3D]">{currentUser?.email || 's_niyazkhan@kbtu.kz'}</div>
          </div>
          <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Текущий GPA</span>
            <div className="font-bold text-emerald-600">{currentUser?.gpa || '3.85'} / 4.00</div>
          </div>
          <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Специальность</span>
            <div className="font-bold text-[#0F1F3D]">6B06101 Информационные системы (IS)</div>
          </div>
          <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Эдвайзер</span>
            <div className="font-bold text-[#0F1F3D]">Аинур Исабек (a_issabek@kbtu.kz)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 17. FILES PAGE
// ==========================================
export const FilesPage: React.FC = () => {
  const files = [
    { name: 'KBTU_Student_ID_Scan.pdf', size: '1.4 MB', date: '01.09.2026' },
    { name: 'BIS201_Coursework_Final_Report.docx', size: '3.8 MB', date: '05.11.2026' },
    { name: 'IELTS_Academic_Certificate.pdf', size: '890 KB', date: '15.08.2026' },
    { name: 'Dormitory_Payment_Receipt.pdf', size: '420 KB', date: '28.08.2026' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F1F3D]">Персональное хранилище файлов (Files)</h2>
          <p className="text-xs text-slate-500 mt-1">Облачное хранилище учебных работ, сертификатов и документов</p>
        </div>
        <button
          onClick={() => alert('Выберите файл для загрузки в облако КБТУ...')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3D91] hover:bg-[#082B66] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Загрузить файл</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6E2F5] overflow-hidden shadow-xs divide-y divide-slate-100">
        {files.map((f, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between hover:bg-[#F5F8FD] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B3D91] flex items-center justify-center font-bold text-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0F1F3D]">{f.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{f.size} • Загружено {f.date}</div>
              </div>
            </div>
            <button
              onClick={() => alert(`Скачивание файла: ${f.name}`)}
              className="text-[#0B3D91] hover:underline font-bold text-xs cursor-pointer"
            >
              Скачать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
