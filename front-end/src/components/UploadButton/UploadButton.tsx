import { ChangeEvent, FC } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import UploadIcon from '@mui/icons-material/Upload';

interface Props {
  title: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

const UploadButton: FC<Props> = ({ title, onUpload }) => {
  return (
    <Tooltip title={title}>
      <IconButton component='label'>
        <input hidden accept='.csv' type='file' onChange={onUpload} />
        <UploadIcon />
      </IconButton>
    </Tooltip>
  );
};

export default UploadButton;
