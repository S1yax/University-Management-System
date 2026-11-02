import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const AccessDeniedPage: React.FC = () => {
  const { currentUser, setActivePath, t } = useApp();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-4 shadow-sm">
        <ShieldAlert className="w-9 h-9" />
      </div>

      <h2 className="text-2xl font-extrabold text-[#0F1F3D]">
        {t('accessDenied')}
      </h2>

      <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
        {t('accessDeniedDesc')} Your current role is{' '}
        <strong className="text-[#0B3D91] font-bold uppercase">{currentUser?.role}</strong>.
      </p>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setActivePath('dashboard')}
          className="px-5 py-2.5 bg-[#0B3D91] hover:bg-[#0A3278] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToDashboard')}</span>
        </button>
      </div>
    </div>
  );
};
