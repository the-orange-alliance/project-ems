import { Crescendo, Match } from '@toa-lib/models';
import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { matchResultAtom } from 'src/stores/NewRecoil';
import './MatchResults.less';
import MatchBar from '../common/MatchBar';
import { EmojiEvents, Groups, Handshake, MusicNote } from '@mui/icons-material';
import { StageStatus } from '@toa-lib/models/build/seasons/Crescendo';
import AllianceSheet from '../common/AllianceSheet';
import RPBar from '../common/RPBar';
import { AudienceDisplayProps } from '../../AudienceDisplayProvider';

// Calculate speaker points (Notes scored in auto - 5 pts, notes scored in tele - 2 pts, Amped notes - 5 pts)
const calcSpeakerPts = (
  autoNotes: number,
  teleNotes: number,
  teleAmped: number
) => (autoNotes + teleAmped) * 5 + teleNotes * 2;

// Calculate Amped points (Notes scored in auto - 2 pts, notes scored in tele - 1 pt)
const calcAmpPts = (autoAmped: number, teleAmped: number) =>
  autoAmped * 2 + teleAmped;

const calcStagePts = (stageStatus: number) => {
  switch (stageStatus) {
    case StageStatus.PARK:
      return 1;
    case StageStatus.ONSTAGE:
      return 3;
    case StageStatus.ONSTAGE_SPOTLIT:
      return 4;
    default:
      return 0;
  }
};

const MatchResults: FC<AudienceDisplayProps> = ({
  visible
}: AudienceDisplayProps) => {
  const match: Match<Crescendo.MatchDetails> | null =
    useRecoilValue(matchResultAtom);

  if (!match || !match.details) return null;

  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];
  const { details } = match;

  // Blue alliance breakdowns
  const blueAutoMobility =
    (details.blueAutoMobilityOne +
      details.blueAutoMobilityTwo +
      details.blueAutoMobilityThree) *
    2;
  const blueSpeakerPts = calcSpeakerPts(
    match.details.blueAutoSpeakerNotes,
    match.details.blueTeleSpeakerNotes,
    match.details.blueTeleSpeakerNotesAmped
  );
  const blueAmpPts = calcAmpPts(
    match.details.blueAutoAmpNotes,
    match.details.blueTeleAmpNotes
  );
  const blueStagePts =
    calcStagePts(match.details.blueEndStageStatusOne) +
    calcStagePts(match.details.blueEndStageStatusTwo) +
    calcStagePts(match.details.blueEndStageStatusThree) +
    match.details.blueTeleTrapNotes * 5;

  // Red score breakdown
  const redAutoMobility =
    (details.redAutoMobilityOne +
      details.redAutoMobilityTwo +
      details.redAutoMobilityThree) *
    3;

  const redSpeakerPts = calcSpeakerPts(
    match.details.redAutoSpeakerNotes,
    match.details.redTeleSpeakerNotes,
    match.details.redTeleSpeakerNotesAmped
  );
  const redAmpPts = calcAmpPts(
    match.details.redAutoAmpNotes,
    match.details.redTeleAmpNotes
  );
  const redStagePts =
    calcStagePts(match.details.redEndStageStatusOne) +
    calcStagePts(match.details.redEndStageStatusTwo) +
    calcStagePts(match.details.redEndStageStatusThree) +
    match.details.redTeleTrapNotes * 5;

  const redFouls = match.redMinPen * 5 + match.redMajPen * 12;
  const blueFouls = match.blueMinPen * 5 + match.blueMajPen * 12;

  const isRedWin = match.redScore > match.blueScore;
  const isTie = match.redScore === match.blueScore;

  // Build the RP icons bar
  const redRp: FC[] = [];
  const blueRp: FC[] = [];

  // Red
  if (isRedWin && !isTie) {
    redRp.push(EmojiEvents);
    redRp.push(EmojiEvents);
  } else if (isTie) {
    redRp.push(EmojiEvents);
  }
  if (match.details.redEnsembleStatus) {
    redRp.push(Groups);
  }
  if (match.details.redHarmonyStatus) {
    redRp.push(MusicNote);
  }

  // Blue (build it in reverse so that it's symmetrical to red)
  if (match.details.blueHarmonyStatus) {
    blueRp.push(MusicNote);
  }
  if (match.details.blueEnsembleStatus) {
    blueRp.push(Groups);
  }
  if (!isRedWin && !isTie) {
    blueRp.push(EmojiEvents);
    blueRp.push(EmojiEvents);
  } else if (isTie) {
    blueRp.push(EmojiEvents);
  }

  return (
    <div className='c-results-container'>
      {/* Top Match Bar */}
      <div className={`c-results-matchbar ${visible ? 'in' : ''}`}>
        <MatchBar />
      </div>

      <div className={`bg-container blue ${visible ? 'in' : ''}`}>
        <div className='blue-bg' />
        <div className='blue-bg-body'></div>
      </div>
      <div className={`bg-container red ${visible ? 'in' : ''}`}>
        <div className='red-bg' />
        <div className='red-bg-body'></div>
      </div>

      {/* Mid page */}
      <div className={'c-mid-container'}>
        {/* Blue Alliance Side */}
        <div className={`c-blue-teamsheet ${visible ? 'in' : ''}`}>
          <AllianceSheet alliance='blue' teams={blueAlliance} />
          <RPBar icons={blueRp} alliance='blue' />
        </div>

        {/* Middle Score Section */}
        <div className={`c-scoresheet ${visible ? 'in' : ''}`}>
          {/* Large Primary scores */}
          <div className='c-large-score'>
            <div className='blue-bg'>
              <div className={'c-score-label'}>Blue</div>
              <div className={'c-score-score'}>{match.blueScore}</div>
            </div>
            <div className='red-bg'>
              <div className={'c-score-label'}>Red</div>
              <div className={'c-score-score'}>{match.redScore}</div>
            </div>
            {!!match.details.coopertitionBonus && (
              <div className='c-coop-bonus'>
                <Handshake fontSize='inherit' />
              </div>
            )}
          </div>

          {/* Score Breakdown */}
          <div className='c-score-breakdown'>
            <table>
              <tbody>
                <tr>
                  <td>{blueAutoMobility}</td>
                  <td>LEAVE</td>
                  <td>{redAutoMobility}</td>
                </tr>
                <tr>
                  <td>{blueSpeakerPts}</td>
                  <td>SPEAKER</td>
                  <td>{redSpeakerPts}</td>
                </tr>
                <tr>
                  <td>{blueAmpPts}</td>
                  <td>AMP</td>
                  <td>{redAmpPts}</td>
                </tr>
                <tr>
                  <td>{blueStagePts}</td>
                  <td>STAGE</td>
                  <td>{redStagePts}</td>
                </tr>
                <tr>
                  <td>{redFouls}</td>
                  <td>PENALTY</td>
                  <td>{blueFouls}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Red Alliance Side */}
        <div className={`c-red-teamsheet ${visible ? 'in' : ''}`}>
          <AllianceSheet alliance='red' teams={redAlliance} />
          <RPBar icons={redRp} alliance='red' />
        </div>
      </div>

      {/* Result Banner */}
      <div
        className={`c-result-banner ${
          isTie ? 'tie-bg' : isRedWin ? 'red-bg' : 'blue-bg'
        } ${visible ? 'in' : ''}`}
      >
        {isTie ? 'Tie!' : isRedWin ? 'Red Wins!' : 'Blue Wins!'}
      </div>
    </div>
  );
};

export default MatchResults;
