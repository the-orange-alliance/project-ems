import { FC } from 'react';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Match } from '@toa-lib/models';
import { DateTime } from 'luxon';
import { useRecoilValue } from 'recoil';
import {
  currentMatchIdAtom,
  currentTeamsByEventSelector,
  teamIdentifierAtom
} from 'src/stores/NewRecoil';

interface Props {
  matches: Match<any>[];
  onSelect?: (id: number) => void;
  disabled?: boolean;
  colored?: boolean;
}

const MatchResultsTable: FC<Props> = ({
  matches,
  onSelect,
  disabled,
  colored
}) => {
  const identifier = useRecoilValue(teamIdentifierAtom);
  const currentMatchId = useRecoilValue(currentMatchIdAtom);
  const teams = useRecoilValue(currentTeamsByEventSelector);
  const allianceSize = matches?.[0]?.participants?.length
    ? matches[0].participants.length / 2
    : 3;
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Field</TableCell>
              <TableCell>Time</TableCell>
              {matches?.[0]?.participants?.map((p, i) => (
                <TableCell key={`robot-${i}`}>
                  {i < allianceSize
                    ? `Red ${i + 1}`
                    : `Blue ${i + 1 - allianceSize}`}
                </TableCell>
              ))}
              <TableCell>Red Score</TableCell>
              <TableCell>Blue Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matches.map((match) => {
              const isSelected = onSelect ? currentMatchId === match.id : false;
              const select = () => {
                if (!disabled) {
                  onSelect?.(match.id);
                }
              };

              return (
                <TableRow
                  key={match.id}
                  hover
                  selected={isSelected}
                  onClick={select}
                  className={disabled ? 'mouse-disable' : 'mouse-click'}
                >
                  <TableCell>{match.name}</TableCell>
                  <TableCell>{match.fieldNumber}</TableCell>
                  <TableCell>
                    {DateTime.fromISO(match.startTime).toLocaleString(
                      DateTime.DATETIME_SHORT
                    )}
                  </TableCell>
                  {match.participants?.map((p) => {
                    const team = teams.find((t) => p.teamKey === t.teamKey);
                    return (
                      <TableCell
                        key={`${match.eventKey}-${match.id}-T${p.teamKey}-${p.station}`}
                        className={
                          colored
                            ? p.station >= 20
                              ? 'blue'
                              : 'red'
                            : undefined
                        }
                      >
                        {team ? team[identifier] : p.teamKey}
                        {p.surrogate ? '*' : ''}
                      </TableCell>
                    );
                  })}
                  <TableCell
                    className={colored ? 'red' : undefined}
                    style={{
                      fontWeight:
                        colored && match.redScore > match.blueScore
                          ? 'bold'
                          : undefined
                    }}
                  >
                    {match.redScore}
                  </TableCell>
                  <TableCell
                    className={colored ? 'blue' : undefined}
                    style={{
                      fontWeight:
                        colored && match.blueScore > match.redScore
                          ? 'bold'
                          : undefined
                    }}
                  >
                    {match.blueScore}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default MatchResultsTable;
