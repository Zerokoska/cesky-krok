import { useMemo, useState } from 'react';
import { shuffledIndices } from '../lib/shuffle';
import type { ExProps } from './types';

export function Match({ ex, value, onChange, result, reveal, seed }: ExProps<'match'>) {
  const right = useMemo(() => shuffledIndices(ex.pairs.length, seed), [ex.pairs.length, seed]);
  const [active, setActive] = useState<number | null>(null);

  const assign = (rightIdx: number) => {
    if (active === null) return;
    const next = value.map((v) => (v === rightIdx ? null : v));
    next[active] = rightIdx;
    onChange(next);
    const free = next.findIndex((v, i) => v === null && i !== active);
    setActive(free >= 0 ? free : null);
  };

  const ownerOf = (rightIdx: number) => value.findIndex((v) => v === rightIdx);

  return (
    <div>
      {!result && <p className="muted small">Натисніть ліворуч, потім відповідну пару праворуч.</p>}
      <div className="match">
        <div className="match-col">
          {ex.pairs.map((p, i) => {
            let cls = active === i ? ' sel' : '';
            if (result) cls = result.items[i]?.correct ? ' ok' : ' bad';
            return (
              <div key={i}>
                <button type="button" className={`opt${cls}`} disabled={!!result} onClick={() => setActive(i)}>
                  <span className="q-num">{i + 1}</span>
                  {p.left}
                </button>
                {reveal && result && !result.items[i]?.correct && <div className="fix">→ {p.right}</div>}
              </div>
            );
          })}
        </div>
        <div className="match-col">
          {right.map((ri) => {
            const owner = ownerOf(ri);
            const keyed = reveal && !result;
            return (
              <button
                type="button"
                key={ri}
                className={`opt${owner >= 0 ? ' sel' : ''}`}
                disabled={!!result}
                onClick={() => assign(ri)}
              >
                {ex.pairs[ri].right}
                {owner >= 0 && <span className="pair-tag">{owner + 1}</span>}
                {keyed && owner < 0 && <span className="pair-tag" style={{ background: 'var(--ok)' }}>{ri + 1}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
