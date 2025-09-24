import { Typography } from 'antd';

interface IProps {
  title: string;
  leftText: string;
  rightText: string;
}

const L3Header: React.FC<IProps> = ({ title, leftText, rightText }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}
    >
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
  );
};

export default L3Header;
