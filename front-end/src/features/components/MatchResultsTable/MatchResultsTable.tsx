import { FC } from 'react';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { DATE_FORMAT_MIN_SHORT, Match } from '@toa-lib/models';
import moment from 'moment';
import { useRecoilValue } from 'recoil';
import { selectedMatchKeyAtom } from 'src/stores/Recoil';

interface Props {
  matches: Match[];
  onSelect?: (matchKey: string) => void;
  disabled?: boolean;
}

const MatchResultsTable: FC<Props> = ({ matches, onSelect, disabled }) => {
  const selectedMatchKey = useRecoilValue(selectedMatchKeyAtom);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Field</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Red Score</TableCell>
              <TableCell>Blue Score</TableCell>
              <TableCell>Red 1</TableCell>
              <TableCell>Red 2</TableCell>
              <TableCell>Red 3</TableCell>
              <TableCell>Blue 1</TableCell>
              <TableCell>Blue 2</TableCell>
              <TableCell>Blue 3</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matches.map((match) => {
              const isSelected = onSelect
                ? selectedMatchKey === match.matchKey
                : false;

              const select = () => {
                if (!disabled) {
                  onSelect?.(match.matchKey);
                }
              };

              return (
                <TableRow
                  key={match.matchKey}
                  hover
                  selected={isSelected}
                  onClick={select}
                  className={disabled ? 'mouse-disable' : 'mouse-click'}
                >
                  <TableCell>{match.matchName}</TableCell>
                  <TableCell>{match.fieldNumber}</TableCell>
                  <TableCell>
                    {moment(match.startTime).format(DATE_FORMAT_MIN_SHORT)}
                  </TableCell>
                  <TableCell>{match.redScore}</TableCell>
                  <TableCell>{match.blueScore}</TableCell>
                  <TableCell>{match.participants?.[0].teamKey}</TableCell>
                  <TableCell>{match.participants?.[1].teamKey}</TableCell>
                  <TableCell>{match.participants?.[2].teamKey}</TableCell>
                  <TableCell>{match.participants?.[3].teamKey}</TableCell>
                  <TableCell>{match.participants?.[4].teamKey}</TableCell>
                  <TableCell>{match.participants?.[5].teamKey}</TableCell>
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
