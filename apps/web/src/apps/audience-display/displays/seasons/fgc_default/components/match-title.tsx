import styled from '@emotion/styled';
import { Match } from '@toa-lib/models';
import FGC_LOGO from '../assets/fg-logo-inverted.png';
import { Row, Col } from 'antd';

const InfoContainer = styled.div`
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 1vw;
  margin-left: 15%;
  margin-right: 15%;
  padding-top: 0.04em;
  padding-bottom: 0.1em;
  color: black;
  line-height: 0.95;
  font-size: 3.3vh;
  font-weight: 800;
  text-align: center;
  height: 100%;
`;

const GridLogo = styled(Col)(() => ({
  backgroundImage: `url(${FGC_LOGO})`,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
}));

const MatchTitle = ({
  match,
  branding = false,
  noMargin = false
}: {
  match: Match<any>;
  branding?: boolean;
  noMargin?: boolean;
}) => {
  const Item = branding ? GridLogo : Col;
  return (
    <InfoContainer style={{ margin: noMargin ? 0 : undefined }}>
      <Row style={{ height: '100%', justifyContent: 'center' }}>
        {/* Funky Spacing Shenatigans (for FIRST global logo) */}
        <Col span={0.4}></Col>
        <Item span={4.6} />
        <Col span={14}>
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <div>{match.name}</div>
            <div>Field {match.fieldNumber}</div>
          </div>
        </Col>
        <Col span={5}></Col>
      </Row>
    </InfoContainer>
  );
};

export default MatchTitle;
