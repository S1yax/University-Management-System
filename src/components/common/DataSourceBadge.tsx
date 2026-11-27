import React from 'react';
import { Database, HardDrive } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** Shows whether the shared database is reachable. */
export const DataSourceBadge: React.FC = () => {
  const { serverOnline, isApiConfigured } = useApp();
  if (serverOnline) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
        title="Attendance is stored in the shared database."
      >
        <Database className="w-3.5 h-3.5" /> Shared PostgreSQL data
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-700"
      title="Check your connection and try again."
    >
      <HardDrive className="w-3.5 h-3.5" /> {isApiConfigured ? 'Server unavailable' : 'Server unconfigured'}
    </span>
  );
};
