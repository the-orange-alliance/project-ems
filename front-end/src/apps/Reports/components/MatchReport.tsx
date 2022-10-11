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
import { eventFields, teamsAtom } from 'src/stores/Recoil';
import FieldsDropdown from 'src/components/Dropdowns/FieldsDropdown';

interface Props {
  matches: Match[];
  identifier?: keyof Team;
}

const MatchReport: FC<Props> = ({ matches, identifier }) => {
  const teams = useRecoilValue(teamsAtom);
  const allFields = useRecoilValue(eventFields);
  const [fields, setFields] = useState(allFields);

  const changeFields = (newFields: number[]) => setFields(newFields);

  return (
    <>
      <div className='no-print'>
        <FieldsDropdown fields={fields} onChange={changeFields} />
      </div>
      <Report name='Match Schedule'>
        <TableContainer>
          <Table size='small'>
            <TableHead sx={{ backgroundColor: 'lightgrey' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell size='small'>Field</TableCell>
                <TableCell>Time</TableCell>
                <TableCell size='small'>Red 1</TableCell>
                <TableCell size='small'>Red 2</TableCell>
                <TableCell size='small'>Red 3</TableCell>
                <TableCell size='small'>Blue 1</TableCell>
                <TableCell size='small'>Blue 2</TableCell>
                <TableCell size='small'>Blue 3</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches
                .filter((m) => fields.indexOf(m.fieldNumber) > -1)
                .map((m) => (
                  <TableRow key={m.matchKey}>
                    <TableCell>{m.matchName}</TableCell>
                    <TableCell size='small'>{m.fieldNumber}</TableCell>
                    <TableCell>
                      {DateTime.fromISO(m.startTime).toLocaleString(
                        DateTime.DATETIME_FULL
                      )}
                    </TableCell>
                    {m.participants?.map((p) => {
                      const team = teams.find((t) => t.teamKey == p.teamKey);
                      return (
                        <TableCell key={p.matchParticipantKey} size='small'>
                          {identifier && team ? team[identifier] : p.teamKey}
                          {p.surrogate ? '*' : ''}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Report>
    </>
  );
};

export default MatchReport;
