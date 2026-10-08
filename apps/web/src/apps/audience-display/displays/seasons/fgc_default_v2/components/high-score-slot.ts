import type { Alliance, MatchHighScore } from '@toa-lib/models';

/**
 * Whether the NEW HIGH SCORE indicator should appear at all for this verdict.
 *
 * Two conditions:
 *
 * - `isNewHighScore` - the record itself, decided server-side so a display that
 *   reloads mid-results reaches the same answer.
 * - `alliance !== null` - the API reports `null` when red and blue tied above
 *   the record. There is no single column to put the banner in, and showing it
 *   on both reads as two separate records, so that case shows nothing.
 *
 * Deliberately NOT filtered on `tournamentType` here. The banner shows for the
 * qualification rounds and every playoff level, and the only tournaments left
 * out - test and practice - are already refused by the API, which returns no
 * record for any tournament with no phase. Re-listing the allowed types here
 * would duplicate that rule in a second place and let the two drift apart.
 * Records stay scoped per phase server-side, so a stacked playoff alliance
 * never overwrites the qualification record.
 *
 * Shared by the full and stream results screens so the two cannot drift.
 */
export const showsHighScore = (
  highScore: MatchHighScore | undefined
): highScore is MatchHighScore & { alliance: Alliance } =>
  highScore?.isNewHighScore === true && highScore.alliance !== null;

/**
 * The `highScoreSlot` for one alliance column on the full results screen.
 *
 * The record-setting column gets the banner; the other gets a hidden copy so
 * both team lists stay vertically aligned. `undefined` when no record was set,
 * which renders nothing in either column.
 */
export const highScoreSlotFor = (
  highScore: MatchHighScore | undefined,
  allianceColor: Alliance
): 'banner' | 'spacer' | undefined => {
  if (!showsHighScore(highScore)) return undefined;
  return highScore.alliance === allianceColor ? 'banner' : 'spacer';
};
