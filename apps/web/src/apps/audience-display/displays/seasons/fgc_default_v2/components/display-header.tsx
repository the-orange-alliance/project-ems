import { Typography } from 'antd';
import FGLogo from '../assets/fg-logo-lg.png';

interface IProps {
  title: string;
  noBg?: boolean;
}

const DisplayHeader: React.FC<IProps> = ({ title, noBg }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: noBg ? undefined : '#1f29377a',
        padding: noBg ? undefined : '1rem 2rem',
        marginBottom: '1rem',
        borderRadius: '1.5rem',
        boxShadow:
          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      <img src={FGLogo} alt='FIRST Global Logo' style={{ height: '3rem' }} />
      <Typography.Title
        level={1}
        style={{ color: 'white', margin: 0, fontWeight: 'bold' }}
      >
        {title}
      </Typography.Title>
    </div>
  );
};

export default DisplayHeader;
