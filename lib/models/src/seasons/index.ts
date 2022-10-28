export * from './CarbonCapture.js';
export * from './PowerPlay.js';

export interface Season {
  key: string;
  name: string;
  program: string;
}

export const CarbonCaptureSeason: Season = {
  key: 'fgc_2022',
  program: 'fgc',
  name: 'Carbon Capture'
};
export const PowerPlaySeason: Season = {
  key: 'ftc_2223',
  program: 'ftc',
  name: 'Power Play'
};

export const Seasons: Season[] = [CarbonCaptureSeason, PowerPlaySeason];
