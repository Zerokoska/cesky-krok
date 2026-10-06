import { useEffect, useRef, useState } from 'react';
import type { AudioRef } from '../content/schema';
import { useApp } from '../data/context';
import { claim, playSegment, release } from '../lib/audio';
import { speak, useCzechVoice } from '../lib/tts';
import { Icon } from './Icon';

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const trackNo = (track: string) => track.replace(/^CD(\d)_track_(\d+)$/, 'CD$1 · $2');

function useAudioUrl(track: string) {
  const { content } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    content.audioUrl(track).then(
      (u) => alive && setUrl(u),
      (e) => alive && setError(String(e.message ?? e)),
    );
    return () => {
      alive = false;
    };
  }, [content, track]);
  return { url, error };
}

/**
 * Player with a seek bar for a textbook recording. With `start`/`end` it plays
 * only that part and the bar covers just that range.
 */
export function AudioPlayer({ audio }: { audio: AudioRef }) {
  const { url, error } = useAudioUrl(audio.track);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [full, setFull] = useState(0);
  const [slow, setSlow] = useState(false);
  const elRef = useRef<HTMLAudioElement | null>(null);
  const from = audio.start ?? 0;
  const to = audio.end ?? full;
  const dur = Math.max(0, to - from);

  useEffect(() => {
    if (!url) return;
    // Own element per player so two players of one track keep separate positions.
    const el = new Audio();
    el.preload = 'metadata';
    el.src = url;
    elRef.current = el;
    const onTime = () => {
      if (audio.end !== undefined && el.currentTime >= audio.end) {
        el.pause();
        el.currentTime = from;
      }
      setTime(Math.max(0, el.currentTime - from));
    };
    const onMeta = () => setFull(el.duration);
    const onPause = () => {
      setPlaying(false);
      release(el);
    };
    const onPlay = () => setPlaying(true);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onPause);
    el.addEventListener('play', onPlay);
    return () => {
      el.pause();
      release(el);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onPause);
      el.removeEventListener('play', onPlay);
      el.src = '';
    };
  }, [url, from, audio.end]);

  const toggle = async () => {
    const el = elRef.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    claim(el, () => el.pause());
    el.playbackRate = slow ? 0.75 : 1;
    if (el.ended || el.currentTime < from || (audio.end !== undefined && el.currentTime >= audio.end)) el.currentTime = from;
    await el.play().catch(() => setPlaying(false));
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = elRef.current;
    if (!el || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.currentTime = from + Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur));
  };

  const toggleSlow = () => {
    setSlow((s) => {
      if (elRef.current) elRef.current.playbackRate = s ? 1 : 0.75;
      return !s;
    });
  };

  if (error) return <div className="error-box small">Аудіо {trackNo(audio.track)}: {error}</div>;

  return (
    <div className="player">
      <button type="button" className={`icon-btn${playing ? ' playing' : ''}`} onClick={toggle} disabled={!url} aria-label={playing ? 'Пауза' : 'Слухати'}>
        <Icon name={playing ? 'pause' : 'play'} />
      </button>
      <div className="player-label">
        <div>{audio.label ?? 'Poslouchejte'}</div>
        <div className="muted small">{trackNo(audio.track)}</div>
      </div>
      <div className="player-track" onClick={seek} role="slider" aria-valuemin={0} aria-valuemax={dur} aria-valuenow={time} aria-label="Перемотати">
        <span style={{ width: dur ? `${(time / dur) * 100}%` : 0 }} />
      </div>
      <div className="player-time">
        {fmt(time)} / {fmt(dur)}
      </div>
      <button type="button" className={`btn small ghost`} onClick={toggleSlow} title="Повільніше">
        {slow ? '0.75×' : '1×'}
      </button>
    </div>
  );
}

/** Small round button that plays one segment of a track. */
export function SegmentButton({ audio, label }: { audio: AudioRef; label?: string }) {
  const { url, error } = useAudioUrl(audio.track);
  const [playing, setPlaying] = useState(false);
  const play = () => {
    if (!url) return;
    playSegment(url, audio.start ?? 0, audio.end, setPlaying).catch(() => setPlaying(false));
  };
  return (
    <button
      type="button"
      className={`icon-btn${playing ? ' playing' : ''}`}
      onClick={play}
      disabled={!url || !!error}
      aria-label={label ?? 'Прослухати'}
      title={error ?? label ?? 'Прослухати'}
    >
      <Icon name="speaker" />
    </button>
  );
}

/** Speaks Czech text with the device voice; hidden when no Czech voice exists. */
export function SpeakButton({ text }: { text: string }) {
  const ok = useCzechVoice();
  if (!ok) return null;
  return (
    <button type="button" className="icon-btn" onClick={() => speak(text)} aria-label={`Вимовити: ${text}`} title="Вимовити">
      <Icon name="speaker" />
    </button>
  );
}

/** Plays a segment if given, otherwise speaks `say` with TTS. */
export function Listen({ audio, say }: { audio?: AudioRef; say?: string }) {
  if (audio) return <SegmentButton audio={audio} />;
  if (say) return <SpeakButton text={say} />;
  return null;
}
