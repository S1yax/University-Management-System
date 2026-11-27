import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CalendarClock, Check, Clock3, Plus, Undo2 } from 'lucide-react';
import { api } from '../../api/portalApi';
import { useApp } from '../../context/AppContext';

interface Task {
  id: string;
  courseCode: string | null;
  title: string;
  kind: string;
  dueAt: string;
  completedAt: string | null;
  demo: boolean;
}

type Status = 'In progress' | 'Overdue' | 'Completed';
type Filter = 'All' | Status;
const filters: Filter[] = ['All', 'In progress', 'Overdue', 'Completed'];
const kinds = ['SIS', 'TSIS', 'Assignment', 'Quiz', 'Other'];
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Almaty', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const border: Record<Status, string> = {
  'In progress': 'border-[#D6E2F5]',
  Overdue: 'border-red-500',
  Completed: 'border-emerald-500',
};
const labelColor: Record<Status, string> = {
  'In progress': 'text-slate-600',
  Overdue: 'text-red-700',
  Completed: 'text-emerald-700',
};
const field = 'mt-1 block w-full rounded-lg border border-[#D6E2F5] bg-white px-3 py-2 text-sm';
const primary = 'inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

function taskStatus(task: Task, now: number): Status {
  if (task.completedAt) return 'Completed';
  return Date.parse(task.dueAt) <= now ? 'Overdue' : 'In progress';
}

function dueLabel(task: Task, now: number) {
  const diff = Date.parse(task.dueAt) - now;
  const hours = Math.max(1, Math.ceil(Math.abs(diff) / 3_600_000));
  if (diff < 0) return hours >= 24 ? Math.floor(hours / 24) + 'd overdue' : hours + 'h overdue';
  if (diff <= 86_400_000) return 'Due in ' + hours + 'h';
  return null;
}

export function SmartTimetablePage() {
  const { courses, enrollments, refreshFromServer } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [semester, setSemester] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const approved = new Set(enrollments.filter((row) => row.status === 'Approved').map((row) => row.courseCode));
  const studentCourses = courses.filter((course) => approved.has(course.code));

  const load = useCallback(async () => {
    const result = await api<{ semester: string; tasks: Task[] }>('/timetable/tasks');
    setTasks(result.tasks);
    setSemester(result.semester);
  }, []);

  useEffect(() => {
    void load().catch(() => setError('Could not load your timetable.')).finally(() => setLoading(false));
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (!document.hidden) void load().catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const statusCounts = { 'In progress': 0, Overdue: 0, Completed: 0 };
  const listed = tasks.map((task) => {
    const status = taskStatus(task, now);
    statusCounts[status] += 1;
    return { task, status };
  });
  const visible = filter === 'All' ? listed : listed.filter((row) => row.status === filter);

  const syncReminders = () => {
    void api<{ created: number }>('/timetable/reminders', 'POST').then(async ({ created }) => {
      if (created) await refreshFromServer();
    }).catch(() => undefined);
  };

  const addTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy('new');
    setError('');
    setNotice('');
    try {
      await api('/timetable/tasks', 'POST', {
        title: data.get('title'), kind: data.get('kind'),
        dueLocal: data.get('due'), courseCode: data.get('course') || null,
      });
      setShowForm(false);
      setFilter('All');
      setNotice('Task added to your timetable.');
      await load();
      syncReminders();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save this task.');
    } finally {
      setBusy('');
    }
  };

  const toggle = async (task: Task) => {
    const completed = task.completedAt === null;
    setBusy(task.id);
    setError('');
    setNotice('');
    try {
      await api('/timetable/tasks/' + task.id, 'PATCH', { completed });
      await load();
      setNotice(completed ? 'Task marked completed.' : 'Task reopened.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not update this task.');
    } finally {
      setBusy('');
    }
  };

  return <section className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-extrabold text-[#0F1F3D]">Smart Timetable</h2>
        <p className="mt-1 text-sm text-slate-600">{semester && semester + ' · '}Deadlines in Almaty time</p>
      </div>
      <button type="button" className={primary} onClick={() => setShowForm((previous) => !previous)}>
        <Plus className="h-4 w-4" aria-hidden /> {showForm ? 'Close form' : 'Add task'}
      </button>
    </header>

    {showForm && <form onSubmit={addTask} className="space-y-3 rounded-2xl border border-[#D6E2F5] bg-white p-5 shadow-sm">
      <h3 className="font-bold">Add a personal deadline</h3>
      <label className="block text-sm font-semibold">Task title
        <input name="title" className={field} required maxLength={120} placeholder="Read chapter 4" />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">Type
          <select name="kind" className={field} defaultValue="Assignment">
            {kinds.map((kind) => <option key={kind}>{kind}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Course
          <select name="course" className={field}>
            <option value="">General task</option>
            {studentCourses.map((course) => <option key={course.code} value={course.code}>{course.code}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Deadline (Almaty time)
          <input className={field} type="datetime-local" name="due" required />
        </label>
      </div>
      <button className={primary} disabled={!!busy}>{busy === 'new' ? 'Saving…' : 'Save task'}</button>
    </form>}

    <p className="flex items-center gap-2 text-sm text-slate-600">
      <Bell className="h-4 w-4 shrink-0 text-[#0B3D91]" aria-hidden />
      Portal reminders appear within 24 hours of a deadline and when a task becomes overdue.
    </p>

    <div className="flex flex-wrap gap-2" aria-label="Filter tasks">
      {filters.map((status) => (
        <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}
          className={'rounded-full border px-3 py-1.5 text-sm font-semibold ' + (filter === status
            ? 'border-[#0B3D91] bg-[#0B3D91] text-white' : 'border-[#D6E2F5] bg-white text-slate-700')}>
          {status} ({status === 'All' ? tasks.length : statusCounts[status]})
        </button>
      ))}
    </div>

    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    {loading && <p role="status" className="text-sm text-slate-500">Loading tasks…</p>}
    {!loading && !visible.length && <p className="rounded-2xl border border-[#D6E2F5] bg-white p-5 text-sm text-slate-500">
      {filter === 'All' ? 'No tasks yet. Add a deadline to get started.' : 'No tasks in this category.'}
    </p>}

    {visible.map(({ task, status }) => {
      const due = status === 'Completed' ? null : dueLabel(task, now);
      return <article key={task.id} className={'flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 bg-white p-5 shadow-sm ' + border[status]}>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-slate-500">
            {task.kind}{task.courseCode && ' · ' + task.courseCode}{task.demo && ' · Demo task'}
          </p>
          <h3 className="break-words font-bold text-[#0F1F3D]">{task.title}</h3>
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
            <time dateTime={task.dueAt}>{dateFormat.format(new Date(task.dueAt))}</time>
          </p>
          <p className={'flex items-center gap-1.5 text-xs font-semibold ' + labelColor[status]}>
            <Clock3 className="h-3.5 w-3.5" aria-hidden /> {status}{due && ' · ' + due}
          </p>
        </div>
        <button type="button" disabled={!!busy} onClick={() => void toggle(task)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6E2F5] px-3 py-2 text-sm font-semibold text-[#0B3D91] hover:bg-slate-50 disabled:opacity-50">
          {status === 'Completed' ? <Undo2 className="h-4 w-4" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
          {status === 'Completed' ? 'Reopen task' : 'Mark completed'}
        </button>
      </article>;
    })}
  </section>;
}
