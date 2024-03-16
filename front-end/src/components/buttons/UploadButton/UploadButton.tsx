import { ChangeEvent, FC } from 'react';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';

import UploadIcon from '@mui/icons-material/Upload';

interface Props {
  title: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

const UploadButton: FC<Props> = ({ title, onUpload }) => {
  return (
    <Tooltip title={title}>
      <Button
        variant='contained'
        component='label'
        sx={{ padding: '6px', minWidth: '24px' }}
      >
        <input hidden accept='.csv' type='file' onChange={onUpload} />
        <UploadIcon />
      </Button>
    </Tooltip>
  );
};

export default UploadButton;
