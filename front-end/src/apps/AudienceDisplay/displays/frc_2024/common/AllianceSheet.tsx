import { MatchParticipant } from '@toa-lib/models';
import './AllianceSheet.less';
import { FC } from 'react';

interface IProps {
  alliance: 'red' | 'blue';
  teams: MatchParticipant[];
}

const AllianceSheet: FC<IProps> = ({ alliance, teams }: IProps) => {
  return (
    <div id={`c-alliance-${alliance}`}>
      {teams.map((p) => (
        <div className='c-alliance-member' key={p.teamKey}>
          <div className={`c-alliance-team-number ${alliance}`}>
            {p?.teamKey}
          </div>
          <div className='c-alliance-team-name'>{p?.team?.teamNameLong}</div>
        </div>
      ))}
    </div>
  );
};

export default AllianceSheet;
