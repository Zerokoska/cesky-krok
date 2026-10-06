import { useState, type ElementType } from 'react';
import type { Bilingual } from '../content/schema';
import { useApp } from '../data/context';

/** Czech text; the Ukrainian translation opens behind a small "UA" toggle. */
export function Bi({ text, as: Tag = 'span', className }: { text: Bilingual; as?: ElementType; className?: string }) {
  const { showTranslations } = useApp();
  const [open, setOpen] = useState(false);
  const shown = showTranslations || open;
  return (
    <Tag className={className}>
      <span className="bi">{text.cs}</span>
      {text.uk && !showTranslations && (
        <button
          type="button"
          className={`hint-btn${open ? ' on' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          title="Переклад українською"
          aria-pressed={open}
        >
          UA
        </button>
      )}
      {text.uk && shown && <span className="bi-uk">{text.uk}</span>}
    </Tag>
  );
}
