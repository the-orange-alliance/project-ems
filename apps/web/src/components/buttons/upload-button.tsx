import { FC, ChangeEvent, useRef } from 'react';
import { Button } from 'antd';

interface Props {
  title: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const UploadButton: FC<Props> = ({ title, onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <a type='text' onClick={() => inputRef.current?.click()}>
        {title}
      </a>
      <input
        ref={inputRef}
        hidden
        type='file'
        accept='.csv'
        onChange={onUpload}
      />
    </>
  );
};
