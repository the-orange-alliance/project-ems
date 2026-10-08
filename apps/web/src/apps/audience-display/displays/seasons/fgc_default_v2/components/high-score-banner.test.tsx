import type { MatchHighScore } from '@toa-lib/models';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HighScoreBadge, HighScoreBanner } from './high-score-banner.js';
import { highScoreSlotFor, showsHighScore } from './high-score-slot.js';

const verdict = (over: Partial<MatchHighScore> = {}): MatchHighScore => ({
  isNewHighScore: true,
  alliance: 'red',
  score: 412,
  previousScore: 388,
  tournamentType: 'Ranking',
  ...over
});

describe('HighScoreBanner', () => {
  it('renders the headline', () => {
    render(<HighScoreBanner />);
    expect(screen.getByText(/new high score/i)).toBeInTheDocument();
  });

  it('keeps the hidden variant in the layout rather than unmounting it', () => {
    // This is the assertion that protects column alignment on the full results
    // screen: the non-record alliance reserves the banner's height invisibly,
    // so both team lists stay on the same line. `display: none` or an unmount
    // would silently reintroduce the misalignment.
    const { container } = render(<HighScoreBanner hidden />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner).toBeTruthy();
    expect(banner.style.visibility).toBe('hidden');
    expect(banner.getAttribute('aria-hidden')).toBe('true');
  });

  it('leaves the visible variant unhidden and announced', () => {
    const { container } = render(<HighScoreBanner />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner.style.visibility).toBe('');
    expect(banner.getAttribute('aria-hidden')).toBeNull();
  });

  it('flanks the headline with two stars that rock either side', () => {
    const { container } = render(<HighScoreBanner />);
    const stars = container.querySelectorAll('.ems-high-score-star');
    expect(stars).toHaveLength(2);
    // Decorative: the headline already carries the meaning, so a screen reader
    // should not announce the glyphs.
    stars.forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));

    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('rotate(-15deg)');
    expect(css).toContain('rotate(15deg)');
    // An inline box cannot be rotated at all.
    expect(css).toContain('display: inline-block');
  });

  it('drops every animation under prefers-reduced-motion', () => {
    const { container } = render(<HighScoreBanner />);
    const css = container.querySelector('style')?.textContent ?? '';
    const block = css.slice(css.indexOf('prefers-reduced-motion'));
    // Both the panel's entry and the stars' dance, or reduced motion only
    // half-applies.
    expect(block).toContain('ems-high-score-banner');
    expect(block).toContain('ems-high-score-star');
    expect(block).toContain('animation: none !important');
  });

  it('renders the compact badge for the stream overlay', () => {
    const { container } = render(<HighScoreBadge />);
    expect(screen.getByText(/new high score/i)).toBeInTheDocument();
    // The badge gets the same dancing stars as the full banner.
    expect(container.querySelectorAll('.ems-high-score-star')).toHaveLength(2);
  });
});

describe('showsHighScore', () => {
  it('shows for a record-setting ranking match', () => {
    expect(showsHighScore(verdict())).toBe(true);
  });

  it('does not show when no record was set', () => {
    expect(showsHighScore(verdict({ isNewHighScore: false }))).toBe(false);
  });

  it('shows for the qualification rounds and every playoff level', () => {
    for (const tournamentType of [
      'Qualification',
      'Ranking',
      'Round Robin',
      'Eliminations',
      'Finals'
    ] as const) {
      expect(showsHighScore(verdict({ tournamentType }))).toBe(true);
    }
  });

  it('does not re-filter on tournament type', () => {
    // Test and practice are excluded by the API, which returns no record for a
    // tournament with no phase - so this verdict cannot actually occur. The
    // assertion pins the division of labour: duplicating the phase rule here
    // would let the display and the API drift apart.
    expect(showsHighScore(verdict({ tournamentType: 'Practice' }))).toBe(true);
  });

  it('does not show when the API reports no record', () => {
    // Which is how test and practice tournaments, and the opening match of a
    // phase, actually reach the display.
    expect(
      showsHighScore(
        verdict({
          tournamentType: 'Practice',
          isNewHighScore: false,
          alliance: null
        })
      )
    ).toBe(false);
  });

  it('does not show when the record belongs to no single alliance', () => {
    expect(showsHighScore(verdict({ alliance: null }))).toBe(false);
  });

  it('does not show before the verdict has loaded', () => {
    expect(showsHighScore(undefined)).toBe(false);
  });
});

describe('highScoreSlotFor', () => {
  it('banners the record alliance and spaces the other', () => {
    expect(highScoreSlotFor(verdict(), 'red')).toBe('banner');
    expect(highScoreSlotFor(verdict(), 'blue')).toBe('spacer');
  });

  it('mirrors for a blue record', () => {
    const blue = verdict({ alliance: 'blue' });
    expect(highScoreSlotFor(blue, 'blue')).toBe('banner');
    expect(highScoreSlotFor(blue, 'red')).toBe('spacer');
  });

  it('renders nothing in either column when there is no record', () => {
    const none = verdict({ isNewHighScore: false });
    expect(highScoreSlotFor(none, 'red')).toBeUndefined();
    expect(highScoreSlotFor(none, 'blue')).toBeUndefined();
    expect(highScoreSlotFor(undefined, 'red')).toBeUndefined();
  });

  it('banners a playoff record the same way as a qualification one', () => {
    const finals = verdict({ tournamentType: 'Finals', alliance: 'blue' });
    expect(highScoreSlotFor(finals, 'blue')).toBe('banner');
    expect(highScoreSlotFor(finals, 'red')).toBe('spacer');
  });
});
