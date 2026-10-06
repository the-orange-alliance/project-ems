import { Button, Typography } from 'antd';
import SettingsRow from './settings-row.js';
import { useRef, useState } from 'react';

const { Text } = Typography;

interface FileRowProps {
  title: string;
  buttonText?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Called with the FileList or null when selection changes */
  onFilesSelected?: (files: FileList | null) => void;
}

const FileRow: React.FC<FileRowProps> = ({
  title,
  buttonText = 'Choose file',
  accept,
  multiple = false,
  disabled = false,
  placeholder = 'No file selected',
  onFilesSelected
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      const names = Array.from(files)
        .map((f) => f.name)
        .join(', ');
      setSelected(names);
      onFilesSelected?.(files);
    } else {
      setSelected(null);
      onFilesSelected?.(null);
    }
  };

  const display = selected ?? placeholder;

  return (
    <SettingsRow
      title={title}
      inputComponent={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={inputRef}
            type='file'
            style={{ display: 'none' }}
            accept={accept}
            multiple={multiple}
            onChange={onChange}
          />
          <Button onClick={openPicker} disabled={disabled}>
            {buttonText}
          </Button>
          <Text
            type='secondary'
            ellipsis={{ tooltip: display }}
            style={{
              color: selected ? undefined : 'var(--ant-disabled-color)'
            }}
          >
            {display}
          </Text>
        </div>
      }
    />
  );
};

export default FileRow;
