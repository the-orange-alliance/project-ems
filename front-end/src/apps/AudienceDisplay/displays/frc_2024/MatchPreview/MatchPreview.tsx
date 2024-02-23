import { FC, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { matchInProgressAtom } from 'src/stores/NewRecoil';
import './MatchPreview.less';
import AllianceSheet from '../common/AllianceSheet';
import MatchBar from '../common/MatchBar';
import { AudienceDisplayProps } from '../../AudienceDisplayProvider';

const MatchPreview: FC<AudienceDisplayProps> = ({
  visible = true
}: AudienceDisplayProps) => {
  const match = useRecoilValue(matchInProgressAtom);
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];

  return (
    <div id='c-body'>
      <div className={`c-preview-matchbar ${visible ? 'in' : ''}`}>
        <MatchBar upNext />
      </div>
      <div id='c-teams'>
        <div id='c-teams-blue' className={visible ? 'in' : ''}>
          <AllianceSheet alliance='blue' teams={blueAlliance} />
        </div>
        <div id='c-teams-red' className={visible ? 'in' : ''}>
          <AllianceSheet alliance='red' teams={redAlliance} />
        </div>
      </div>
    </div>
  );
};

export default MatchPreview;
