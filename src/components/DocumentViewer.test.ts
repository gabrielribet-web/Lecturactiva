import { describe, expect, it } from 'vitest';
import { createHighlightRegex } from './DocumentViewer';

describe('createHighlightRegex', () => {
  it('matches whole words only and ignores substrings', () => {
    const regex = createHighlightRegex('tiene');
    const text = 'Mantiene y tiene que funcionar.';
    const matches = Array.from(text.matchAll(regex)).map(match => match[0]);

    expect(matches).toEqual(['tiene']);
  });

  it('matches word with punctuation boundaries', () => {
    const regex = createHighlightRegex('tiene');
    const text = 'tiene, tiene. ¿tiene?';
    const matches = Array.from(text.matchAll(regex)).map(match => match[0]);

    expect(matches).toEqual(['tiene', 'tiene', 'tiene']);
  });
});
