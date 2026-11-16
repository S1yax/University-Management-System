import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useApp, TimeSimulationMode } from '../../context/AppContext';

const OPTIONS: { mode: TimeSimulationMode; label: string }[] = [
  { mode: 'REAL_TIME', label: 'Реальное время' },
  { mode: 'BEFORE_LESSON', label: 'До урока 15:15' },
  { mode: 'DURING_LESSON_H1', label: 'Час 1 · 16:25' },
  { mode: 'DURING_LESSON_H2', label: 'Час 2 · 17:25' },
  { mode: 'DURING_LESSON_H3', label: 'Час 3 · 18:25' },
  { mode: 'AFTER_LESSON', label: 'После урока 19:45' },
];

/**
 * Test time for demos: makes the website (and the server) act as if it is that hour of the lesson.
 * The choice is kept in this browser. Choose it on every device you test with.
 */
export const TestTimePicker: React.FC = () => {
  const { timeSimulationMode, setTimeSimulationMode } = useApp();
  const isTest = timeSimulationMode !== 'REAL_TIME';
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        isTest ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}
      title="Тестовое время: проверить почасовую отметку в любое время дня"
    >
      <FlaskConical className="w-3.5 h-3.5" />
      <span>Тестовое время:</span>
      <select
        value={timeSimulationMode === 'DURING_LESSON' ? 'DURING_LESSON_H1' : timeSimulationMode}
        onChange={(e) => setTimeSimulationMode(e.target.value as TimeSimulationMode)}
        className="bg-transparent font-bold outline-none cursor-pointer"
        aria-label="Тестовое время"
      >
        {OPTIONS.map((o) => (
          <option key={o.mode} value={o.mode}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
};
