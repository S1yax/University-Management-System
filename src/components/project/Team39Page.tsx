import React from 'react';
import { Users2, Award, Calendar, CheckCircle2, FileText, Sparkles, Building, Layers, ArrowRight } from 'lucide-react';

export const Team39Page: React.FC = () => {
  const members = [
    {
      name: 'Niyazkhan Saniya',
      studentId: '24B031926',
      role: 'Team Lead & Core Architect',
      slide: 'Slide 1 & 2: Project Scope & Data Tables',
      contribution: 'Designed core relational tables (STUDENTS, TEACHERS, COURSES) and coordinate team integration with KBTU UMS frontend.',
      avatarBg: 'bg-[#0B3D91]',
    },
    {
      name: 'Mubarak Nurlybay',
      studentId: '24B031901',
      role: 'Database Engineer',
      slide: 'Slide 3: Primary Keys & Unique Constraints',
      contribution: 'Formulated composite unique constraints (session_id, student_id) to strictly prevent duplicate attendance check-ins.',
      avatarBg: 'bg-blue-600',
    },
    {
      name: 'Bagdat Alua',
      studentId: '24B031666',
      role: 'Relational Modeler',
      slide: 'Slide 4: Foreign Keys & Many-to-Many Bridge',
      contribution: 'Constructed the REGISTRATIONS bridge table, referential integrity cascades, and course capacity validators.',
      avatarBg: 'bg-indigo-600',
    },
    {
      name: 'Amir Zholdassali',
      studentId: '24B031787',
      role: 'ERD & Spatial Designer',
      slide: 'Slide 5: ERD Diagram & CLASS_SESSIONS',
      contribution: 'Modeled CLASS_SESSIONS, separated ROOMS metadata, and mapped GPS centroid coordinates for Hall 301.',
      avatarBg: 'bg-sky-600',
    },
    {
      name: 'Yugai Elya',
      studentId: '25B032145',
      role: 'SQL & Business Logic Developer',
      slide: 'Slide 6 & 7: SQL Queries & Decisions',
      contribution: 'Wrote aggregation queries for section opening decisions (CS101 29/30) and early-warning attendance disqualification filters.',
      avatarBg: 'bg-[#0A3278]',
    },
  ];

  const milestones = [
    {
      date: '2026-10-26',
      title: 'Task 9 — Database Check-up Presentation',
      status: 'COMPLETED',
      desc: 'Successfully defended the 3NF database schema, PK/FK constraints, and ERD model before instructor Ainur Issabek.',
    },
    {
      date: '2026-11-02',
      title: 'Sprint 2: GPS Attendance Live Integration',
      status: 'ACTIVE TODAY',
      desc: 'Implemented browser Geolocation API with Haversine distance, Hall 301 150m geofence, and teacher live dashboard.',
    },
    {
      date: '2026-11-09',
      title: 'Sprint 3: Audit Trail & Status History',
      status: 'SCHEDULED',
      desc: 'Implement approval audit columns (approved_by, changed_at) and registrar transaction controls.',
    },
    {
      date: '2026-11-16',
      title: 'Week 10: Wi-Fi Fingerprinting & Indoor Triangulation',
      status: 'UPCOMING',
      desc: 'Integrate BSSID validation (KBTU-STUDENT-AP-301) to eliminate indoor GPS drift in deep auditorium structures.',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5] text-xs font-bold mb-2">
              <Users2 className="w-3.5 h-3.5" />
              <span>BIS201 • MONDAY GROUP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F1F3D]">
              Team 39 — University Management System
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Course Registration and GPS Geofence Attendance System project for Basics of Information Systems (BIS201), School of Information Technology and Engineering, KBTU.
            </p>
          </div>

          <div className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] text-center shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Course Instructor
            </span>
            <span className="text-sm font-extrabold text-[#0B3D91]">
              Ainur Issabek
            </span>
          </div>
        </div>
      </div>

      {/* Team Members Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#0F1F3D] uppercase tracking-wider px-1">
          Project Team Roster (5 Members)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div
              key={member.studentId}
              className="bg-white rounded-xl border border-[#D6E2F5] p-5 shadow-sm hover:border-[#0B3D91] transition-all group flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-sm ${member.avatarBg}`}
                  >
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#0F1F3D] group-hover:text-[#0B3D91] transition-colors">
                      {member.name}
                    </h4>
                    <span className="text-xs font-mono font-semibold text-[#0B3D91]">
                      {member.studentId}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="inline-block px-2 py-0.5 rounded-md bg-[#E8F0FE] text-[#0B3D91] font-semibold text-[11px]">
                    {member.role}
                  </div>
                  <p className="text-slate-600 leading-relaxed pt-1">
                    {member.contribution}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#D6E2F5]/80 text-[11px] text-slate-400 font-medium">
                {member.slide}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones & Deliverables Roadmap */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#0B3D91]" />
          <h3 className="font-bold text-sm text-[#0F1F3D]">
            Team 39 Project Milestones & Deliverables
          </h3>
        </div>

        <div className="space-y-3">
          {milestones.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                m.status === 'COMPLETED'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : m.status === 'ACTIVE TODAY'
                  ? 'bg-[#E8F0FE]/60 border-[#0B3D91]'
                  : 'bg-[#F5F8FD] border-[#D6E2F5]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {m.date}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.status === 'ACTIVE TODAY'
                        ? 'bg-[#0B3D91] text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#0F1F3D]">{m.title}</h4>
                <p className="text-xs text-slate-600 max-w-2xl">{m.desc}</p>
              </div>

              {m.status === 'COMPLETED' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
