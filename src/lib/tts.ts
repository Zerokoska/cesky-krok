import { useEffect, useState } from 'react';
import { stopAll } from './audio';

/** Czech speech synthesis via the browser (Web Speech API). */

function czechVoice(): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === 'undefined') return undefined;
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('cs'));
}

export function speak(text: string, rate = 0.9) {
  const voice = czechVoice();
  if (!voice) return;
  stopAll();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = rate;
  speechSynthesis.speak(u);
}

/** True once a Czech voice is available on this device. */
export function useCzechVoice(): boolean {
  const [ok, setOk] = useState(() => !!czechVoice());
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const update = () => setOk(!!czechVoice());
    update();
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return ok;
}
