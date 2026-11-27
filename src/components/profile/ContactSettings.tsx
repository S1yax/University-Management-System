import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export function ContactSettings() {
  const { currentUser, mutate } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phone = String(new FormData(event.currentTarget).get('phone') ?? '');
    setBusy(true);
    const result = await mutate('/profile', 'PATCH', { phone });
    setMessage(result.message);
    setBusy(false);
  };
  return <form onSubmit={submit} className="rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
    <h3 className="mb-3 text-sm font-bold">Contact settings</h3>
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold">Phone
        <input name="phone" type="tel" autoComplete="tel" maxLength={40} key={currentUser?.phone}
          defaultValue={currentUser?.phone ?? ''} className="rounded-lg border border-[#D6E2F5] px-3 py-2" />
      </label>
      <button disabled={busy} className="rounded-lg bg-[#0B3D91] px-3 py-2 text-sm font-semibold text-white">Save</button>
    </div>
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </form>;
}
