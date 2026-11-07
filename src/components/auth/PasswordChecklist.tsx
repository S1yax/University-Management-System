import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { PasswordRule } from '../../utils/passwordPolicy';

/** Live list of password rules: each one turns green as soon as it is satisfied. */
export const PasswordChecklist: React.FC<{ rules: PasswordRule[]; started: boolean }> = ({ rules, started }) => (
  <ul className="space-y-1" aria-label="Password requirements">
    {rules.map((rule) => (
      <li
        key={rule.id}
        className={`flex items-start gap-1.5 text-[11px] leading-snug ${
          rule.passed ? 'text-emerald-700' : started ? 'text-slate-600' : 'text-slate-500'
        }`}
      >
        {rule.passed ? (
          <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0 text-emerald-600" />
        ) : (
          <Circle className="w-3.5 h-3.5 mt-px shrink-0 text-slate-300" />
        )}
        <span>{rule.label}</span>
      </li>
    ))}
  </ul>
);