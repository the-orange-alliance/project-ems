import MATCH_START from './assets/match_start.wav';
import MATCH_AUTO from './assets/match_auto_end_warning.wav';
import MATCH_TELE from './assets/match_tele_start.wav';
import MATCH_PRE_TELE from './assets/match_tele_pre_start.wav';
import MATCH_ENDGAME from './assets/match_end_start.wav';
import MATCH_END from './assets/match_end.wav';
import MATCH_ABORT from './assets/match_estop.wav';

export {
  MATCH_ABORT,
  MATCH_AUTO,
  MATCH_END,
  MATCH_ENDGAME,
  MATCH_PRE_TELE,
  MATCH_START,
  MATCH_TELE
};

export function initAudio(url: any): any {
  const audio = new Audio(url);
  audio.volume = 0.5;
  return audio;
}
