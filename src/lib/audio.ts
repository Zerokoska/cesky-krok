/**
 * One shared <audio> element per track URL, and only one sound at a time
 * (recordings and speech synthesis alike). Segment playback stops at `end`.
 */
const elements = new Map<string, HTMLAudioElement>();

export type Claim = { stop: () => void };
let current: Claim | null = null;

export function audioFor(url: string): HTMLAudioElement {
  let el = elements.get(url);
  if (!el) {
    el = new Audio();
    el.preload = 'metadata';
    el.src = url;
    elements.set(url, el);
  }
  return el;
}

function cancelSpeech() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

export function stopAll() {
  const prev = current;
  current = null;
  prev?.stop();
  cancelSpeech();
}

/** Takes the "now playing" slot; whatever played before is stopped, even on the same element. */
export function claim(stop: () => void): Claim {
  const entry = { stop };
  const prev = current;
  current = entry;
  prev?.stop();
  cancelSpeech();
  return entry;
}

export function release(entry: Claim | null | undefined) {
  if (entry && current === entry) current = null;
}

function whenReady(el: HTMLAudioElement): Promise<void> {
  if (el.readyState >= 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error('Аудіо не завантажилось'));
    };
    const cleanup = () => {
      el.removeEventListener('loadedmetadata', ok);
      el.removeEventListener('error', fail);
    };
    el.addEventListener('loadedmetadata', ok);
    el.addEventListener('error', fail);
    el.load();
  });
}

/** Plays [start, end) of the track. */
export async function playSegment(url: string, start = 0, end?: number, onState?: (playing: boolean) => void) {
  const el = audioFor(url);
  let stopped = false;
  let timer: number | undefined;
  const tick = () => {
    if (end !== undefined && el.currentTime >= end) stop();
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    el.pause();
    el.removeEventListener('timeupdate', tick);
    el.removeEventListener('ended', stop);
    window.clearInterval(timer);
    release(entry);
    onState?.(false);
  };
  // Claim first so a previous segment on this element is fully detached.
  const entry = claim(stop);
  onState?.(true);
  try {
    await whenReady(el);
    if (stopped) return;
    el.currentTime = start;
    el.playbackRate = 1;
    el.addEventListener('timeupdate', tick);
    el.addEventListener('ended', stop);
    // timeupdate fires ~4×/s; poll faster for tight segment ends.
    timer = window.setInterval(tick, 40);
    await el.play();
  } catch (e) {
    // AbortError here just means another sound took over.
    stop();
    if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
  }
}
