import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Loading({ label = 'Завантаження…' }: { label?: string }) {
  return <div className="empty">{label}</div>;
}

export function ErrorBox({ error }: { error: Error | string }) {
  return <div className="error-box">{typeof error === 'string' ? error : error.message}</div>;
}

export function BookRef({ page, exercises, book = 'Učebnice' }: { page: number; exercises?: string; book?: string }) {
  return (
    <span className="chip book" title="Відкрийте паперову книжку на цій сторінці">
      <Icon name="book" size={14} />
      {book} s. {page}
      {exercises ? `, ${exercises}` : ''}
    </span>
  );
}

export function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = max ? score / max : 0;
  const tone = pct >= 0.85 ? 'good' : pct >= 0.5 ? 'mid' : 'low';
  return (
    <span className={`badge-score ${tone}`}>
      {score} / {max}
    </span>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function TeacherPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="teacher-panel">
      <h3>
        <Icon name="teacher" /> {title}
      </h3>
      {children}
    </section>
  );
}

export const percent = (score: number, max: number) => (max ? Math.round((score / max) * 100) : 0);

/** Ukrainian plural: plural(5, ['спроба', 'спроби', 'спроб']) → "5 спроб". */
export function plural(n: number, [one, few, many]: [string, string, string]) {
  const d = n % 10;
  const dd = n % 100;
  const word = d === 1 && dd !== 11 ? one : d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
  return `${n} ${word}`;
}

export const dateUk = (iso: string) =>
  new Date(iso).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
