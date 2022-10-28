import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';

interface Props<T> {
  data: T[];
  headers: string[];
  renderRow: (row: T) => string[];
  onSelect?: (row: T) => void;
}

const UpgradedTable = <T,>({
  data,
  headers,
  renderRow,
  onSelect
}: Props<T>) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              {headers.map((h, i) => (
                <TableCell key={`header-${i}`}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((d, i) => {
              const rowData = renderRow(d);
              const handleSelect = () => onSelect?.(d);
              return (
                <TableRow
                  key={`row-${i}`}
                  hover={!!onSelect}
                  onClick={handleSelect}
                  className={onSelect ? 'mouse-click' : ''}
                >
                  {rowData.map((cell, j) => (
                    <TableCell key={`cell-${i}-${j}`}>{cell}</TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default UpgradedTable;
