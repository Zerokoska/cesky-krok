import { Listen } from '../components/Audio';
import { Bi } from '../components/Bi';
import type { ExProps } from './types';

export function Choice({ ex, value, onChange, result, reveal }: ExProps<'choice'>) {
  return (
    <div>
      {ex.items.map((it, i) => (
        <div className="q" key={i}>
          <div className="q-prompt">
            <span className="q-num">{i + 1}.</span>
            <Listen audio={it.audio} say={it.say} />
            <Bi text={it.prompt} />
          </div>
          <div className="opt-grid">
            {it.options.map((o, k) => {
              const sel = value[i] === k;
              let cls = sel ? ' sel' : '';
              if (result) {
                if (sel) cls = k === it.answer ? ' ok' : ' bad';
                else if (reveal && k === it.answer) cls = ' ok key';
              } else if (reveal && k === it.answer) cls += ' key';
              return (
                <button
                  type="button"
                  key={k}
                  className={`opt${cls}`}
                  disabled={!!result}
                  onClick={() => onChange(value.map((v, j) => (j === i ? k : v)))}
                >
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
