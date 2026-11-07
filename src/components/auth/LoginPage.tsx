import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, Eye, EyeOff, ShieldCheck, ChevronDown, ChevronUp, UserCheck, AlertCircle, Building2, Globe } from 'lucide-react';
import { Language } from '../../types';
import { checkPassword } from '../../utils/passwordPolicy';
import { PasswordChecklist } from './PasswordChecklist';

export const LoginPage: React.FC = () => {
  const { login, isAccountActivated, activateAccount, language, setLanguage, t, failedAttempts, lockoutRemainingSeconds, users } =
    useApp();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  // First sign-in of an account: the user creates their own password.
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [createErrors, setCreateErrors] = useState<string[]>([]);

  // "Keep me signed in on this device": automatic sign-in only on this browser, until sign-out or password change.
  const [remember, setRemember] = useState(false);

  const findUser = (value: string) =>
    users.find((u) => u.username.toLowerCase() === value.trim().toLowerCase());

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setForgotPasswordNotice(false);

    if (lockoutRemainingSeconds > 0) {
      setErrorMessage(t('lockoutMessage', { seconds: lockoutRemainingSeconds }));
      return;
    }

    if (!usernameInput.trim()) {
      setErrorMessage(t('invalidCredentials'));
      return;
    }

    // Known account that has no password yet -> let the user create one.
    const knownUser = findUser(usernameInput);
    if (knownUser && !isAccountActivated(knownUser.username)) {
      setPasswordInput('');
      setCreateErrors([]);
      setMode('create');
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMessage(t('invalidCredentials'));
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const result = await login(usernameInput, passwordInput, remember);
    setIsSubmitting(false);

    if (!result.success) {
      if (result.locked) {
        setErrorMessage(t('lockoutMessage', { seconds: 30 }));
      } else {
        setErrorMessage(t('invalidCredentials'));
      }
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors([]);
    setIsSubmitting(true);
    const result = await activateAccount(usernameInput, newPassword, confirmPassword, remember);
    setIsSubmitting(false);
    if (!result.success) setCreateErrors(result.errors);
  };

  const backToSignIn = () => {
    setMode('signin');
    setNewPassword('');
    setConfirmPassword('');
    setCreateErrors([]);
  };

  const handleSelectDemoUser = (loginUsername: string) => {
    backToSignIn();
    setUsernameInput(loginUsername);
    setPasswordInput('');
    setErrorMessage(null);
  };

  const isLocked = lockoutRemainingSeconds > 0;

  const createTarget = findUser(usernameInput);
  const liveCheck = createTarget ? checkPassword(newPassword, createTarget) : null;
  const createInputClass =
    'w-full h-11 px-3.5 bg-white border border-[#D6E2F5] rounded-xl text-sm text-[#0F1F3D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B3D91] focus:border-transparent';

  const rememberCheckbox = (
    <label className="flex items-start gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={remember}
        onChange={(e) => setRemember(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-[#D6E2F5] accent-[#0B3D91]"
      />
      <span className="text-xs text-[#0F1F3D] leading-snug">
        <span className="font-semibold">Keep me signed in on this device</span>
        <span className="block text-[11px] text-slate-500">
          Only this device signs in automatically. Use it on your own device only. Signing out turns it off.
        </span>
      </span>
    </label>
  );

  const createPasswordForm = (
    <form onSubmit={handleCreatePassword} className="space-y-4">
      <div className="p-3 bg-[#E8F0FE] border border-[#D6E2F5] rounded-xl flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#0B3D91] mt-0.5 shrink-0" />
        <div className="text-xs text-[#0F1F3D] leading-relaxed">
          <strong>{createTarget?.fullName}</strong> ({createTarget?.username}), this is your first sign-in. Create your own
          password. In the production version this step will be confirmed by a link sent to your KBTU e-mail.
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-[#0F1F3D] uppercase tracking-wider">New password</label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-xs font-semibold text-[#0B3D91] flex items-center gap-1"
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          className={createInputClass}
        />
        {liveCheck && (
          <div className="mt-2.5 p-3 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl">
            <PasswordChecklist rules={liveCheck.rules} started={newPassword.length > 0} />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-[#0F1F3D] uppercase tracking-wider mb-1.5">
          Repeat new password
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className={createInputClass}
        />
      </div>

      {rememberCheckbox}

      {createErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5" role="alert">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <ul className="text-xs font-medium text-red-700 space-y-0.5">
            {createErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !newPassword || !confirmPassword}
        className="w-full h-11 bg-[#0B3D91] hover:bg-[#0A3278] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <span>Create password and sign in</span>
        )}
      </button>

      <button type="button" onClick={backToSignIn} className="w-full text-xs font-semibold text-[#0B3D91] hover:underline">
        Back to sign in
      </button>
    </form>
  );

  return (
    <div className="min-h-screen w-full bg-[#F5F8FD] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#E8F0FE] selection:text-[#0B3D91]">
      {/* Background decoration: clean university geometric accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#E8F0FE]/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#D6E2F5]/40 blur-3xl" />
      </div>

      {/* Main Login Container */}
      <div className="relative w-full max-w-[420px] flex flex-col items-center">
        {/* Language Switcher in Card Header / Top Bar */}
        <div className="w-full flex justify-end mb-3 pr-1">
          <div className="inline-flex items-center bg-white border border-[#D6E2F5] rounded-full p-1 shadow-sm text-xs font-semibold text-[#0F1F3D]">
            <Globe className="w-3.5 h-3.5 ml-2 mr-1 text-[#0B3D91]" />
            {(['EN', 'RU', 'KZ'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  language === lang
                    ? 'bg-[#0B3D91] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#0B3D91] hover:bg-[#E8F0FE]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* University Portal Card */}
        <div className="w-full bg-white rounded-[16px] border border-[#D6E2F5] shadow-lg shadow-blue-900/5 p-7 sm:p-8">
          {/* Logo & Subtitle */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8F0FE] text-[#0B3D91] mb-3 shadow-inner">
              <Building2 className="w-8 h-8 text-[#0B3D91]" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0B3D91]">
              KBTU
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {t('appSubtitle')}
            </p>
            <div className="w-12 h-1 bg-[#0B3D91] rounded-full mx-auto mt-2.5" />
          </div>

          {/* Form */}
          {mode === 'create' ? createPasswordForm : (
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Login Field */}
            <div>
              <label className="block text-xs font-bold text-[#0F1F3D] uppercase tracking-wider mb-1.5">
                {t('loginLabel')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isLocked}
                  placeholder={t('loginPlaceholder')}
                  autoComplete="username"
                  className="w-full h-11 px-3.5 bg-white border border-[#D6E2F5] rounded-xl text-sm text-[#0F1F3D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B3D91] focus:border-transparent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#0F1F3D] uppercase tracking-wider">
                  {t('passwordLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordNotice(true)}
                  className="text-xs font-semibold text-[#0B3D91] hover:text-[#0A3278] hover:underline"
                >
                  {t('forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isLocked}
                  placeholder={t('passwordPlaceholder')}
                  autoComplete="current-password"
                  className="w-full h-11 pl-3.5 pr-11 bg-white border border-[#D6E2F5] rounded-xl text-sm text-[#0F1F3D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B3D91] focus:border-transparent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {rememberCheckbox}

            {/* Inline Error / Lockout Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="text-xs font-medium text-red-700 leading-tight">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Forgot password notice */}
            {forgotPasswordNotice && (
              <div className="p-3 bg-[#E8F0FE] border border-[#D6E2F5] rounded-xl flex items-start gap-2 animate-fadeIn">
                <ShieldCheck className="w-4 h-4 text-[#0B3D91] mt-0.5 shrink-0" />
                <div className="text-xs text-[#0F1F3D]">
                  Password reset link dispatched to institutional mailbox. For demo testing, use the preconfigured demo accounts below.
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="w-full h-11 bg-[#0B3D91] hover:bg-[#0A3278] active:bg-[#072458] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B3D91]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLocked ? (
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Locked ({lockoutRemainingSeconds}s)
                </span>
              ) : (
                <span>{t('signInButton')}</span>
              )}
            </button>
          </form>
          )}

          {/* Security notice (passwords never exposed) */}
          <div className="mt-5 pt-4 border-t border-[#D6E2F5] text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Kazakh-British Technical University • WSP Unified Portal 2026
            </p>
          </div>
        </div>

        {/* Collapsible Demo Accounts Box (Dev Only) */}
        <div className="w-full mt-4 bg-white/90 backdrop-blur-sm border border-[#D6E2F5] rounded-xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-[#0B3D91] hover:bg-[#E8F0FE]/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0B3D91]" />
              {t('demoAccounts')}
            </span>
            {showDemoAccounts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDemoAccounts && (
            <div className="p-3 pt-0 border-t border-[#D6E2F5] space-y-2">
              <p className="text-[11px] text-slate-500 px-1 pt-2">
                {t('clickToAutofill')} ({t('passwordsHiddenNote')}):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(u.username)}
                    className="text-left px-2.5 py-1.5 rounded-lg border border-[#D6E2F5] hover:border-[#0B3D91] hover:bg-[#E8F0FE] transition-colors group flex flex-col"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-[#0B3D91] group-hover:underline">
                        {u.username}
                      </span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === 'TEACHER'
                            ? 'bg-amber-100 text-amber-800'
                            : u.role === 'MANAGER'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">
                      {u.fullName} {u.username === 't_issabek' && '(BIS201)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};