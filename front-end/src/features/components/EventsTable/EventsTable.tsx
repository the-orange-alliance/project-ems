import { FC } from 'react';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Event } from '@toa-lib/models';
import { DateTime } from 'luxon';

interface Props {
  events: Event[];
}

const EventsTable: FC<Props> = ({ events }) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Website</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((e, i) => {
              const location = [e.city, e.stateProv, e.country]
                .filter((str) => str.length > 0)
                .toString();
              const startDate = DateTime.fromISO(e.startDate);
              const endDate = DateTime.fromISO(e.endDate);
              return (
                <TableRow key={`event-${i}`}>
                  <TableCell>{e.eventKey}</TableCell>
                  <TableCell>{e.eventName}</TableCell>
                  <TableCell>{e.eventTypeKey}</TableCell>
                  <TableCell>
                    {e.venue}&nbsp;-&nbsp;
                    {location}
                  </TableCell>
                  <TableCell>
                    {startDate.toFormat('DDDD')}-{endDate.toFormat('DDDD')}
                  </TableCell>
                  <TableCell>{e.website}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default EventsTable;
