import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';

import firstLogo from '../../assets/images/first-logo.png';

export interface AppCardProps {
  title: string;
  to?: string;
  href?: string;
  imgSrc?: string;
}

const AppCard: FC<AppCardProps> = ({
  title,
  to,
  href,
  imgSrc
}: AppCardProps) => {
  const navigate = useNavigate();

  const handleClick = (): void => {
    if (to) {
      navigate(to);
    }
    if (href) {
      window.location.href = href;
    }
  };

  return (
    <Card
      sx={{
        position: 'relative',
        width: '100%',
        flexBasis: '10%',
        '&::before': { content: '""', display: 'block', paddingTop: '100%' }
      }}
    >
      <CardActionArea
        onClick={handleClick}
        sx={{
          position: 'absolute',
          top: 0,
          width: '100%',
          height: '100%',
          padding: (theme) => theme.spacing(2),
          flexDirection: 'column'
        }}
        className='center'
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: `url(${imgSrc ? imgSrc : firstLogo}) center`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            marginBottom: (theme) => theme.spacing(2)
          }}
        />
        <Typography
          align='center'
          sx={{
            width: '100%'
          }}
        >
          {title}
        </Typography>
      </CardActionArea>
    </Card>
  );
};

export default AppCard;
