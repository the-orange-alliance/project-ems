import { FC } from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import IconButton from '@mui/material/IconButton';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const TableActions: FC = () => {
  return (
    <ButtonGroup>
      <IconButton size='small'>
        <DeleteIcon />
      </IconButton>
      <IconButton size='small'>
        <EditIcon />
      </IconButton>
    </ButtonGroup>
  );
};

export default TableActions;
