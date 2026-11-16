import React from 'react';
import { Database, HardDrive } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** Shows where attendance is saved: the shared server database or only this browser. */
export const DataSourceBadge: React.FC = () => {
  const { serverOnline, isApiConfigured } = useApp();
  if (serverOnline) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
        title="Отметки сохраняются в PostgreSQL и видны на всех устройствах"
      >
        <Database className="w-3.5 h-3.5" /> Сервер PostgreSQL · общие данные
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-700"
      title={isApiConfigured ? 'Сервер не отвечает. Проверьте, что он запущен (npm start в папке server).' : 'Сервер не подключён (VITE_API_URL не задан).'}
    >
      <HardDrive className="w-3.5 h-3.5" /> {isApiConfigured ? 'Сервер недоступен · данные этого браузера' : 'Демо · данные этого браузера'}
    </span>
  );
};
