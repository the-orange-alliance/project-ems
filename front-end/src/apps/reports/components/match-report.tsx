import { FC, useState } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Match, Team } from '@toa-lib/models';
import { Report } from './report-container';
import { DateTime } from 'luxon';
import { useRecoilValue } from 'recoil';
import {
  currentScheduleItemsByTournamentSelector,
  currentTeamsByEventSelector,
  currentTournamentSelector
} from 'src/stores/NewRecoil';
import FieldsDropdown from 'src/components/dropdowns/FieldsDropdown';

interface Props {
  matches: Match<any>[];
  identifier?: keyof Team;
}

export const MatchReport: FC<Props> = ({ matches, identifier }) => {
  const tournament = useRecoilValue(currentTournamentSelector);
  const teams = useRecoilValue(currentTeamsByEventSelector);
  const items = useRecoilValue(currentScheduleItemsByTournamentSelector);

  if (!tournament) return null;

  const allFields = tournament.fields.map((_, i) => i + 1);
  const [fields, setFields] = useState(allFields);

  const fieldMatches = matches.filter(
    (m) => fields.indexOf(m.fieldNumber) > -1
  );
  const allianceSize = matches?.[0]?.participants?.length
    ? matches[0].participants.length / 2
    : 3;

  const changeFields = (newFields: number[]) => setFields(newFields);
  return (
    <>
      <div className='no-print'>
        <FieldsDropdown fields={fields} onChange={changeFields} />
      </div>
      <Report name={`${tournament.name} Match Schedule`}>
        <TableContainer>
          <Table size='small'>
            <TableHead sx={{ backgroundColor: 'lightgrey' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell size='small'>Field</TableCell>
                <TableCell>Time</TableCell>
                {matches?.[0]?.participants?.map((p, i) => (
                  <TableCell key={`robot-${i}`}>
                    {i < allianceSize
                      ? `Red ${i + 1}`
                      : `Blue ${i + 1 - allianceSize}`}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items
                .filter(
                  (i) =>
                    !i.isMatch || fieldMatches.find((m) => m.name === i.name)
                )
                .map((i) => {
                  const m = fieldMatches.find((m) => m.name === i.name);
                  if (i.isMatch) {
                    return (
                      <TableRow
                        key={`${i.eventKey}-${i.tournamentKey}-${i.id}`}
                      >
                        <TableCell>{m?.name}</TableCell>
                        <TableCell size='small'>{m?.fieldNumber}</TableCell>
                        <TableCell>
                          {DateTime.fromISO(m?.startTime || '').toLocaleString(
                            DateTime.DATETIME_FULL
                          )}
                        </TableCell>
                        {m?.participants?.map((p) => {
                          const team = teams.find(
                            (t) => t.teamKey == p.teamKey
                          );
                          return (
                            <TableCell
                              key={`${p.eventKey}-${p.tournamentKey}-${p.id}-${p.teamKey}-${p.station}`}
                              size='small'
                            >
                              {identifier && team
                                ? team[identifier]
                                : team?.teamKey}
                              {p.surrogate ? '*' : ''}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  } else {
                    return (
                      <TableRow key={i.id}>
                        <TableCell colSpan={9}>{i.name}</TableCell>
                      </TableRow>
                    );
                  }
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Report>
    </>
  );
};
