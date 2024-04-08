import { FC, useEffect } from 'react';
import ChromaLayout from 'src/layouts/ChromaLayout';
import { DateTime } from 'luxon';
import './Display.less';

import { useRecoilRefresher_UNSTABLE, useRecoilValue } from 'recoil';
import {
  currentEventKeyAtom,
  matchesByEventAtomFam,
  matchesByTournamentSelector
} from 'src/stores/NewRecoil';
import { isNumber } from '@toa-lib/models';

import FGC_BG from '../AudienceDisplay/displays/fgc_2023/res/global-bg.png';
import FGC_LOGO from '../AudienceDisplay/displays/fgc_2023/res/Global_Logo.png';
import { useSearchParams } from 'react-router-dom';

const REFRESH_RATE_S = 60;

const FieldColumn: FC<{ field: number; tournamentKey: string | null }> = ({
  field,
  tournamentKey
}) => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const fieldMatches = useRecoilValue(matchesByEventAtomFam(eventKey))
    .filter(
      (m) =>
        m.fieldNumber === field &&
        m.result === -1 &&
        (tournamentKey ? m.tournamentKey === tournamentKey : true)
    )
    .slice(0, 6);
  return (
    <div id='q-field'>
      <h2>Field {field}</h2>
      {fieldMatches.map((m) => {
        const params = m.name.split(' ');
        const matchNumber = isNumber(parseInt(params[2]))
          ? params[2]
          : params[3];

        return (
          <div key={`${m.eventKey}-${m.tournamentKey}-${m.id}`} id='q-match'>
            <span className='q-match-name center'>Match {matchNumber}</span>
            <span className='q-match-number center'>
              {DateTime.fromISO(m.startTime).toFormat('t')}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const QueueingDisplay: FC = () => {
  const refreshMatches = useRecoilRefresher_UNSTABLE(
    matchesByTournamentSelector
  );
  const [searchParams] = useSearchParams();
  const tournamentKey = searchParams.get('tournamentKey') ?? null;

  useEffect(() => {
    const intervalID = setInterval(() => {
      refreshMatches();
    }, 1000 * REFRESH_RATE_S);
    return () => {
      clearInterval(intervalID);
    };
  }, []);

  return (
    <ChromaLayout>
      <div id='fgc-body' style={{ backgroundImage: `url(${FGC_BG})` }} />
      <div id='q-base'>
        <div id='q-head'>
          <h1 id='q-head-left'>Upcoming Matches</h1>
          <img id='q-head-right' className='fit-w' src={FGC_LOGO} />
        </div>
        <div id='q-field-base'>
          <FieldColumn field={1} tournamentKey={tournamentKey} />
          <FieldColumn field={2} tournamentKey={tournamentKey} />
          <FieldColumn field={3} tournamentKey={tournamentKey} />
          <FieldColumn field={4} tournamentKey={tournamentKey} />
          <FieldColumn field={5} tournamentKey={tournamentKey} />
        </div>
      </div>
    </ChromaLayout>
  );
};
