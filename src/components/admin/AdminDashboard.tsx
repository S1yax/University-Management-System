import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Shield,
  ClipboardList,
  Server,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { currentUser, users, auditLogs, setActivePath, classSessions, t } = useApp();

  const activeAuditCount = auditLogs.length;
  const recentSecurityEvents = auditLogs.filter(
    (l) => l.action === 'LOGIN_FAILURE' || l.action === 'ACCOUNT_LOCKED' || l.action === 'CHECK_IN_REJECTED'
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0B3D91] mb-1">
              Infrastructure & System Administration
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F1F3D]">
              {currentUser?.fullName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              KBTU IT Infrastructure • Production Geolocation Nodes & Audit System
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActivePath('audit-log')}
            className="px-4 py-2.5 bg-[#0B3D91] hover:bg-[#0A3278] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Open System Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Provisioned Users
          </span>
          <div className="text-3xl font-extrabold text-[#0B3D91]">
            {users.length}
          </div>
          <p className="text-[11px] text-slate-500">5 Students, 3 Teachers, 1 Mgr</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Audit Records
          </span>
          <div className="text-3xl font-extrabold text-[#0F1F3D]">
            {activeAuditCount}
          </div>
          <p className="text-[11px] text-emerald-600 font-bold">100% Immutable</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Security Interventions
          </span>
          <div className="text-3xl font-extrabold text-amber-600">
            {recentSecurityEvents}
          </div>
          <p className="text-[11px] text-amber-600 font-medium">Rejections & lockouts</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Geofence Nodes
          </span>
          <div className="text-3xl font-extrabold text-emerald-600">
            3
          </div>
          <p className="text-[11px] text-slate-500">Hall 301, 442, Lab 204</p>
        </div>
      </div>

      {/* QUICK SYSTEM CONTROLS & RECENT AUDIT SNIPPET */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#0F1F3D] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0B3D91]" />
            Recent Security & Geolocation Audit Stream
          </h3>
          <button
            type="button"
            onClick={() => setActivePath('audit-log')}
            className="text-xs font-bold text-[#0B3D91] hover:underline"
          >
            View all logs →
          </button>
        </div>

        <div className="space-y-2">
          {auditLogs.slice(0, 5).map((log) => (
            <div
              key={log.id}
              className="p-3 bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[10px]">
                    {log.timestamp}
                  </span>
                  <span className="font-bold text-[#0B3D91]">{log.action}</span>
                  <span className="text-slate-600 font-medium">({log.username})</span>
                </div>
                <p className="text-slate-600 text-[11px]">{log.details}</p>
              </div>

              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  log.status === 'SUCCESS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : log.status === 'WARNING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
