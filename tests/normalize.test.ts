import { describe, expect, it } from 'vitest';
import { compareText, normalize, stripDiacritics } from '../src/lib/normalize';

describe('normalize', () => {
  it('trims, collapses spaces, lowercases and drops final punctuation', () => {
    expect(normalize('  Já   jsem Eva. ')).toBe('já jsem eva');
    expect(normalize('Rozumíte?')).toBe('rozumíte');
    expect(normalize('Ahoj!')).toBe('ahoj');
  });

  it('unifies dashes, quotes and NFC form', () => {
    expect(normalize('A ty?  –  Já')).toBe('a ty? - já');
    expect(normalize('stěny')).toBe('stěny');
  });
});

describe('stripDiacritics', () => {
  it('removes Czech diacritics', () => {
    expect(stripDiacritics('Těší mě, žluťoučký kůň')).toBe('Tesi me, zlutoucky kun');
  });
});

describe('compareText', () => {
  it('accepts an exact match regardless of case and final punctuation', () => {
    expect(compareText('těší mě', 'Těší mě.')).toEqual({ correct: true, almost: false });
  });

  it('flags a diacritics-only mistake as almost', () => {
    expect(compareText('tesi me', 'Těší mě')).toEqual({ correct: false, almost: true });
    expect(compareText('rozumime', 'rozumíme')).toEqual({ correct: false, almost: true });
  });

  it('rejects a different word', () => {
    expect(compareText('jsi', 'jsem')).toEqual({ correct: false, almost: false });
  });

  it('accepts any alternative separated by |', () => {
    expect(compareText('rozumějí', 'rozumí|rozumějí')).toEqual({ correct: true, almost: false });
    expect(compareText('pracujou', 'pracují|pracujou')).toEqual({ correct: true, almost: false });
  });

  it('treats empty input as wrong', () => {
    expect(compareText('', 'jsem')).toEqual({ correct: false, almost: false });
  });
});
