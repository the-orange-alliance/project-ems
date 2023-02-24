import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { currentEventSelector, matchResultAtom } from 'src/stores/NewRecoil';
import './MatchResults.less';

const MatchResults: FC = () => {
  const event = useRecoilValue(currentEventSelector);
  const match = useRecoilValue(matchResultAtom);
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];

  return (
    <div id='cu-body'>
      <div id='cu-container'>
        <div id='cu-result-top' className='cu-border'>
          {/* <div className='col-left'>
            <img alt={'toa logo'} src={TOA_LOGO} className='fit-h' />
          </div> */}
          <div className='center-items cu-pre-match'>{match?.name}</div>
          {/* <div className='col-right'>
            <img alt={'facc logo'} src={FACC_LOGO} className='fit-h' />
          </div> */}
        </div>
        <div id='cu-result-mid' className='cu-border'>
          <div className='cu-result-alliance'>
            <div className='cu-result-alliance-teams'>
              {blueAlliance.map((p) => (
                <div
                  key={p.teamKey}
                  className='cu-result-team-container blue-border'
                >
                  <div className='cu-result-team center-items'>{p.teamKey}</div>
                  <div className='cu-result-name center-left-items'>
                    {p.team?.teamNameShort}
                  </div>
                  <div className='cu-result-rank center-items'>#{0}</div>
                </div>
              ))}
            </div>
            <div className='cu-result-alliance-breakdown blue-border'>
              <div className='cu-result-alliance-score'>
                <span>Autonomous</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Power Cell</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Initiation Line</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>Teleop</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Power Cell</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Control Panel</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>End Game</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Equalization</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Hanging</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>Red Penalty</span>
                <span>0</span>
              </div>
            </div>
            <div className='cu-result-alliance-scores'>
              {/* {blueResultView} */}
              <div className='cu-result-score center-items blue-bg'>
                {match?.blueScore}
              </div>
              <div className='cu-result-score-rp blue-bg'>+{0} RP</div>
            </div>
          </div>
          <div className='cu-result-alliance'>
            <div className='cu-result-alliance-teams'>
              {redAlliance.map((p) => (
                <div
                  key={p.teamKey}
                  className='cu-result-team-container red-border'
                >
                  <div className='cu-result-team center-items'>{p.teamKey}</div>
                  <div className='cu-result-name center-left-items'>
                    {p.team?.teamNameShort}
                  </div>
                  <div className='cu-result-rank center-items'>#{0}</div>
                </div>
              ))}
            </div>
            <div className='cu-result-alliance-breakdown red-border'>
              <div className='cu-result-alliance-score'>
                <span>Autonomous</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Power Cell</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Initiation Line</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>Teleop</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Power Cell</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Control Panel</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>End Game</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Equalization</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Hanging</span>
                <span>0</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>Blue Penalty</span>
                <span>0</span>
              </div>
            </div>
            <div className='cu-result-alliance-scores'>
              {/* {redResultView} */}
              <div className='cu-result-score center-items red-bg'>
                {match?.redScore}
              </div>
              <div className='cu-result-score-rp red-bg'>+{0} RP</div>
            </div>
          </div>
        </div>
        <div id='cu-result-bot' className='cu-border'>
          <div className='cu-bot-logo'>
            {/* <img
              alt={'facc logo text'}
              src={FACC_LOGO_TEXT}
              className='fit-h'
            /> */}
          </div>
          <div className='cu-bot-text'>
            <span>{event?.eventName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchResults;
