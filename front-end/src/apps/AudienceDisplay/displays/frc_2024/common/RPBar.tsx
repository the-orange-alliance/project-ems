import './RPBar.less';
import { FC } from 'react';

interface IProps {
  icons: FC<any>[];
  alliance: 'red' | 'blue';
}

const RPBar: FC<IProps> = ({ icons, alliance }: IProps) => {
  return (
    <div className='c-rp-container'>
      <div className={`c-rp-label`}>Ranking Points</div>
      <div className='c-rp-bar'>
        {icons.map((Icon, index) => (
          <div key={index} className={`c-rp-icon ${alliance}-bg`}>
            <Icon fontSize='inherit' />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RPBar;
