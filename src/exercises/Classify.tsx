import { useMemo } from 'react';
import { shuffledIndices } from '../lib/shuffle';
import type { ExProps } from './types';

const toneClass = (tone?: string) => (tone === 'm' ? ' tone-m' : tone === 'f' ? ' tone-f' : tone === 'n' ? ' tone-n' : '');

export function Classify({ ex, value, onChange, result, reveal, seed }: ExProps<'classify'>) {
  const order = useMemo(() => shuffledIndices(ex.items.length, seed), [ex.items.length, seed]);
  return (
    <div>
      {order.map((i) => {
        const it = ex.items[i];
        const r = result?.items[i];
        return (
          <div className="classify-row" key={i}>
            <div className="classify-text">
              {it.text}
              {r && <span className={`mark ${r.correct ? 'ok' : 'bad'}`}> {r.correct ? '✓' : '✗'}</span>}
            </div>
            <div className="cat-btns">
              {ex.categories.map((c) => {
                const sel = value[i] === c.id;
                const want = it.category === c.id;
                let cls = (sel ? ' sel' : '') + toneClass(c.tone);
                if (result) {
                  if (sel) cls = want ? ' ok' : ' bad';
                  else if (reveal && want) cls = ' ok key';
                } else if (reveal && want) cls += ' key';
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`opt${cls}`}
                    disabled={!!result}
                    onClick={() => onChange((prev) => prev.map((v, j) => (j === i ? c.id : v)))}
                  >
                    {c.label.cs}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
