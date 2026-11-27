import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { coursesApi, type AttestationItem } from '../../api/coursesApi';
import { api } from '../../api/portalApi';

const card = 'rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm';
const input = 'rounded-lg border border-[#D6E2F5] bg-white px-3 py-2';
const button = 'rounded-lg bg-[#0B3D91] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';

export function AssessmentsPage({ editable = false }: { editable?: boolean }) {
  const { currentUser, courses, enrollments, refreshFromServer } = useApp();
  const [selection, setSelection] = useState('');
  const [rows, setRows] = useState<AttestationItem[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const courseCode = editable ? selection || courses[0]?.code : undefined;
  const studentId = currentUser?.studentId;
  useEffect(() => {
    setRows([]);
    setNotice('');
    if (!courseCode && !studentId) return;
    let active = true;
    let inFlight = false;
    setLoading(true);
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await coursesApi.attestation({ courseCode, studentId });
        if (!active) return;
        if (res.code !== 200) throw new Error('Could not load assessments.');
        setRows(res.body.items);
      } catch {
        if (active) setNotice('Could not load assessments.');
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [courseCode, studentId, revision]);

  const roster = editable
    ? enrollments.filter((e) => e.courseCode === courseCode && e.status === 'Approved').map((e) => ({
        key: e.studentId, name: e.studentName, student: e.studentId, course: e.courseCode,
        assessment: rows.find((r) => r.course_code === e.courseCode && r.student_id === e.studentId),
      }))
    : rows.map((r) => ({ key: r.course_code, name: r.course_code + ' · ' + r.title, student: r.student_id, course: r.course_code, assessment: r }));

  return <section className="mx-auto max-w-6xl space-y-4">
    <div className={card}>
      <h2 className="text-xl font-extrabold text-[#0F1F3D]">{editable ? 'Gradebook' : 'Attestation and Final Grades'}</h2>
      {editable && <label className="mt-3 block text-sm">Assigned course <select className={input + ' ml-2'}
        value={courseCode ?? ''} onChange={(e) => setSelection(e.target.value)}>
        {courses.map((course) => <option key={course.id} value={course.code}>{course.code} · {course.title}</option>)}
      </select></label>}
    </div>
    {loading && <p role="status">Loading assessments…</p>}
    {notice && <p role="alert" className="text-red-700">{notice}</p>}
    {!loading && !roster.length && <p className={card}>{editable ? 'No approved students in this course.' : 'No grades available.'}</p>}
    {roster.map(({ key, ...entry }) => <Assessment key={key + ':' + entry.course} {...entry} editable={editable}
      saved={() => { setRevision((value) => value + 1); void refreshFromServer(); }} />)}
  </section>;
}

function Assessment({ name, student, course, assessment, editable, saved }: {
  name: string; student: string; course: string; assessment?: AttestationItem; editable: boolean; saved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(false);
  const values = [assessment?.attestation_1, assessment?.attestation_2, assessment?.final_exam];
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const score = (key: string) => fields.get(key) === '' ? null : Number(fields.get(key));
    setBusy(true);
    setError(false);
    try {
      const result = await coursesApi.savePoints({
        studentId: student, courseCode: course, attestation1: score('a1'),
        attestation2: score('a2'), finalExam: score('exam'),
      });
      setNotice(result.body.message);
      setError(result.code !== 200);
      if (result.code === 200) saved();
    } catch {
      setError(true);
      setNotice('Could not save points.');
    } finally {
      setBusy(false);
    }
  };
  return <article className={card}>
    <h3 className="font-bold text-[#0F1F3D]">{name}</h3>
    {editable && <p className="text-xs text-slate-500">{student}</p>}
    <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={save}>
      {['Attestation 1', 'Attestation 2', 'Final Exam'].map((label, index) =>
        <label className="text-xs font-semibold" key={label}>{label}
          {editable ? <input className={input + ' mt-1 block w-24'} type="number" min="0" max={index === 2 ? 40 : 30}
            step="0.01" name={['a1', 'a2', 'exam'][index]} key={String(values[index])} defaultValue={values[index] ?? ''} />
            : <span className="mt-1 block text-sm">{values[index] ?? '—'}</span>}
        </label>)}
      {editable && <button className={button} disabled={busy}>Save points</button>}
    </form>
    <p className="mt-3 text-sm text-slate-600">Rating {assessment?.rating ?? '—'} · Admission {assessment ? (assessment.admitted ? 'Admitted' : 'Pending requirements') : '—'} · Total {assessment?.total ?? '—'} · Letter {assessment?.letter ?? '—'}</p>
    {notice && <p role="status" className={'mt-2 text-sm ' + (error ? 'text-red-700' : 'text-emerald-700')}>{notice}</p>}
  </article>;
}

interface PortalEvent { id: string; title: string; description: string; starts_at: string; volunteer: boolean; registered: boolean }
export function EventsPage() {
  const { currentUser } = useApp();
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => api<{ events: PortalEvent[] }>('/events')
      .then((result) => { if (active) setEvents(result.events); })
      .catch(() => { if (active) setStatus('Could not load events.'); })
      .finally(() => { if (active) setLoading(false); });
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const register = async (id: string) => {
    try {
      const result = await api<{ message: string }>('/events/' + id + '/register', 'POST');
      setEvents((previous) => previous.map((event) => event.id === id ? { ...event, registered: true } : event));
      setStatus(result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not register.');
    }
  };
  return <section className="mx-auto max-w-6xl space-y-4">
    <h2 className={card + ' text-xl font-extrabold'}>Events and Volunteering</h2>
    {status && <p role="status">{status}</p>}
    {loading ? <p role="status">Loading events…</p> : !events.length && <p className={card}>No events are listed.</p>}
    {events.map((event) => <article key={event.id} className={card}>
      <h3 className="font-semibold">{event.title}</h3>
      <p className="text-sm text-slate-600">{new Date(event.starts_at).toLocaleString()} {event.volunteer && '· Volunteering'}</p>
      <p className="my-2 text-sm">{event.description}</p>
      {currentUser?.role === 'STUDENT' && <button className={button}
        disabled={event.registered || new Date(event.starts_at).getTime() <= Date.now()} onClick={() => void register(event.id)}>
        {event.registered ? 'Registered' : 'Register'}
      </button>}
    </article>)}
  </section>;
}
