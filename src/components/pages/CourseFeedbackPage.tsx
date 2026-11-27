import React, { useEffect, useState } from 'react';
import { api } from '../../api/portalApi';

const questions = [
  ['clarity', 'How clearly were course topics explained?'],
  ['materials', 'How useful were the course materials and assignments?'],
  ['workload', 'How manageable was the workload?'],
] as const;

interface CourseOption {
  code: string;
  title: string;
  submitted: boolean;
}

const card = 'rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm';

export function CourseFeedbackPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selection, setSelection] = useState('');
  const [semester, setSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selected = courses.find((course) => course.code === selection);

  useEffect(() => {
    let active = true;
    api<{ courses: CourseOption[]; semester: string }>('/surveys/course-feedback')
      .then((data) => {
        if (!active) return;
        setCourses(data.courses);
        setSemester(data.semester);
        setSelection(data.courses.find((course) => !course.submitted)?.code ?? data.courses[0]?.code ?? '');
      })
      .catch(() => { if (active) setError('Could not load the course survey.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || selected.submitted || busy) return;
    const fields = new FormData(event.currentTarget);
    const ratings = Object.fromEntries(questions.map(([key]) => [key, Number(fields.get(key))]));
    const courseCode = selected.code;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ message: string }>('/surveys/course-feedback', 'POST',
        { courseCode, ...ratings, feedback: fields.get('feedback') ?? '' });
      setCourses((current) => current.map((course) => course.code === courseCode ? { ...course, submitted: true } : course));
      setMessage(result.message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not submit feedback.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="mx-auto max-w-3xl space-y-4">
    <header className={card}>
      <h2 className="text-xl font-extrabold text-[#0F1F3D]">Course Feedback</h2>
      {semester && <p className="mt-1 text-sm text-slate-600">{semester} · One response per enrolled course</p>}
      <p className="mt-1 text-sm text-slate-600">Feedback is saved separately from your student ID.</p>
    </header>
    {loading && <p role="status" className={card}>Loading courses…</p>}
    {error && <p role="alert" className={card + ' text-red-700'}>{error}</p>}
    {message && <p role="status" className={card + ' text-emerald-800'}>{message}</p>}
    {!loading && !courses.length && !error && <p className={card}>No enrolled courses are available for feedback.</p>}
    {selected && <div className={card}>
      <label className="block text-sm font-semibold">Course
        <select className="mt-1 block w-full rounded-lg border border-[#D6E2F5] p-2" value={selection} disabled={busy}
          onChange={(event) => { setSelection(event.target.value); setMessage(''); setError(''); }}>
          {courses.map((course) => <option key={course.code} value={course.code}>
            {course.code} · {course.title}{course.submitted ? ' (submitted)' : ''}
          </option>)}
        </select>
      </label>
      {selected.submitted ? <p className="mt-4 text-sm font-semibold text-emerald-800">Feedback submitted for this course.</p>
        : <form key={selected.code} onSubmit={submit} className="mt-5 space-y-4">
          {questions.map(([name, label]) => <fieldset key={name} className="rounded-xl border border-[#D6E2F5] px-3 pb-3">
            <legend className="px-1 text-sm font-semibold">{label}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => <label key={value} className="flex items-center gap-1 rounded-lg border border-[#D6E2F5] px-3 py-2 text-sm">
                <input required type="radio" name={name} value={value} /> {value}
              </label>)}
            </div>
            <p className="mt-2 text-xs text-slate-500">1 = Very poorly · 5 = Very well</p>
          </fieldset>)}
          <label className="block text-sm font-semibold">What would you improve? (optional)
            <textarea name="feedback" rows={3} maxLength={500} placeholder="Please leave out names and other identifying information."
              className="mt-1 block w-full rounded-lg border border-[#D6E2F5] p-2" />
          </label>
          <button disabled={busy} className="rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Submitting…' : 'Submit feedback'}
          </button>
        </form>}
    </div>}
  </section>;
}
