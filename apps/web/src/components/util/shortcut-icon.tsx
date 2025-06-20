import { Space, theme } from 'antd';

const { useToken } = theme;

interface KeyboardShortcutIconProps {
  shortcut: string;
}

const KeyboardShortcutIcon = ({ shortcut }: KeyboardShortcutIconProps) => {
  // Use Ant Design's theme token system for color awareness
  const { token } = useToken();
  const borderColor = token.colorBorder || '#d9d9d9';
  const bgColor = token.colorBgContainer || '#f5f5f5';
  const textColor = token.colorText || '#333';

  return (
    <Space size={2} align='center'>
      {shortcut.split(' + ').map((key, index) => (
        <span
          key={index}
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            border: `1px solid ${borderColor}`,
            borderRadius: '3px',
            backgroundColor: bgColor,
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            color: textColor,
            boxShadow: '0 1px 0 rgba(0,0,0,.05)'
          }}
        >
          {key}
        </span>
      ))}
    </Space>
  );
};

export default KeyboardShortcutIcon;
