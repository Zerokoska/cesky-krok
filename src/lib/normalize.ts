/** Answer normalisation for typed Czech answers. */

export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[–—−]/g, '-')
    .replace(/[“”„«»"]/g, '')
    .replace(/[‘’‚]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?,;:…]+$/u, '')
    .trim()
    .toLowerCase();
}

export function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

export type TextVerdict = { correct: boolean; almost: boolean };

/** Compares a typed answer to the key. The key may list alternatives separated by `|`. */
export function compareText(given: string, expected: string): TextVerdict {
  const g = normalize(given);
  if (!g) return { correct: false, almost: false };
  const options = expected.split('|').map(normalize);
  if (options.includes(g)) return { correct: true, almost: false };
  const bare = stripDiacritics(g);
  const almost = options.some((o) => stripDiacritics(o) === bare);
  return { correct: false, almost };
}
