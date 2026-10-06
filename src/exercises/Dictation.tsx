import { Listen } from '../components/Audio';
import { useCzechVoice } from '../lib/tts';
import { GapInput } from './GapFill';
import type { ExProps } from './types';

export function Dictation({ ex, value, onChange, result, reveal }: ExProps<'dictation'>) {
  const voice = useCzechVoice();
  const needsVoice = ex.items.some((it) => !it.audio && it.say);
  return (
    <div>
      {needsVoice && !voice && (
        <p className="almost-msg">На цьому пристрої немає чеського голосу для озвучення. Попросіть учителя продиктувати.</p>
      )}
      {ex.items.map((it, i) => (
        <div className="q" key={i}>
          <div className="q-prompt">
            <span className="q-num">{i + 1}.</span>
            <Listen audio={it.audio} say={it.say} />
            {it.hint && <span className="muted">{it.hint}</span>}
            <GapInput
              value={value[i] ?? ''}
              onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))}
              result={result?.items[i]}
              reveal={reveal}
              expected={it.answer}
              width={Math.max(8, it.answer.split('|')[0].length + 2)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
