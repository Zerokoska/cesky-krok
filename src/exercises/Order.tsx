import { useMemo } from 'react';
import { shuffledIndices } from '../lib/shuffle';
import type { ExProps } from './types';

export function Order({ ex, value, onChange, result, reveal, seed }: ExProps<'order'>) {
  const pool = useMemo(() => shuffledIndices(ex.items.length, seed), [ex.items.length, seed]);
  const remaining = pool.filter((i) => !value.includes(i));

  return (
    <div>
      <div className="order-slots" aria-label="Ваш порядок">
        {value.length === 0 && <div className="muted small">Натискайте на рядки внизу в правильному порядку.</div>}
        {value.map((idx, pos) => {
          const st = result ? (result.items[pos]?.correct ? ' ok' : ' bad') : '';
          return (
            <button
              type="button"
              key={idx}
              className={`order-item${st}`}
              disabled={!!result}
              onClick={() => onChange((prev) => prev.filter((v) => v !== idx))}
              title="Прибрати"
            >
              <span className="n">{pos + 1}.</span>
              {ex.items[idx]}
            </button>
          );
        })}
      </div>
      {!result && remaining.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          {remaining.map((idx) => (
            <button type="button" key={idx} className="order-item" onClick={() => onChange((prev) => (prev.includes(idx) ? prev : [...prev, idx]))}>
              <span className="n">+</span>
              {ex.items[idx]}
            </button>
          ))}
        </div>
      )}
      {reveal && (
        <div className="note" style={{ marginTop: 12 }}>
          <div className="note-title">Správné pořadí</div>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {ex.items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
