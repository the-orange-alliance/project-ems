/**
 * Card issued to a team, shared across seasons.
 *
 * The numeric values are load-bearing: they are stored directly in
 * `match_participant.cardStatus` and `team.cardStatus`, and several seasons
 * compare with `<=` to mean "no card or merely a yellow". Do not renumber.
 *
 * Each season module previously declared its own identical copy of this enum.
 * They now re-export this one so that logic which is not season-specific —
 * card carry-over, in particular — is not arbitrarily bound to whichever
 * season's copy happened to be imported.
 */
export enum CardStatus {
  WHITE_CARD = 3,
  RED_CARD = 2,
  YELLOW_CARD = 1,
  NO_CARD = 0
}
