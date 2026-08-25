import { FC } from 'react';
import { DisplayProps } from '../../displays';
import styled from '@emotion/styled';
import { AlliancePreview } from './components/alliance-preview';
import MatchTitle from './components/match-title';

const TitleContainer = styled.div`
  margin-bottom: 1vh;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1em 2em;
  padding-top: 2em;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.5) 93%,
    rgba(2, 0, 36, 0) 100%
  );
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
`;

export const MatchPreviewStream: FC<DisplayProps> = ({ match, ranks }) => {
  const numParticipants = match.participants?.length ?? 0;
  return (
    <Container>
      <TitleContainer>
        <MatchTitle match={match} branding />
      </TitleContainer>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: numParticipants > 6 ? '25vh' : '18vh',
          gap: 40
        }}
      >
        <AlliancePreview
          alliance='red'
          participants={match.participants ?? []}
          ranks={ranks}
          small
        />
        <AlliancePreview
          alliance='blue'
          participants={match.participants ?? []}
          ranks={ranks}
          small
        />
      </div>
    </Container>
  );
};
