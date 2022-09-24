import { FC } from 'react';
import './MatchPlay.less';

const MatchPlay: FC = () => {
  return (
    <div>
      <div id='play-display-base'>
        <div id='play-display-base-top'>
          <div id='play-display-left-score'>
            {/* <CoopertitionBar alliance={"Red"} fillWidth={coopertitionCompletion}/> */}
            <div className='teams red-bg left-score'>
              {/* {this.displayRedAlliance()} */}
            </div>
          </div>
          <div id='play-display-center'>
            <div id='score-container-header'>
              {/* <img alt={'fgc logo'} src={FGC_LOGO} className='fit-h' /> */}
            </div>
            <div id='score-container-timer'>
              <span>2:30</span>
            </div>
            <div id='score-container-scores'>
              <div id='score-container-red'>
                <div className='red-bg center'>
                  <span>0</span>
                </div>
              </div>
              <div id='score-container-blue'>
                <div className='blue-bg center'>
                  <span>0</span>
                </div>
              </div>
            </div>
          </div>
          <div id='play-display-right-score'>
            {/* <CoopertitionBar alliance={"Blue"} fillWidth={coopertitionCompletion}/> */}
            <div className='teams blue-bg right-score'>
              {/* {this.displayBlueAlliance()} */}
            </div>
          </div>
        </div>
        <div id='play-display-base-bottom'>
          <div className='info-col'>
            <span className='info-field'>MATCH: 30</span>
          </div>
          <div className='info-col'>
            <span className='info-field'>FIRST Global 2022</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPlay;
