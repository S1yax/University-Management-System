import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/portalApi';
import { Building2 } from 'lucide-react';

const copy = {
  EN: { title: 'Set your password', intro: 'Choose a password for your KBTU account.', password: 'New password', confirm: 'Confirm password', save: 'Set password and sign in', mismatch: 'The passwords do not match.', failed: 'Could not activate the account.' },
  RU: { title: 'Создайте пароль', intro: 'Выберите пароль для своего аккаунта KBTU.', password: 'Новый пароль', confirm: 'Повторите пароль', save: 'Сохранить пароль и войти', mismatch: 'Пароли не совпадают.', failed: 'Не удалось активировать аккаунт.' },
  KZ: { title: 'Құпиясөз орнатыңыз', intro: 'KBTU аккаунтыңыз үшін құпиясөз таңдаңыз.', password: 'Жаңа құпиясөз', confirm: 'Құпиясөзді қайталаңыз', save: 'Құпиясөзді сақтау және кіру', mismatch: 'Құпиясөздер сәйкес келмейді.', failed: 'Аккаунтты белсендіру мүмкін болмады.' },
};

export interface SetupAccount {
  username: string;
  fullName: string;
  role: string;
}

type SetupProps =
  | { token: string; accounts?: never; onSignIn?: never }
  | { token?: never; accounts: SetupAccount[]; onSignIn: () => void };

export function ActivateAccountPage({ token, accounts, onSignIn }: SetupProps) {
  const { language, login } = useApp();
  const labels = copy[language] ?? copy.EN;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activatedUsername, setActivatedUsername] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = new FormData(event.currentTarget);
    const password = String(input.get('password') ?? '');
    if (password !== input.get('confirmation')) return setError(labels.mismatch);
    setError('');
    setBusy(true);
    try {
      const { username } = token
        ? await api<{ username: string }>('/auth/activate', 'POST', { token, password })
        : await api<{ username: string }>('/auth/setup', 'POST', { username: input.get('username'), password });
      if (token) window.history.replaceState(null, '', window.location.pathname + window.location.search);
      const result = await login(username, password, false);
      if (!result.success) {
        setActivatedUsername(username);
        setError(result.message);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : labels.failed);
    } finally {
      setBusy(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-[#F5F8FD] p-4">
    <section className="w-full max-w-[420px] rounded-2xl border border-[#D6E2F5] bg-white p-7 shadow-lg">
      <Building2 className="mb-3 h-8 w-8 text-[#0B3D91]" aria-hidden />
      <h1 className="text-2xl font-extrabold text-[#0B3D91]">{labels.title}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">{labels.intro}</p>
      {activatedUsername
        ? <a href={window.location.pathname} className="text-sm text-[#0B3D91] underline">Sign in as {activatedUsername}</a>
        : <form className="space-y-3" onSubmit={submit}>
          {accounts && <label className="block text-sm font-semibold">
            {language === 'RU' ? 'Логин' : language === 'KZ' ? 'Логин' : 'Username'}
            <input className="mt-1 w-full rounded-lg border border-[#D6E2F5] p-2" name="username"
              list="pending-portal-accounts" autoComplete="username" autoFocus required />
            <datalist id="pending-portal-accounts">
              {accounts.map((account) => <option key={account.username} value={account.username}
                label={account.fullName + ' · ' + account.role} />)}
            </datalist>
          </label>}
          <label className="block text-sm font-semibold">{labels.password}
            <input className="mt-1 w-full rounded-lg border border-[#D6E2F5] p-2" type="password"
              name="password" autoComplete="new-password" minLength={12} maxLength={128} required autoFocus={!accounts} />
          </label>
          <label className="block text-sm font-semibold">{labels.confirm}
            <input className="mt-1 w-full rounded-lg border border-[#D6E2F5] p-2" type="password"
              name="confirmation" autoComplete="new-password" minLength={12} maxLength={128} required />
          </label>
          <button className="w-full rounded-lg bg-[#0B3D91] p-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy}>
            {labels.save}
          </button>
        </form>}
      {onSignIn && <button className="mt-4 text-sm font-semibold text-[#0B3D91] underline" type="button" onClick={onSignIn}>
        {language === 'RU' ? 'Уже есть пароль? Войти' : language === 'KZ' ? 'Құпиясөзіңіз бар ма? Кіру' : 'Already have a password? Sign in'}
      </button>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  </main>;
}
