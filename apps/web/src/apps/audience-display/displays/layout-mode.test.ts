import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, parseLayout } from './layout-mode.js';

describe('parseLayout', () => {
  it('defaults to full preview / stream in-match / full results', () => {
    expect(DEFAULT_LAYOUT).toBe('fsf');
  });

  // `URLSearchParams.get` returns '' for a bare `?layout=`, which a `??`
  // default never caught - every slot then rendered nothing at all.
  it.each([
    ['null (param absent)', null],
    ['undefined', undefined],
    ['empty string (bare ?layout=)', ''],
    ['whitespace', '  '],
    ['too short', 'fs'],
    ['too long', 'ffff'],
    ['unknown characters', 'zzz'],
    ['partly unknown', 'xsf']
  ])('falls back to the default for %s', (_label, raw) => {
    expect(parseLayout(raw)).toBe(DEFAULT_LAYOUT);
  });

  it.each(['fsf', 'fff', 'sss', 'ssm', 'ofs', 'ooo', 'rss', 'rsf', 'fsm'])(
    'passes through the valid layout %s',
    (value) => {
      expect(parseLayout(value)).toBe(value);
    }
  );

  it('normalizes case', () => {
    expect(parseLayout('FSF')).toBe('fsf');
    expect(parseLayout('OfS')).toBe('ofs');
  });
});
