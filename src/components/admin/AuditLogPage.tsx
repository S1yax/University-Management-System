import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Download,
  Terminal,
} from 'lucide-react';
import { AuditActionType } from '../../types';

export const AuditLogPage: React.FC = () => {
  const { auditLogs, t } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const actionCategories: { label: string; value: string }[] = [
    { label: 'All Events', value: 'ALL' },
    { label: 'GPS Check-ins', value: 'GPS_CHECK_IN' },
    { label: 'Rejections', value: 'CHECK_IN_REJECTED' },
    { label: 'Manual Overrides', value: 'MANUAL_OVERRIDE' },
    { label: 'Login Success', value: 'LOGIN_SUCCESS' },
    { label: 'Login Failures / Lockouts', value: 'LOGIN_FAILURE' },
    { label: 'Early Warnings', value: 'EARLY_WARNING_SENT' },
    { label: 'Manual Review Requests', value: 'MANUAL_REVIEW_REQUEST' },
  ];

  const filteredLogs = auditLogs.filter((entry) => {
    const matchesSearch =
      entry.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction =
      actionFilter === 'ALL'
        ? true
        : actionFilter === 'LOGIN_FAILURE'
        ? entry.action === 'LOGIN_FAILURE' || entry.action === 'ACCOUNT_LOCKED'
        : entry.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const handleExportAuditLogs = () => {
    const headers = ['ID', 'Timestamp', 'Username', 'Role', 'Action', 'Status', 'IP Address', 'Details'];
    const rows = filteredLogs.map((log) => [
      log.id,
      log.timestamp,
      log.username,
      log.role,
      log.action,
      log.status,
      log.ipAddress,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KBTU_Audit_Log_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5] text-xs font-bold mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>SECURITY & SYSTEM AUDIT</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0F1F3D]">
              {t('auditLog')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Immutable chronological record of GPS verifications, teacher overrides, security lockouts, and grade changes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportAuditLogs}
            className="px-4 py-2.5 bg-white border border-[#D6E2F5] hover:bg-[#E8F0FE] text-[#0B3D91] font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Full Audit Trail</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 pt-5 border-t border-[#D6E2F5] flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, action keyword, IP, or details..."
              className="w-full h-10 pl-9 pr-3 text-xs bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-10 px-3 text-xs bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl text-[#0F1F3D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            >
              {actionCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Showing {filteredLogs.length} audit event entries</span>
          <span className="text-[#0B3D91]">Auto-synced</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#D6E2F5]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider sticky top-0 border-b border-[#D6E2F5]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E2F5]/70 font-mono text-[11px]">
              {filteredLogs.map((log, idx) => (
                <tr
                  key={log.id}
                  className={`transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'
                  } hover:bg-blue-50/50`}
                >
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-sans">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-sans">
                    <span className="font-bold text-[#0F1F3D]">{log.username}</span>
                    <span className="block text-[10px] text-slate-500 font-normal uppercase">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-bold text-[#0B3D91]">{log.action}</span>
                  </td>
                  <td className="py-3 px-4 font-sans text-xs text-slate-700 max-w-md">
                    {log.details}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                    {log.ipAddress}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-sans">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        SUCCESS
                      </span>
                    ) : log.status === 'WARNING' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        WARNING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="w-3 h-3 text-red-600" />
                        ERROR
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
