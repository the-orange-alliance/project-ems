import { FC } from 'react';
import './MatchBar.less';
import Logo from '../res/SeasonLogo.png';
import Theme from '../res/SeasonTheme.png';
import { useRecoilValue } from 'recoil';
import {
  currentEventSelector,
  matchInProgressAtom
} from 'src/stores/NewRecoil';

interface IProps {
  upNext?: boolean;
}

const MatchBar: FC<IProps> = ({ upNext }: IProps) => {
  const event = useRecoilValue(currentEventSelector);
  const match = useRecoilValue(matchInProgressAtom);

  return (
    <div id='frc-matchbar-top' className='center-items'>
      {/* FIRST in Show Logo */}
      <div id='frc-matchbar-top-left' className='center-items'>
        <div className='frc-matchbar-center-left-items'>
          <img alt={'first in show logo'} src={Theme} className='fit-h' />
        </div>
      </div>

      <div id='frc-matchbar-top-center'>
        <div className='frc-matchbar-center-items-center'>
          {upNext ? 'Up Next: ' : ''}
          {match?.name} at {event?.eventName}
        </div>
      </div>

      <div id='frc-matchbar-top-right'>
        <div className='frc-matchbar-center-items-right'>
          <img alt={'crensendo  logo'} src={Logo} className='fit-h' />
        </div>
      </div>
    </div>
  );
};

export default MatchBar;
