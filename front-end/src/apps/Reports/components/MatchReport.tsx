import { FC, useState } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Match, Team } from '@toa-lib/models';
import Report from './Report';
import { DateTime } from 'luxon';
import { useRecoilValue } from 'recoil';
import {
  eventFields,
  selectedTournamentType,
  teamsAtom,
  tournamentScheduleItemAtomFamily
} from 'src/stores/Recoil';
import FieldsDropdown from 'src/components/Dropdowns/FieldsDropdown';

interface Props {
  matches: Match[];
  identifier?: keyof Team;
}

const MatchReport: FC<Props> = ({ matches, identifier }) => {
  const type = useRecoilValue(selectedTournamentType);
  const teams = useRecoilValue(teamsAtom);
  const items = useRecoilValue(tournamentScheduleItemAtomFamily(type));
  const allFields = useRecoilValue(eventFields);
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
      <Report name={`${type} Match Schedule`}>
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
                    !i.isMatch ||
                    fieldMatches.find((m) => m.matchName === i.name)
                )
                .map((i) => {
                  const m = matches.find((m) => m.matchName === i.name);
                  if (i.isMatch) {
                    return (
                      <TableRow key={i.key}>
                        <TableCell>{m?.matchName}</TableCell>
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
                            <TableCell key={p.matchParticipantKey} size='small'>
                              {identifier && team
                                ? team[identifier]
                                : p.teamKey}
                              {p.surrogate ? '*' : ''}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  } else {
                    return (
                      <TableRow key={i.key}>
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

export default MatchReport;
