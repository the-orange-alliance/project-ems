import { Space } from 'antd';
import { FC, useEffect, useCallback, useRef } from 'react';
import KeyboardShortcutIcon from './shortcut-icon.js';

interface AnchorWithShortcutProps {
  label?: string;
  shortcut: string; // e.g. 'Ctrl + S'
  action: () => void;
  disableRender?: boolean; // Optional prop to control rendering
  disableHandler?: boolean; // Optional prop to disable the handler (render only)
  disableShortcut?: boolean; // Optional prop to disable the shortcut functionality
}

const parseShortcut = (shortcut: string) => {
  // Returns an object like { ctrlKey: true, shiftKey: false, altKey: false, key: 's' }
  const parts = shortcut.toLowerCase().split(' + ');
  return {
    ctrlKey: parts.includes('ctrl'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt'),
    metaKey:
      parts.includes('meta') ||
      parts.includes('cmd') ||
      parts.includes('command'),
    key:
      parts.find(
        (p) => !['ctrl', 'shift', 'alt', 'meta', 'cmd', 'command'].includes(p)
      ) || ''
  };
};

export const Shortcut: FC<AnchorWithShortcutProps> = ({
  label,
  shortcut,
  action,
  disableRender,
  disableHandler,
  disableShortcut
}) => {
  const shortcutDefRef = useRef(parseShortcut(shortcut));
  const actionRef = useRef(action);

  // Update refs on prop change
  useEffect(() => {
    shortcutDefRef.current = parseShortcut(shortcut);
  }, [shortcut]);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const handler = useCallback((e: KeyboardEvent) => {
    const shortcutDef = shortcutDefRef.current;
    if (
      e.ctrlKey === !!shortcutDef.ctrlKey &&
      e.shiftKey === !!shortcutDef.shiftKey &&
      e.altKey === !!shortcutDef.altKey &&
      e.metaKey === !!shortcutDef.metaKey &&
      e.key.toLowerCase() === shortcutDef.key
    ) {
      e.preventDefault();
      actionRef.current();
    }
  }, []);

  useEffect(() => {
    if (disableHandler || disableShortcut) return;
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [handler, disableHandler, disableShortcut]);

  // If disableRender is true, do not render the component
  if (disableRender) {
    return null;
  }

  return (
    <a onClick={action} style={{ padding: 0 }}>
      <Space>
        <span style={{ flexGrow: 1, textAlign: 'left' }}>{label}</span>
        <KeyboardShortcutIcon shortcut={shortcut} />
      </Space>
    </a>
  );
};
