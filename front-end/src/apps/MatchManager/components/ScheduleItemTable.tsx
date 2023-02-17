import { FC } from 'react';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { ScheduleItem } from '@toa-lib/models';
import { DateTime } from 'luxon';

interface Props {
  items: ScheduleItem[];
}

const ScheduleItemTable: FC<Props> = ({ items }) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Day</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.day}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  {DateTime.fromISO(item.startTime).toLocaleString(
                    DateTime.DATETIME_MED
                  )}
                </TableCell>
                <TableCell>{item.duration}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ScheduleItemTable;
