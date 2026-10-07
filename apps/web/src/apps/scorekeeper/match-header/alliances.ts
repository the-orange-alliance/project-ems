import { Alliance } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { darkModeAtom } from 'src/stores/state/ui.js';

export interface AlliancePalette {
  title: string;
  /** Solid colour for borders and accents. */
  accent: string;
  /** Alliance name colour; darker than `accent` in light mode for contrast. */
  text: string;
  /** Wash over the alliance card. */
  surface: string;
  /** Stronger wash for score tiles sitting on the surface. */
  tile: string;
  border: string;
}

const PALETTES: Record<'light' | 'dark', Record<Alliance, AlliancePalette>> = {
  dark: {
    red: {
      title: 'Red Alliance',
      accent: '#de1f1f',
      text: '#de1f1f',
      surface: '#de1f1f1a',
      tile: '#de1f1f26',
      border: '#de1f1f4d'
    },
    blue: {
      title: 'Blue Alliance',
      accent: '#1f85de',
      text: '#1f85de',
      surface: '#1f85de1a',
      tile: '#1f85de26',
      border: '#1f85de4d'
    }
  },
  light: {
    red: {
      title: 'Red Alliance',
      accent: '#de1f1f',
      text: '#a8071a',
      surface: '#fff1f0',
      tile: '#ffccc7',
      border: '#ffa39e'
    },
    blue: {
      title: 'Blue Alliance',
      accent: '#1f85de',
      text: '#0958d9',
      surface: '#e6f4ff',
      tile: '#bae0ff',
      border: '#91caff'
    }
  }
};

export const useAlliancePalette = (alliance: Alliance): AlliancePalette => {
  const darkMode = useAtomValue(darkModeAtom);
  return PALETTES[darkMode ? 'dark' : 'light'][alliance];
};
