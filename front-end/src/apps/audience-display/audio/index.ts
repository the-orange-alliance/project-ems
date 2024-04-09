import MATCH_START from './match_start.wav';
import MATCH_AUTO from './match_auto_end_warning.wav';
import MATCH_TRANSITION from './match_auto_end.wav';
import MATCH_TELE from './match_tele_start.wav';
import MATCH_PRE_TELE from './match_tele_pre_start.wav';
import MATCH_ENDGAME from './match_end_start.wav';
import MATCH_END from './match_end.wav';
import MATCH_ABORT from './match_estop.wav';

export {
  MATCH_ABORT,
  MATCH_AUTO,
  MATCH_TRANSITION,
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
