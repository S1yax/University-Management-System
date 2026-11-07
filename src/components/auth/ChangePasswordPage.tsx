import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { checkPassword } from '../../utils/passwordPolicy';
import { PasswordChecklist } from './PasswordChecklist';

/**
 * `forced` = a student whose password was set in an earlier semester. The page is then the only thing they can open.
 */
export const ChangePasswordPage: React.FC<{ forced?: boolean }> = ({ forced = false }) => {
  const { currentUser, changePassword, passwordChangeInfo, logout } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!currentUser) return null;

  const live = checkPassword(next, { ...currentUser, previousPassword: current || undefined });
  const inputClass =
    'w-full h-11 px-3.5 bg-white border border-[#D6E2F5] rounded-xl text-sm text-[#0F1F3D] focus:outline-none focus:ring-2 focus:ring-[#0B3D91] focus:border-transparent';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDone(false);
    setBusy(true);
    const result = await changePassword(current, next, confirm);
    setBusy(false);
    setErrors(result.errors);
    if (result.success) {
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-12 space-y-6">
      {forced && passwordChangeInfo && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3" role="status">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold text-sm">Password change required</p>
            <p className="mt-1">
              Students use one password per semester. Your password was created in {passwordChangeInfo.setIn}, and the
              current semester is {passwordChangeInfo.current}. Choose a new password to continue.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5] text-xs font-bold mb-2">
          <KeyRound className="w-3.5 h-3.5" />
          <span>ACCOUNT SECURITY</span>
        </div>
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Change password</h2>
        <p className="text-xs text-slate-500 mt-1">
          Signed in as {currentUser.username}. Your new password must not be similar to the current one or to any of your last
          passwords.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#0F1F3D] uppercase tracking-wider mb-1.5">Current password</label>
          <input
            type={show ? 'text' : 'password'}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-[#0F1F3D] uppercase tracking-wider">New password</label>
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="text-xs font-semibold text-[#0B3D91] flex items-center gap-1"
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
          <div className="mt-2.5 p-3 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl">
            <PasswordChecklist rules={live.rules} started={next.length > 0} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#0F1F3D] uppercase tracking-wider mb-1.5">
            Repeat new password
          </label>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        {errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5" role="alert">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <ul className="text-xs font-medium text-red-700 space-y-0.5">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {done && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Password changed. Use the new one the next time you sign in.
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !current || !next || !confirm}
          className="w-full h-11 bg-[#0B3D91] hover:bg-[#0A3278] text-white font-semibold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : 'Change password'}
        </button>

        {forced && (
          <button type="button" onClick={logout} className="w-full text-xs font-semibold text-slate-500 hover:underline">
            Sign out
          </button>
        )}
      </form>
    </div>
  );
};