import { useRef } from 'react';
import { parseGaps, showKey } from '../lib/gaps';
import type { ItemResult } from '../lib/grade';
import type { ExProps } from './types';

export function GapInput({
  value,
  onChange,
  result,
  reveal,
  expected,
  onFocus,
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  result?: ItemResult;
  reveal: boolean;
  expected: string;
  onFocus?: () => void;
  width?: number;
}) {
  const st = result ? (result.correct ? ' ok' : result.almost ? ' almost' : ' bad') : '';
  const size = Math.max(4, width ?? expected.split('|')[0].length + 2);
  return (
    <>
      <input
        className={`gap${st}`}
        data-cz=""
        value={value}
        readOnly={!!result}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: `${size + 1}ch` }}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Пропуск"
      />
      {result && !result.correct && (reveal || result.almost) && (
        <span className={`fix${result.almost && !reveal ? ' almost' : ''}`}>
          {reveal ? showKey(expected) : 'háček/čárka?'}
        </span>
      )}
      {!result && reveal && <span className="fix">{showKey(expected)}</span>}
    </>
  );
}

export function GapFill({ ex, value, onChange, result, reveal }: ExProps<'gapfill'>) {
  const focus = useRef<[number, number] | null>(null);
  let flat = 0;
  const parts = ex.items.map((it) => {
    const p = parseGaps(it.text);
    const offset = flat;
    flat += p.filter((x) => 'gap' in x).length;
    return { it, parts: p, offset };
  });

  const set = (i: number, g: number, v: string) =>
    onChange((prev) => prev.map((row, r) => (r === i ? row.map((c, k) => (k === g ? v : c)) : row)));

  const used = new Set(value.flat().map((v) => v.trim().toLowerCase()));

  const fromBank = (word: string) => {
    if (result) return;
    let target = focus.current;
    if (!target || value[target[0]]?.[target[1]]) {
      // first empty gap
      outer: for (let i = 0; i < value.length; i++)
        for (let g = 0; g < value[i].length; g++)
          if (!value[i][g]) {
            target = [i, g];
            break outer;
          }
    }
    if (target) set(target[0], target[1], word);
  };

  return (
    <div>
      {ex.bank && (
        <div className="bank" aria-label="Слова для вставки">
          {ex.bank.map((w, i) => (
            <button type="button" key={i} className={used.has(w.trim().toLowerCase()) ? 'used' : ''} onClick={() => fromBank(w)}>
              {w}
            </button>
          ))}
        </div>
      )}
      {parts.map(({ it, parts: p, offset }, i) => (
        <div className="gap-line" key={i}>
          {it.speaker && <span className="speaker">{it.speaker}:</span>}
          {p.map((part, k) =>
            'gap' in part ? (
              <GapInput
                key={k}
                value={value[i]?.[part.index] ?? ''}
                onChange={(v) => set(i, part.index, v)}
                onFocus={() => (focus.current = [i, part.index])}
                result={result?.items[offset + part.index]}
                reveal={reveal}
                expected={part.gap}
              />
            ) : (
              <span key={k}>{part.text}</span>
            ),
          )}
          {it.uk && <span className="bi-uk">{it.uk}</span>}
        </div>
      ))}
    </div>
  );
}
