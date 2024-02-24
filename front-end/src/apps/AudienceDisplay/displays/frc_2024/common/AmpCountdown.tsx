import { CircularProgress } from '@mui/material';
import { FC, useEffect, useRef, useState } from 'react';
import { timer } from 'src/stores/NewRecoil';

interface IProps {
  amped: boolean;
  color: 'red' | 'blue';
}

const AmpCountdown: FC<IProps> = ({ amped, color }: IProps) => {
  const [time, setTime] = useState(10);
  const isAmped = useRef(amped);
  const startTime = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => {
      if (isAmped.current) {
        setTime((10 - (startTime.current - timer.timeLeft)) / 10);
      }
    }, 500);

    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (amped) {
      startTime.current = timer.timeLeft;
      isAmped.current = true;
    } else {
      startTime.current = 0;
      isAmped.current = false;
    }
  }, [amped]);

  return (
    <div style={{ transform: 'rotate(.6turn)' }}>
      <CircularProgress
        color={color === 'red' ? 'error' : 'primary'}
        variant='determinate'
        value={80 * time}
      />
    </div>
  );
};

export default AmpCountdown;
