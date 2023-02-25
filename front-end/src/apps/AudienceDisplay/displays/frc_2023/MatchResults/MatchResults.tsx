import { ChargedUpDetails, Match } from '@toa-lib/models';
import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import { currentEventSelector, matchResultAtom } from 'src/stores/NewRecoil';
import './MatchResults.less';

function getAutoChargeStatus(status: number): number {
  switch (status) {
    case 0:
      return 0;
    case 1:
      return 8;
    case 2:
      return 12;
    default:
      return 0;
  }
}

function getTeleChargeStatus(status: number): number {
  switch (status) {
    case 0:
      return 0;
    case 1:
      return 6;
    case 2:
      return 10;
    default:
      return 0;
  }
}

function getParkStatus(status: number): number {
  return status === 3 ? 2 : 0;
}

const MatchResults: FC = () => {
  const event = useRecoilValue(currentEventSelector);
  const match: Match<ChargedUpDetails> | null = useRecoilValue(matchResultAtom);

  if (!match || !match.details) return null;

  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];
  const { details } = match;

  // Blue alliance breakdowns
  const blueAutoMobility =
    (details.blueAutoMobilityOne +
      details.blueAutoMobilityTwo +
      details.blueAutoMobilityThree) *
    3;
  const blueAutoPieces =
    details.blueAutoTopPieces * 6 +
    details.blueAutoMidPieces * 4 +
    details.blueAutoLowPieces * 3;
  const blueAutoCharge =
    getAutoChargeStatus(details.blueAutoChargeOne) +
    getAutoChargeStatus(details.blueAutoChargeTwo) +
    getAutoChargeStatus(details.blueAutoChargeThree);
  const blueTelePieces =
    details.blueTeleTopPieces * 5 +
    details.blueTeleMidPieces * 3 +
    details.blueTeleLowPieces * 2;
  const blueTeleCharge =
    getTeleChargeStatus(details.blueTeleChargeOne) +
    getTeleChargeStatus(details.blueTeleChargeTwo) +
    getTeleChargeStatus(details.blueTeleChargeThree);
  const bluePark =
    getParkStatus(details.blueTeleChargeOne) +
    getParkStatus(details.blueTeleChargeTwo) +
    getParkStatus(details.blueTeleChargeThree);
  const blueLinks = details.blueLinks * 5;

  // Red score breakdown
  const redAutoMobility =
    (details.redAutoMobilityOne +
      details.redAutoMobilityTwo +
      details.redAutoMobilityThree) *
    3;
  const redAutoPieces =
    details.redAutoTopPieces * 6 +
    details.redAutoMidPieces * 4 +
    details.redAutoLowPieces * 3;
  const redAutoCharge =
    getAutoChargeStatus(details.redAutoChargeOne) +
    getAutoChargeStatus(details.redAutoChargeTwo) +
    getAutoChargeStatus(details.redAutoChargeThree);
  const redTelePieces =
    details.redTeleTopPieces * 5 +
    details.redTeleMidPieces * 3 +
    details.redTeleLowPieces * 2;
  const redTeleCharge =
    getTeleChargeStatus(details.redTeleChargeOne) +
    getTeleChargeStatus(details.redTeleChargeTwo) +
    getTeleChargeStatus(details.redTeleChargeThree);
  const redPark =
    getParkStatus(details.redTeleChargeOne) +
    getParkStatus(details.redTeleChargeTwo) +
    getParkStatus(details.redTeleChargeThree);
  const redLinks = details.redLinks * 5;

  const redFouls = match.redMinPen * 5 + match.redMajPen * 12;
  const blueFouls = match.blueMinPen * 5 + match.blueMajPen * 12;

  const isRedWin = match.redScore > match.blueScore;
  const isTie = match.redScore === match.blueScore;
  const redRP =
    (isTie ? 1 : isRedWin ? 2 : 0) +
    match.details.blueActivationBonus +
    match.details.blueSustainBonus;
  const blueRP =
    (isTie ? 1 : isRedWin ? 0 : 2) +
    match.details.blueActivationBonus +
    match.details.blueSustainBonus;

  let redResultView;
  let blueResultView;

  if (isRedWin) {
    redResultView = (
      <div className='cu-result-text center-items red-border'>Winner!</div>
    );
    blueResultView = <div className='cu-result-text center-items' />;
  } else if (isTie) {
    redResultView = (
      <div className='cu-result-text center-items red-border'>Tie!</div>
    );
    blueResultView = (
      <div className='cu-result-text center-items blue-border'>Tie!</div>
    );
  } else if (!isRedWin) {
    redResultView = <div className='cu-result-text center-items' />;
    blueResultView = (
      <div className='cu-result-text center-items blue-border'>Winner!</div>
    );
  }

  return (
    <div id='cu-body'>
      <div id='cu-container'>
        <div id='cu-result-top' className='cu-border'>
          <div className='center-items cu-pre-match'>{match?.name}</div>
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
                <span>
                  {blueAutoMobility + blueAutoPieces + blueAutoCharge}
                </span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Mobility Line</span>
                <span>{blueAutoMobility}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Charge Station</span>
                <span>{blueAutoCharge}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Grid</span>
                <span>{blueAutoPieces}</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>Teleop</span>
                <span>{blueTelePieces + blueLinks}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Grid</span>
                <span>{blueTelePieces}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Links</span>
                <span>{blueLinks}</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>End Game</span>
                <span>{blueTeleCharge + bluePark}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Charge Station</span>
                <span>{blueTeleCharge}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Community Park</span>
                <span>{bluePark}</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>Red Penalty</span>
                <span>{blueFouls}</span>
              </div>
            </div>
            <div className='cu-result-alliance-scores'>
              {blueResultView}
              <div className='cu-result-score-rp blue-bg'>+{blueRP} RP</div>
              <div className='cu-result-score center-items blue-bg'>
                {match?.blueScore}
              </div>
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
                <span>{redAutoMobility + redAutoPieces + redAutoCharge}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Mobility Line</span>
                <span>{redAutoMobility}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Charge Station</span>
                <span>{redAutoCharge}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Grid</span>
                <span>{redAutoPieces}</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>Teleop</span>
                <span>{redTelePieces + redLinks}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Grid</span>
                <span>{redTelePieces}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Links</span>
                <span>{redLinks}</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>End Game</span>
                <span>{redTeleCharge + redPark}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Charge Station</span>
                <span>{redTeleCharge}</span>
              </div>
              <div className='cu-result-alliance-score-sub'>
                <span>Community Park</span>
                <span>{redPark}</span>
              </div>
              <div className='cu-result-alliance-score'>
                <span>Blue Penalty</span>
                <span>{redFouls}</span>
              </div>
            </div>
            <div className='cu-result-alliance-scores'>
              {redResultView}
              <div className='cu-result-score-rp red-bg'>+{redRP} RP</div>
              <div className='cu-result-score center-items red-bg'>
                {match?.redScore}
              </div>
            </div>
          </div>
        </div>
        <div id='cu-result-bot' className='cu-border'>
          <div className='cu-bot-logo'></div>
          <div className='cu-bot-text'>
            <span>{event?.eventName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchResults;
