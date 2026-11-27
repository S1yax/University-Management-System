import React from 'react';
import {
  Building2,
  Clock,
  GraduationCap,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StudentProfile } from './StudentProfile';
import { ContactSettings } from './ContactSettings';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  MANAGER: 'Manager (Registrar)',
  ADMIN: 'Administrator',
};

const Field: React.FC<{ icon: React.ReactNode; label: string; value?: string | number }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F5F8FD] border border-[#D6E2F5]">
    <div className="mt-0.5 text-[#0B3D91] shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-[#0F1F3D] break-words">{value ?? '—'}</p>
    </div>
  </div>
);

/** Profile of the signed-in user. Every role sees only its own data. Read-only: the data comes from the university. */
export const ProfilePage: React.FC = () => {
  const { currentUser, setActivePath } = useApp();
  if (!currentUser) return null;
  // Students get the tabbed profile; the other roles keep this simple page
  if (currentUser.role === 'STUDENT') return <StudentProfile />;
  const initials = currentUser.fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#0B3D91] text-white flex items-center justify-center text-xl font-extrabold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5] text-xs font-bold mb-1.5">
            <UserIcon className="w-3.5 h-3.5" />
            <span>{(ROLE_LABELS[currentUser.role] ?? currentUser.role).toUpperCase()}</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0F1F3D] truncate">{currentUser.fullName}</h2>
          <p className="text-xs text-slate-500">{currentUser.username}</p>
        </div>
      </div>

      {/* Personal data */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-[#0F1F3D]">Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field icon={<Mail className="w-4 h-4" />} label="Corporate e-mail" value={currentUser.email} />
          <Field icon={<Phone className="w-4 h-4" />} label="Phone" value={currentUser.phone} />
          <Field icon={<Building2 className="w-4 h-4" />} label="Department" value={currentUser.department} />
          
        </div>
        <p className="text-[11px] text-slate-500">
          This data comes from the university records and cannot be edited here.
        </p>
      </div>

      <ContactSettings />

      {/* Security */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-[#0F1F3D] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0B3D91]" />
          Account security
        </h3>
        <button
          type="button"
          onClick={() => setActivePath('change-password')}
          className="h-10 px-4 bg-[#0B3D91] hover:bg-[#0A3278] text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <KeyRound className="w-4 h-4" />
          Change password
        </button>
      </div>

      
    </div>
  );
};