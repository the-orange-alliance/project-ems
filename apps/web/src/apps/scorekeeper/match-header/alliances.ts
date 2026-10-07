import { Alliance } from '@toa-lib/models';

export const ALLIANCES: Record<Alliance, { title: string; color: string }> = {
  red: { title: 'Red Alliance', color: '#de1f1f' },
  blue: { title: 'Blue Alliance', color: '#1f85de' }
};

/** Translucent alliance colour, usable as a tint over any theme background. */
export const allianceTint = (alliance: Alliance, alpha = '1a'): string =>
  `${ALLIANCES[alliance].color}${alpha}`;
