import { FC } from 'react';
import ButtonGroup from '@mui/material/ButtonGroup';
import IconButton from '@mui/material/IconButton';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Props {
  onEdit: () => void;
  onDelete: () => void;
}

const TableActions: FC<Props> = ({ onEdit, onDelete }) => {
  return (
    <ButtonGroup>
      <IconButton size='small' onClick={onDelete}>
        <DeleteIcon />
      </IconButton>
      <IconButton size='small' onClick={onEdit}>
        <EditIcon />
      </IconButton>
    </ButtonGroup>
  );
};

export default TableActions;
