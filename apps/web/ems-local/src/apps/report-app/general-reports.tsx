import { FC } from 'react';
import { Button, Row, Col } from 'antd';
import { TeamsReport } from './components/teams-report.js';
import { ReportProps } from './index.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';

export const GeneralReports: FC<ReportProps> = ({ eventKey, onGenerate }) => {
  const { data: teams } = useTeamsForEvent(eventKey);

  const generateTeamReport = () => {
    if (!teams) return;
    onGenerate(<TeamsReport teams={teams} />);
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Button type='primary' block onClick={generateTeamReport}>
          Competing Teams Report
        </Button>
      </Col>
    </Row>
  );
};
