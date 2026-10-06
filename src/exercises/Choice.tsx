import { Listen } from '../components/Audio';
import { Bi } from '../components/Bi';
import { shuffledIndices } from '../lib/shuffle';
import type { ExProps } from './types';

export function Choice({ ex, value, onChange, result, reveal, seed }: ExProps<'choice'>) {
  return (
    <div>
      {ex.items.map((it, i) => {
        const order = ex.fixed ? it.options.map((_, k) => k) : shuffledIndices(it.options.length, `${seed}:${i}`);
        return (
          <div className="q" key={i}>
            <div className="q-prompt">
              <span className="q-num">{i + 1}.</span>
              <Listen audio={it.audio} say={it.say} />
              <Bi text={it.prompt} />
            </div>
            <div className="opt-grid">
              {order.map((k) => {
                const o = it.options[k];
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
                    onClick={() => onChange((prev) => prev.map((v, j) => (j === i ? k : v)))}
                  >
                    {o}
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
