import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/portalApi';
import { useApp } from '../../context/AppContext';

const definitions = {
  students: ['Student Management', 'student_id', 'username', 'full_name', 'email', 'major', 'year'],
  teachers: ['Teacher Management', 'teacher_id', 'username', 'full_name', 'email', 'department'],
  staff: ['Staff and Roles', 'username', 'full_name', 'email', 'role'],
  rooms: ['Classrooms', 'room_id', 'room_number', 'building', 'capacity', 'centroid_lat', 'centroid_lng', 'wifi_bssid'],
  courses: ['Course Management', 'course_code', 'title', 'credits', 'ects_credits', 'faculty', 'max_places', 'teacher_id', 'day_of_week', 'start_time', 'end_time', 'room_id'],
  sessions: ['Academic Sessions', 'session_id', 'course_code', 'room_id', 'session_number', 'session_date', 'start_time', 'end_time', 'tracked_hours', 'allowed_campus_radius_m', 'semester'],
  events: ['Events', 'id', 'title', 'description', 'starts_at', 'volunteer'],
  volunteers: ['Volunteer Registrations', 'student_id', 'title', 'full_name', 'created_at'],
} as const;

type Resource = keyof typeof definitions;
type Row = Record<string, string | number | boolean | null>;
const numbers = new Set(['year','capacity','centroid_lat','centroid_lng','credits','ects_credits','max_places','day_of_week','session_number','tracked_hours','allowed_campus_radius_m']);
const panel = 'rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm';
const control = 'rounded-lg border border-[#D6E2F5] px-3 py-2 text-sm';
const submit = 'rounded-lg bg-[#0B3D91] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';
const label = (field: string) => field.replaceAll('_', ' ');

export function ManagementPage({ initial = 'students' }: { initial?: Resource }) {
  const { refreshFromServer, users, courses } = useApp();
  const [resource, setResource] = useState<Resource>(initial);
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, key, ...fields] = definitions[resource];
  const path = '/admin/' + resource;
  const account = resource === 'students' || resource === 'teachers' || resource === 'staff';
  const formFields = editing && editing[key] !== undefined ? fields.filter((field) => field !== 'username')
    : resource === 'events' ? fields : [key, ...fields];

  const load = useCallback(() => api<{ rows: Row[] }>(path).then((result) => result.rows), [path]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setRows([]);
    setNotice('');
    setEditing(null);
    load().then((records) => { if (active) setRows(records); })
      .catch((error: Error) => { if (active) setNotice(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = editing?.[key];
    const body: Record<string, string | number | boolean | null> = {};
    for (const field of formFields) {
      const value = String(data.get(field) ?? '');
      body[field] = numbers.has(field) ? (value === '' ? null : Number(value))
        : field === 'volunteer' ? data.has(field)
        : field === 'starts_at' && value ? new Date(value).toISOString() : value;
    }
    if (data.get('password')) body.password = String(data.get('password'));
    setBusy(true);
    try {
      const result = await api<{ message: string }>(
        path + (id === undefined ? '' : '/' + encodeURIComponent(String(id))), id === undefined ? 'POST' : 'PATCH', body);
      setNotice(result.message);
      setEditing(null);
      setRows(await load());
      void refreshFromServer();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save record.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Row) => {
    if (!window.confirm('Delete record ' + row[key] + '?')) return;
    setBusy(true);
    try {
      await api(path + '/' + encodeURIComponent(String(row[key])), 'DELETE');
      setRows(await load());
      setEditing(null);
      setNotice('Record deleted.');
      void refreshFromServer();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete record.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="mx-auto max-w-6xl space-y-4">
    <div className={panel}>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Management areas">
        {(Object.keys(definitions) as Resource[]).map((item) =>
          <button key={item} type="button" disabled={busy} className={item === resource ? submit : control}
            onClick={() => setResource(item)}>{definitions[item][0]}</button>)}
      </div>
    </div>
    {notice && <p role="status" className={panel}>{notice}</p>}
    {editing && <form className={panel + ' space-y-3'} onSubmit={save} key={String(editing[key] ?? 'new')}>
      <h3 className="font-bold">{editing[key] === undefined ? 'Create record' : 'Edit ' + editing[key]}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {formFields.map((field) => {
          const value = String(editing[field] ?? '');
          const choices = field === 'role' ? [{ id: 'MANAGER', text: 'Manager' }, { id: 'ADMIN', text: 'Admin' }]
            : field === 'teacher_id' && resource === 'courses' ? users.filter((user) => user.role === 'TEACHER').map((user) => ({ id: user.id, text: user.fullName }))
            : field === 'course_code' && resource === 'sessions' ? courses.map((course) => ({ id: course.code, text: course.code })) : null;
          let type = numbers.has(field) ? 'number' : 'text';
          if (field === 'session_date') type = 'date';
          if (field === 'start_time' || field === 'end_time') type = 'time';
          if (field === 'starts_at') type = 'datetime-local';
          const localDate = value && field === 'starts_at' ? new Date(Date.parse(value) - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : value;
          return <label className="flex flex-col gap-1 text-xs font-semibold capitalize" key={field}>{label(field)}
            {field === 'volunteer' ? <input type="checkbox" name={field} defaultChecked={editing[field] === true} />
              : choices ? <select className={control} name={field} defaultValue={value} required>
                <option value="">Select</option>{choices.map((choice) => <option value={choice.id} key={choice.id}>{choice.text}</option>)}
              </select> : <input className={control} type={type} name={field} defaultValue={localDate}
                required={!['wifi_bssid','ects_credits','semester'].includes(field)} step={field.startsWith('centroid') ? 'any' : undefined} />}
          </label>;
        })}
        {account && <label className="flex flex-col gap-1 text-xs font-semibold">
          {editing[key] === undefined ? 'Initial password' : 'Reset password'}
          <input className={control} name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128}
            required={editing[key] === undefined} />
        </label>}
      </div>
      <button className={submit} disabled={busy}>Save</button>
      <button className={control + ' ml-2'} type="button" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
    </form>}
    <div className={panel + ' overflow-x-auto'}>
      {resource !== 'volunteers' && <button className={submit + ' mb-3'} onClick={() => setEditing({})} disabled={busy}>Create record</button>}
      {loading ? <p role="status">Loading records…</p> : !rows.length ? <p>No records available.</p> :
        <table className="w-full text-left text-sm">
          <thead className="bg-[#E8F0FE]"><tr>{[key, ...fields].map((field) => <th className="p-2 capitalize" key={field}>{label(field)}</th>)}
            {resource !== 'volunteers' && <th className="p-2">Actions</th>}</tr></thead>
          <tbody>{rows.map((row, index) => <tr className="border-b" key={String(row[key]) + ':' + index}>
            {[key, ...fields].map((field) => <td className="p-2" key={field}>{String(row[field] ?? '—')}</td>)}
            {resource !== 'volunteers' && <td className="whitespace-nowrap p-2">
              <button className="mr-2 text-[#0B3D91] underline" disabled={busy} onClick={() => setEditing(row)}>Edit</button>
              <button className="text-red-700 underline" disabled={busy} onClick={() => void remove(row)}>Delete</button>
            </td>}
          </tr>)}</tbody>
        </table>}
    </div>
  </section>;
}
