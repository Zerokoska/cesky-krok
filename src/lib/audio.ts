/**
 * One shared <audio> element per track URL, and only one sound at a time.
 * Segment playback stops at `end`.
 */
const elements = new Map<string, HTMLAudioElement>();
let current: { el: HTMLAudioElement; stop: () => void } | null = null;

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

export function stopAll() {
  current?.stop();
  current = null;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/** Claims the single "now playing" slot; the previous sound is stopped. */
export function claim(el: HTMLAudioElement, stop: () => void) {
  if (current && current.el !== el) current.stop();
  current = { el, stop };
}

export function release(el: HTMLAudioElement) {
  if (current?.el === el) current = null;
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

/** Plays [start, end) of the track; resolves when it stops. */
export async function playSegment(url: string, start = 0, end?: number, onState?: (playing: boolean) => void) {
  const el = audioFor(url);
  await whenReady(el);
  let timer: number | undefined;
  const stop = () => {
    el.pause();
    el.removeEventListener('timeupdate', tick);
    el.removeEventListener('ended', stop);
    window.clearInterval(timer);
    release(el);
    onState?.(false);
  };
  const tick = () => {
    if (end !== undefined && el.currentTime >= end) stop();
  };
  claim(el, stop);
  el.currentTime = start;
  el.playbackRate = 1;
  el.addEventListener('timeupdate', tick);
  el.addEventListener('ended', stop);
  // timeupdate fires ~4×/s; poll a bit faster for tight segment ends.
  timer = window.setInterval(tick, 60);
  onState?.(true);
  try {
    await el.play();
  } catch (e) {
    stop();
    throw e;
  }
}
