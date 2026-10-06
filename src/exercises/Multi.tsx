import { Bi } from '../components/Bi';
import type { ExProps } from './types';

export function Multi({ ex, value, onChange, result, reveal }: ExProps<'multi'>) {
  const toggle = (g: number, k: number) => {
    const cur = value[g] ?? [];
    const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
    onChange(value.map((v, j) => (j === g ? next : v)));
  };
  return (
    <div>
      {ex.groups.map((g, gi) => (
        <div className="q" key={gi}>
          <div className="q-prompt">
            <span className="q-num">{gi + 1}.</span>
            <Bi text={g.label} />
            {result && (
              <span className={`mark ${result.items[gi]?.correct ? 'ok' : 'bad'}`}>{result.items[gi]?.correct ? '✓' : '✗'}</span>
            )}
          </div>
          <div className="opt-grid">
            {g.options.map((o, k) => {
              const sel = (value[gi] ?? []).includes(k);
              const want = g.answers.includes(k);
              let cls = sel ? ' sel' : '';
              if (result) {
                if (sel) cls = want ? ' ok' : ' bad';
                else if (reveal && want) cls = ' ok key';
              } else if (reveal && want) cls += ' key';
              return (
                <button type="button" key={k} className={`opt${cls}`} disabled={!!result} onClick={() => toggle(gi, k)}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
