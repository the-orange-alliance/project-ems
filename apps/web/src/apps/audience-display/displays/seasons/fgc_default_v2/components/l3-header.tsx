import { Typography } from 'antd';

interface IProps {
  title: string;
  leftText: string;
  rightText: string;
  /** Rendered immediately right of `leftText`, i.e. inboard of the red label. */
  leftBadge?: React.ReactNode;
  /** Rendered immediately left of `rightText`, i.e. inboard of the blue label. */
  rightBadge?: React.ReactNode;
}

const L3Header: React.FC<IProps> = ({
  title,
  leftText,
  rightText,
  leftBadge,
  rightBadge
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <Typography.Title
          level={2}
          style={{
            color: '#f87171',
            margin: 0,
            fontWeight: 'bold',
            WebkitTextStroke: '1px #00000080',
            textShadow: '0 0 1px #00000080'
          }}
        >
          {leftText}
        </Typography.Title>
        {leftBadge}
      </div>
      <Typography.Title
        level={1}
        style={{
          color: 'white',
          margin: 0,
          fontWeight: 'bold',
          WebkitTextStroke: '1px #00000080',
          textShadow: '0 0 1px #00000080'
        }}
      >
        {title}
      </Typography.Title>
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        {rightBadge}
        <Typography.Title
          level={2}
          style={{
            color: '#60a5fa',
            margin: 0,
            fontWeight: 'bold',
            WebkitTextStroke: '1px #00000080',
            textShadow: '0 0 1px #00000080'
          }}
        >
          {rightText}
        </Typography.Title>
      </div>
    </div>
  );
};

export default L3Header;
