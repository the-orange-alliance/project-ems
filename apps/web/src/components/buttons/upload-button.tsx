import { FC, ChangeEvent, useRef } from 'react';
import { Button } from 'antd';

interface Props {
  title: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const UploadButton: FC<Props> = ({ title, onUpload }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = () => {
    if (!inputRef.current) return;
    inputRef.current.click();
  };

  return (
    <>
      <a type='text' onClick={handleClick}>
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
