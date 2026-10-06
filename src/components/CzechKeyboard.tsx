import { useEffect, useState } from 'react';

const LETTERS = ['á', 'č', 'ď', 'é', 'ě', 'í', 'ň', 'ó', 'ř', 'š', 'ť', 'ú', 'ů', 'ý', 'ž'];

const isCzField = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.dataset.cz !== undefined;

function insert(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  el.focus();
  // execCommand keeps undo history and fires React's onChange.
  if (document.execCommand?.('insertText', false, text)) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, el.value.slice(0, start) + text + el.value.slice(end));
  el.setSelectionRange(start + text.length, start + text.length);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Floating bar with Czech letters, shown while a field marked `data-cz` has focus.
 * Hidden on touch devices: their keyboards offer the letters on long-press.
 */
export function CzechKeyboard() {
  const [target, setTarget] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [upper, setUpper] = useState(false);
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    const onFocus = () => {
      const el = document.activeElement;
      setTarget(isCzField(el) && !el.readOnly && !el.disabled ? el : null);
    };
    const onBlur = () => setTimeout(onFocus, 0);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
    };
  }, []);

  if (!target || coarse) return null;

  return (
    <div className="czkb" role="toolbar" aria-label="Чеські літери">
      <button
        type="button"
        className={upper ? 'on' : ''}
        onMouseDown={(e) => {
          e.preventDefault();
          setUpper((u) => !u);
        }}
        title="Великі літери"
      >
        ⇧
      </button>
      {LETTERS.map((l) => {
        const ch = upper ? l.toUpperCase() : l;
        return (
          <button
            type="button"
            key={l}
            onMouseDown={(e) => {
              e.preventDefault();
              insert(target, ch);
              if (upper) setUpper(false);
            }}
          >
            {ch}
          </button>
        );
      })}
    </div>
  );
}
