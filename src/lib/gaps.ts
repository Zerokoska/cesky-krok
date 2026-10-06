export type GapPart = { text: string } | { gap: string; index: number };

/** Splits "Já {jsem} student." into text parts and numbered gaps. */
export function parseGaps(text: string): GapPart[] {
  const parts: GapPart[] = [];
  const re = /\{([^}]+)\}/g;
  let last = 0;
  let index = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ gap: m[1], index: index++ });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export function gapAnswers(text: string): string[] {
  return parseGaps(text).flatMap((p) => ('gap' in p ? [p.gap] : []));
}

/** "pracují|pracujou" → "pracují / pracujou" for display. */
export function showKey(key: string): string {
  return key.split('|').join(' / ');
}
