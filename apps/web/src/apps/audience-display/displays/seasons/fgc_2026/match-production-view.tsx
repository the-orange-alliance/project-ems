import { FC } from 'react';
import { DisplayProps } from '../../displays.js';
import { Row } from 'antd';
import { IgnitingInnovation, Match, MatchState } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { matchStateAtom, matchStatusAtom } from 'src/stores/state/match.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { ScoreContainer } from '../fgc_default/components/production-score-container.js';

/**
 * Production overlay for the 2026 Igniting Innovation season.
 *
 * The 2026 FCS (fcs/FGC26_IgnitingInnovation.ts) is an intentional placeholder with no
 * socket events, so this view has no live field telemetry - every value is derived from
 * the live `match` prop (kept current via MatchSocketEvent.UPDATE) and its details.
 */
export const MatchProduction2026: FC<DisplayProps> = ({
  match: genericMatch
}) => {
  const matchParts = (genericMatch.name ?? '').split(' ');
  const matchNumber = matchParts[matchParts.length - 1];
  const field = genericMatch.fieldNumber;
  const { connected } = useSocketWorker();

  const match = genericMatch as Match<IgnitingInnovation.MatchDetails>;
  const { details } = match;

  const matchStateStrings: Record<MatchState, string> = {
    [MatchState.AUDIENCE_READY]: 'Audience Ready',
    [MatchState.FIELD_READY]: 'Field Ready',
    [MatchState.MATCH_ABORTED]: 'Match Aborted',
    [MatchState.MATCH_COMPLETE]: 'Match Complete',
    [MatchState.MATCH_NOT_SELECTED]: 'Match Not Selected',
    [MatchState.MATCH_READY]: 'Match Ready',
    [MatchState.PRESTART_COMPLETE]: 'Prestart Complete',
    [MatchState.PRESTART_READY]: 'Prestart Ready',
    [MatchState.RESULTS_COMMITTED]: 'Results Committed',
    [MatchState.RESULTS_POSTED]: 'Results Posted',
    [MatchState.RESULTS_READY]: 'Results Ready',
    [MatchState.MATCH_IN_PROGRESS]: 'Match In Progress'
  };

  const matchState = useAtomValue(matchStateAtom);
  const matchStatus = useAtomValue(matchStatusAtom);

  const matchStateString = matchStateStrings[matchState] ?? 'Unknown';
  const matchString =
    matchStateString.toLowerCase() === matchStatus.toLowerCase()
      ? matchStateString
      : `${matchStateString} \n (${matchStatus})`;

  // Endgame is signalled the same way the rest of the app learns it: the ENDGAME
  // socket event sets matchStatusAtom to 'ENDGAME' (see useMatchStateEvents).
  const isEndgame = matchStatus.toLowerCase() === 'endgame';

  const climbMultiplierString = (
    calc: (d: IgnitingInnovation.MatchDetails) => number
  ) => (details && isEndgame ? `x${calc(details).toFixed(2)}` : '');

  return (
    <>
      <Row>
        <ScoreContainer
          number={connected ? 'Y' : 'N'}
          label={`Socket Connected`}
          bg={connected ? '#4caf50' : '#f44336'}
        />
        <ScoreContainer number={matchNumber} label={`Match Number`} />
        <ScoreContainer number={`${field}`} label={`Field`} />
        <ScoreContainer
          number={matchString}
          label={`Match State`}
          medium
          smallFont
        />
      </Row>
      <Row>
        <ScoreContainer
          number={details?.wildfireInRedSuppressionUnit?.toString() ?? ''}
          label={'Red Suppression Points'}
        />
        <ScoreContainer
          number={details?.wildfireInBlueSuppressionUnit?.toString() ?? ''}
          label={'Blue Suppression Points'}
        />
        <ScoreContainer
          number={details?.wildfireInExtinguisher?.toString() ?? ''}
          label={'Extinguisher Points'}
        />
        <ScoreContainer
          number={
            details
              ? IgnitingInnovation.ScoreTable.Coopertition(details).toString()
              : ''
          }
          label={'Coopertition Points'}
        />
      </Row>
      <Row>
        <ScoreContainer
          number={climbMultiplierString(
            IgnitingInnovation.ScoreTable.ClimbMultiplierRed
          )}
          label={'Red Climb Multiplier'}
        />
        <ScoreContainer
          number={climbMultiplierString(
            IgnitingInnovation.ScoreTable.ClimbMultiplierBlue
          )}
          label={'Blue Climb Multiplier'}
        />
        <ScoreContainer
          number={`${match.redScore}`}
          label={'Red Match Score'}
        />
        <ScoreContainer
          number={`${match.blueScore}`}
          label={'Blue Match Score'}
        />
      </Row>
    </>
  );
};
