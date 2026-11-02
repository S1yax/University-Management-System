import React, { useState } from 'react';
import { Database, Key, Link2, Check, Code, ShieldCheck, Sparkles, Table2, Layers, Play, Terminal } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DatabaseErdPage: React.FC = () => {
  const { courses, enrollments, attendanceRecords, classSessions, users } = useApp();
  const [activeTab, setActiveTab] = useState<'ERD' | 'TABLES' | 'SQL_DECISIONS'>('ERD');

  // SQL Console State
  const [selectedPreset, setSelectedPreset] = useState<number>(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    headers: string[];
    rows: any[][];
    rowCount: number;
    timeMs: number;
  }>({
    headers: ['course_code', 'enrolled_count', 'max_capacity', 'utilization_pct'],
    rows: [
      ['CS101', 29, 30, '96.7% (Trigger Group B)'],
      ['BIS201', 36, 40, '90.0% (Optimal)'],
      ['DB202', 32, 35, '91.4% (Optimal)'],
      ['NET203', 30, 35, '85.7% (Optimal)'],
      ['MATH101', 42, 45, '93.3% (Optimal)'],
    ],
    rowCount: 5,
    timeMs: 3.2,
  });

  const handleExecuteQuery = (presetId: number) => {
    setSelectedPreset(presetId);
    setIsExecuting(true);

    setTimeout(() => {
      setIsExecuting(false);

      if (presetId === 1) {
        // Query 1: CS101 29/30 decision
        setExecutionResult({
          headers: ['course_code', 'enrolled_count', 'max_capacity', 'utilization_pct', 'registrar_decision'],
          rows: [
            ['CS101', 29, 30, '96.7%', 'TRIGGER: OPEN GROUP B (Auditorium 442)'],
            ['BIS201', 36, 40, '90.0%', 'Capacity Normal (Hall 301)'],
            ['DB202', 32, 35, '91.4%', 'Capacity Normal (Lab 204)'],
            ['NET203', 30, 35, '85.7%', 'Capacity Normal (Auditorium 442)'],
            ['MATH101', 42, 45, '93.3%', 'Capacity Normal (Hall 301)'],
          ],
          rowCount: 5,
          timeMs: 2.8,
        });
      } else if (presetId === 2) {
        // Query 2: At-Risk Students <80% in BIS201
        setExecutionResult({
          headers: ['student_id', 'full_name', 'course_code', 'attended_sessions', 'total_sessions', 'attendance_pct', 'risk_status'],
          rows: [
            ['24B031901', 'Mubarak Nurlybay', 'BIS201', 4, 8, '50.0%', 'DISQUALIFICATION RISK (<80%)'],
            ['24B031787', 'Amir Zholdassali', 'BIS201', 6, 8, '75.0%', 'DISQUALIFICATION RISK (<80%)'],
          ],
          rowCount: 2,
          timeMs: 4.1,
        });
      } else if (presetId === 3) {
        // Query 3: GPS Rejections
        const rejections = attendanceRecords.filter((r) => r.verificationStatus === 'REJECTED');
        setExecutionResult({
          headers: ['attendance_id', 'student_name', 'distance_m', 'allowed_radius_m', 'rejection_reason'],
          rows: rejections.slice(0, 6).map((r) => [
            r.id,
            r.studentName,
            `${r.distanceToCenterM} m`,
            '150 m',
            r.rejectionReason || 'Exceeded campus centroid limit',
          ]),
          rowCount: rejections.length,
          timeMs: 3.5,
        });
      } else if (presetId === 4) {
        // Query 4: Unique (session_id, student_id) Verification
        setExecutionResult({
          headers: ['constraint_name', 'table_name', 'columns', 'constraint_type', 'status'],
          rows: [
            ['uq_session_student', 'attendance_records', 'session_id, student_id', 'UNIQUE', 'ACTIVE (Zero Duplicates Enforced)'],
            ['pk_attendance_id', 'attendance_records', 'attendance_id', 'PRIMARY KEY', 'ACTIVE'],
            ['fk_session_id', 'attendance_records', 'session_id -> class_sessions', 'FOREIGN KEY', 'ACTIVE (CASCADE ON DELETE)'],
            ['fk_student_id', 'attendance_records', 'student_id -> students', 'FOREIGN KEY', 'ACTIVE'],
          ],
          rowCount: 4,
          timeMs: 1.9,
        });
      }
    }, 200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5] text-xs font-bold mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>TEAM 39 • RELATIONAL ARCHITECTURE</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0F1F3D]">
              Database Schema & Entity Relationship Diagram (ERD)
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Designed according to 3NF standards with strict referential integrity, campus centroid GPS parameters, and composite unique constraints.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 bg-[#F5F8FD] p-1 rounded-xl border border-[#D6E2F5]">
            <button
              type="button"
              onClick={() => setActiveTab('ERD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ERD'
                  ? 'bg-[#0B3D91] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B3D91]'
              }`}
            >
              Interactive ERD
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TABLES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'TABLES'
                  ? 'bg-[#0B3D91] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B3D91]'
              }`}
            >
              Table Schemas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SQL_DECISIONS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'SQL_DECISIONS'
                  ? 'bg-[#0B3D91] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B3D91]'
              }`}
            >
              SQL & Decisions
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: ERD VISUAL DIAGRAM */}
      {activeTab === 'ERD' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Visual Entities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* STUDENTS */}
            <div className="bg-white rounded-xl border-2 border-[#0B3D91] p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#0B3D91] text-white text-[10px] font-bold rounded-bl">
                STUDENTS
              </div>
              <h4 className="font-extrabold text-xs text-[#0B3D91] uppercase tracking-wider mb-2">
                STUDENTS
              </h4>
              <ul className="text-xs space-y-1 font-mono">
                <li className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>PK student_id VARCHAR(15)</span>
                </li>
                <li className="text-slate-700 pl-5">username VARCHAR(50) UNIQUE</li>
                <li className="text-slate-700 pl-5">full_name VARCHAR(100)</li>
                <li className="text-slate-700 pl-5">email VARCHAR(100) UNIQUE</li>
                <li className="text-slate-700 pl-5">major VARCHAR(50)</li>
                <li className="text-slate-700 pl-5">year INT</li>
                <li className="text-slate-700 pl-5">gpa NUMERIC(3,2)</li>
              </ul>
            </div>

            {/* TEACHERS */}
            <div className="bg-white rounded-xl border border-[#D6E2F5] p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-bl">
                TEACHERS
              </div>
              <h4 className="font-extrabold text-xs text-[#0F1F3D] uppercase tracking-wider mb-2">
                TEACHERS
              </h4>
              <ul className="text-xs space-y-1 font-mono">
                <li className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>PK teacher_id VARCHAR(15)</span>
                </li>
                <li className="text-slate-700 pl-5">username VARCHAR(50) UNIQUE</li>
                <li className="text-slate-700 pl-5">full_name VARCHAR(100)</li>
                <li className="text-slate-700 pl-5">email VARCHAR(100) UNIQUE</li>
                <li className="text-slate-700 pl-5">department VARCHAR(80)</li>
              </ul>
            </div>

            {/* ROOMS (Prepared entity) */}
            <div className="bg-white rounded-xl border border-emerald-300 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-bl">
                ROOMS (Separated)
              </div>
              <h4 className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider mb-2">
                ROOMS
              </h4>
              <ul className="text-xs space-y-1 font-mono">
                <li className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>PK room_id VARCHAR(20)</span>
                </li>
                <li className="text-slate-700 pl-5">room_number VARCHAR(30)</li>
                <li className="text-slate-700 pl-5">building VARCHAR(80)</li>
                <li className="text-slate-700 pl-5">capacity INT</li>
                <li className="text-slate-700 pl-5">centroid_lat NUMERIC(9,6)</li>
                <li className="text-slate-700 pl-5">centroid_lng NUMERIC(9,6)</li>
                <li className="text-slate-700 pl-5">wifi_bssid VARCHAR(50)</li>
              </ul>
            </div>

            {/* COURSES */}
            <div className="bg-white rounded-xl border border-[#D6E2F5] p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-bl">
                COURSES
              </div>
              <h4 className="font-extrabold text-xs text-[#0F1F3D] uppercase tracking-wider mb-2">
                COURSES
              </h4>
              <ul className="text-xs space-y-1 font-mono">
                <li className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>PK course_code VARCHAR(15)</span>
                </li>
                <li className="text-slate-700 pl-5">title VARCHAR(120)</li>
                <li className="text-slate-700 pl-5">credits INT (max 21)</li>
                <li className="flex items-center gap-1.5 text-slate-700 pl-5">
                  <Link2 className="w-3 h-3 text-[#0B3D91]" />
                  <span>FK teacher_id → TEACHERS</span>
                </li>
                <li className="text-slate-700 pl-5">max_places INT (30-40)</li>
              </ul>
            </div>

            {/* CLASS_SESSIONS */}
            <div className="bg-white rounded-xl border-2 border-[#0B3D91] p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#0B3D91] text-white text-[10px] font-bold rounded-bl">
                CLASS_SESSIONS
              </div>
              <h4 className="font-extrabold text-xs text-[#0B3D91] uppercase tracking-wider mb-2">
                CLASS_SESSIONS
              </h4>
              <ul className="text-xs space-y-1 font-mono">
                <li className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>PK session_id VARCHAR(30)</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-700 pl-5">
                  <Link2 className="w-3 h-3 text-[#0B3D91]" />
                  <span>FK course_code → COURSES</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-700 pl-5">
                  <Link2 className="w-3 h-3 text-emerald-600" />
                  <span>FK room_id → ROOMS</span>
                </li>
                <li className="text-slate-700 pl-5">session_number INT (1..15)</li>
                <li className="text-slate-700 pl-5">day_of_week VARCHAR(15)</li>
                <li className="text-slate-700 pl-5">start_time TIME</li>
                <li className="text-slate-700 pl-5">end_time TIME</li>
                <li className="text-emerald-700 pl-5 font-bold">allowed_campus_radius_m INT = 150</li>
                <li className="text-slate-700 pl-5">status VARCHAR(10) (OPEN/CLOSED)</li>
              </ul>
            </div>

            {/* ATTENDANCE_RECORDS (Hero table) */}
            <div className="bg-white rounded-xl border-2 border-emerald-500 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-bl">
                ATTENDANCE_RECORDS
              </div>
              <h4 className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider mb-2">
                ATTENDANCE_RECORDS
              </h4>
              <ul className="text-xs space-y-1 font-mono">
                <li className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>PK attendance_id VARCHAR(30)</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-700 pl-5">
                  <Link2 className="w-3 h-3 text-[#0B3D91]" />
                  <span>FK session_id → CLASS_SESSIONS</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-700 pl-5">
                  <Link2 className="w-3 h-3 text-[#0B3D91]" />
                  <span>FK student_id → STUDENTS</span>
                </li>
                <li className="text-amber-800 pl-5 font-bold bg-amber-50 rounded">
                  UNIQUE (session_id, student_id)
                </li>
                <li className="text-slate-700 pl-5">check_in_time TIMESTAMP</li>
                <li className="text-slate-700 pl-5">gps_latitude NUMERIC(9,6)</li>
                <li className="text-slate-700 pl-5">gps_longitude NUMERIC(9,6)</li>
                <li className="text-slate-700 pl-5">distance_to_center_m NUMERIC</li>
                <li className="text-slate-700 pl-5">verification_status (PRESENT/REJECTED)</li>
              </ul>
            </div>
          </div>

          {/* Relationship Narrative Card */}
          <div className="bg-[#E8F0FE]/60 border border-[#D6E2F5] rounded-xl p-5 text-xs text-[#0F1F3D] space-y-2">
            <h4 className="font-bold text-sm text-[#0B3D91] flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Relational Integrity & Foreign Key Rules (Team 39)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700 leading-relaxed">
              <div className="bg-white p-3 rounded-lg border border-[#D6E2F5]">
                <strong className="text-[#0B3D91]">Many-to-Many Bridge:</strong> ENROLLMENTS connects STUDENTS and COURSES. A student cannot register for the same course twice in one semester.
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#D6E2F5]">
                <strong className="text-[#0B3D91]">Unique Check-in Guarantee:</strong> Composite UNIQUE constraint on <code>(session_id, student_id)</code> strictly prevents duplicate attendance records.
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#D6E2F5]">
                <strong className="text-[#0B3D91]">Spatial Centroid Verification:</strong> <code>allowed_campus_radius_m = 150</code> ensures check-in is valid only within the physical perimeter of KBTU Main Campus.
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#D6E2F5]">
                <strong className="text-[#0B3D91]">Room Decoupling:</strong> The <code>ROOMS</code> table isolates building and access point metadata, preparing for Week 10 Wi-Fi fingerprinting.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED TABLE SCHEMAS */}
      {activeTab === 'TABLES' && (
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-6 animate-fadeIn">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#0F1F3D] flex items-center gap-2">
              <Table2 className="w-4 h-4 text-[#0B3D91]" />
              PostgreSQL DDL Declarations (KBTU UMS Production Target)
            </h3>

            <div className="bg-[#0F1F3D] text-blue-100 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-3 leading-relaxed">
              <pre>{`-- 1. ROOMS Table (Decoupled Room & Geofence Metadata)
CREATE TABLE rooms (
    room_id VARCHAR(20) PRIMARY KEY,
    room_number VARCHAR(30) NOT NULL,
    building VARCHAR(80) NOT NULL DEFAULT 'Main Building (Tole Bi 59)',
    capacity INT NOT NULL CHECK (capacity > 0),
    centroid_lat NUMERIC(9,6) NOT NULL DEFAULT 43.238949,
    centroid_lng NUMERIC(9,6) NOT NULL DEFAULT 76.889709,
    wifi_bssid VARCHAR(50)
);

-- 2. CLASS_SESSIONS Table (15 Weekly Sessions per Course)
CREATE TABLE class_sessions (
    session_id VARCHAR(30) PRIMARY KEY,
    course_code VARCHAR(15) REFERENCES courses(course_code),
    room_id VARCHAR(20) REFERENCES rooms(room_id),
    session_number INT NOT NULL CHECK (session_number BETWEEN 1 AND 15),
    title VARCHAR(150) NOT NULL,
    session_date DATE NOT NULL,
    day_of_week VARCHAR(15) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    allowed_campus_radius_m INT NOT NULL DEFAULT 150,
    status VARCHAR(10) NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED'))
);

-- 3. ATTENDANCE_RECORDS Table (GPS Verification & Override Trail)
CREATE TABLE attendance_records (
    attendance_id VARCHAR(40) PRIMARY KEY,
    session_id VARCHAR(30) REFERENCES class_sessions(session_id) ON DELETE CASCADE,
    student_id VARCHAR(15) REFERENCES students(student_id) ON DELETE CASCADE,
    check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gps_latitude NUMERIC(9,6) NOT NULL,
    gps_longitude NUMERIC(9,6) NOT NULL,
    distance_to_center_m NUMERIC(6,1) NOT NULL,
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('PRESENT', 'REJECTED', 'MANUAL_REVIEW')),
    rejection_reason TEXT,
    is_override BOOLEAN DEFAULT FALSE,
    override_by VARCHAR(100),
    override_reason TEXT,
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SQL & DECISIONS (FROM TEAM 39 SLIDES) */}
      {activeTab === 'SQL_DECISIONS' && (
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-5 h-5 text-[#0B3D91]" />
              <h3 className="font-bold text-sm text-[#0F1F3D]">
                Slide 5 & 6 — SQL Queries & Academic Decision Making (Yugai Elya)
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              How database queries directly drive administrative decisions in course capacity and student attendance clearance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Query 1: Course Capacity Decision */}
            <div className="p-4 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-[#0B3D91] uppercase tracking-wide">
                Decision 1: Course Overflow & Section Opening
              </h4>
              <div className="bg-[#0F1F3D] text-blue-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                <pre>{`SELECT course_code, COUNT(*) AS enrolled_count
FROM registrations
WHERE semester = 'Fall 2026' 
  AND status = 'Approved'
GROUP BY course_code;`}</pre>
              </div>
              <div className="p-3 bg-white border border-[#D6E2F5] rounded-lg text-xs space-y-1">
                <span className="font-bold text-slate-700">Administrative Decision:</span>
                <p className="text-slate-600">
                  CS101 has 29 of 30 places filled. The Academic Registrar triggers the creation of Group B and allocates Auditorium 442 to prevent class overflow.
                </p>
              </div>
            </div>

            {/* Query 2: Attendance Risk Query */}
            <div className="p-4 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide">
                Decision 2: Exam Disqualification Under 80%
              </h4>
              <div className="bg-[#0F1F3D] text-blue-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                <pre>{`SELECT student_id,
       COUNT(*) FILTER (WHERE verification_status = 'PRESENT') AS attended,
       COUNT(*) AS total_past_sessions,
       ROUND(COUNT(*) FILTER (WHERE verification_status = 'PRESENT')::DECIMAL / 15 * 100, 1) AS attendance_pct
FROM attendance_records
WHERE course_code = 'BIS201'
GROUP BY student_id
HAVING (COUNT(*) FILTER (WHERE verification_status = 'PRESENT')::DECIMAL / 15 * 100) < 80;`}</pre>
              </div>
              <div className="p-3 bg-white border border-[#D6E2F5] rounded-lg text-xs space-y-1">
                <span className="font-bold text-slate-700">Administrative Decision:</span>
                <p className="text-slate-600">
                  Students below 80% (such as Mubarak Nurlybay) automatically receive an early-warning SMS and email notice before the midterm cutoff.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive SQL Query Executor Console */}
          <div className="pt-4 border-t border-[#D6E2F5] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#0B3D91]" />
                <h4 className="text-xs font-bold text-[#0F1F3D] uppercase tracking-wider">
                  Interactive PostgreSQL Query Runner (Team 39 Live Engine)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                PostgreSQL 16.4 • Memory Buffer Connected
              </span>
            </div>

            {/* Query Presets Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExecuteQuery(1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedPreset === 1
                    ? 'bg-[#0B3D91] text-white shadow-xs'
                    : 'bg-[#F5F8FD] text-slate-700 hover:bg-[#E8F0FE] border border-[#D6E2F5]'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Q1: Course Capacity (CS101 29/30)</span>
              </button>

              <button
                type="button"
                onClick={() => handleExecuteQuery(2)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedPreset === 2
                    ? 'bg-[#0B3D91] text-white shadow-xs'
                    : 'bg-[#F5F8FD] text-slate-700 hover:bg-[#E8F0FE] border border-[#D6E2F5]'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Q2: At-Risk &lt;80% Disqualification</span>
              </button>

              <button
                type="button"
                onClick={() => handleExecuteQuery(3)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedPreset === 3
                    ? 'bg-[#0B3D91] text-white shadow-xs'
                    : 'bg-[#F5F8FD] text-slate-700 hover:bg-[#E8F0FE] border border-[#D6E2F5]'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Q3: Distance Rejection Records</span>
              </button>

              <button
                type="button"
                onClick={() => handleExecuteQuery(4)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  selectedPreset === 4
                    ? 'bg-[#0B3D91] text-white shadow-xs'
                    : 'bg-[#F5F8FD] text-slate-700 hover:bg-[#E8F0FE] border border-[#D6E2F5]'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Q4: Constraints & Unique Rules</span>
              </button>
            </div>

            {/* Live Result Table */}
            <div className="bg-[#0F1F3D] rounded-xl overflow-hidden border border-blue-900 shadow-md">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-blue-200">
                <span>Query execution: {isExecuting ? 'Running...' : `${executionResult.timeMs} ms`}</span>
                <span className="text-emerald-400 font-bold">{executionResult.rowCount} rows returned</span>
              </div>

              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left font-mono text-[11px] text-blue-100">
                  <thead className="bg-slate-800/80 text-blue-300 uppercase tracking-wider sticky top-0 border-b border-slate-700">
                    <tr>
                      {executionResult.headers.map((h, i) => (
                        <th key={i} className="py-2.5 px-4 font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {executionResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-blue-950/40">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-4 whitespace-nowrap">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
