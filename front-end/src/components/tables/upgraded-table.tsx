import { ReactNode } from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Props<T> {
  data: T[];
  headers: string[];
  selected?: (row: T) => boolean;
  renderRow: (row: T) => (string | number | ReactNode)[];
  onSelect?: (row: T) => void;
  onModify?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export const UpgradedTable = <T,>({
  data,
  headers,
  selected,
  renderRow,
  onSelect,
  onModify,
  onDelete
}: Props<T>) => {
  const showActions = onModify || onDelete;
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              {headers.map((h, i) => (
                <TableCell key={`header-${i}`}>{h}</TableCell>
              ))}
              {showActions && <TableCell align='center'>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((d, i) => {
              const isSelected = onSelect ? selected?.(d) : false;
              const rowData = renderRow(d);
              const handleSelect = () => onSelect?.(d);
              const handleDelete = () => onDelete?.(d);
              const handleModify = () => onModify?.(d);
              return (
                <TableRow
                  key={`row-${i}`}
                  hover={!!onSelect}
                  selected={isSelected}
                  onClick={handleSelect}
                  className={onSelect ? 'mouse-click' : ''}
                >
                  {rowData.map((cell, j) => (
                    <TableCell key={`cell-${i}-${j}`}>{cell}</TableCell>
                  ))}
                  {showActions && (
                    <TableCell className='center'>
                      <ButtonGroup>
                        {onModify && (
                          <IconButton onClick={handleModify}>
                            <EditIcon />
                          </IconButton>
                        )}
                        {onDelete && (
                          <IconButton onClick={handleDelete}>
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </ButtonGroup>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
