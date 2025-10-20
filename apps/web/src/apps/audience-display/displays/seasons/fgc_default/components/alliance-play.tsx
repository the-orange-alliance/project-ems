import styled from '@emotion/styled';
import {
  Alliance,
  BLUE_STATION,
  MatchParticipant,
  Team
} from '@toa-lib/models';
import { FC, useMemo } from 'react';
import { CountryFlag } from './country-flag.js';
import { CardStatus } from './card-status.js';
import { useAllianceMember } from 'src/api/use-alliance-data.js';

const Container = styled.div((props: { alliance: Alliance }) => ({
  backgroundColor: props.alliance === 'red' ? '#ce2000' : '#5c88ff',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-around'
}));

const TeamContainer = styled.div`
  width: 100%;
  color: #ffffff;
  display: flex;
  align-items: center;
  flex-direction: row;
  font-weight: bold;
  font-size: 3vh;
  gap: 0.5em;
  padding: 0 0.5em;
  line-height: 0.5;
`;

const AllianceText = styled.div((props: { invert?: boolean }) => ({
  width: '100%',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  flexDirection: !props.invert ? 'row-reverse' : 'row',
  fontWeight: 'bold',
  fontSize: '1.75vh',
  gap: '0.5em',
  padding: '0 0.5em',
  lineHeight: '0.5'
}));
const TeamText = styled.div`
  width: 4vw;
`;

const CardContainer = styled.div`
  width: 3vh;
  height: 3vh;
`;

interface AllianceTeamProps {
  team: Team;
  cardStatus: number;
  invert?: boolean;
}

const AllianceTeam: FC<AllianceTeamProps> = ({ team, cardStatus, invert }) => {
  return invert ? (
    <TeamContainer style={{ justifyContent: 'flex-start' }}>
      <CountryFlag cc={team.countryCode} />
      <TeamText style={{ textAlign: 'left' }}>{team.country}</TeamText>
      <CardContainer>
        <CardStatus cardStatus={cardStatus} />
      </CardContainer>
    </TeamContainer>
  ) : (
    <TeamContainer style={{ justifyContent: 'flex-end' }}>
      <CardContainer>
        <CardStatus cardStatus={cardStatus} />
      </CardContainer>
      <TeamText style={{ textAlign: 'right' }}>{team.country}</TeamText>
      <CountryFlag cc={team.countryCode} />
    </TeamContainer>
  );
};

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[];
  invert?: boolean;
  fullHeight?: boolean;
  teams?: Team[];
}

export const AlliancePlay: FC<Props> = ({
  alliance,
  participants,
  invert,
  fullHeight = false,
  teams
}) => {
  const allianceParticipants = participants.filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );
  const [firstTeam] = allianceParticipants;
  const firstTeamAlliance = useAllianceMember(
    firstTeam.eventKey,
    firstTeam.tournamentKey,
    firstTeam.teamKey
  );
  const teamsRecord = useMemo(
    () => (teams ? Object.fromEntries(teams.map((t) => [t.teamKey, t])) : {}),
    [teams]
  );
  return (
    <Container
      alliance={alliance}
      style={
        invert
          ? {
              borderTopRightRadius: '0.5em',
              borderBottomRightRadius: '0.5em',
              margin: '0.5em 0.5em 0.5em 0',
              height: fullHeight ? '100%' : undefined
            }
          : {
              borderTopLeftRadius: '0.5em',
              borderBottomLeftRadius: '0.5em',
              margin: '0.5em 0 0.5em 0.5em',
              height: fullHeight ? '100%' : undefined
            }
      }
    >
      {allianceParticipants.map((p, i) => {
        if ((!p.team && !teamsRecord[p.teamKey]) || i > 2) return null;
        return (
          <AllianceTeam
            key={p.station}
            team={p.team ?? teamsRecord[p.teamKey]}
            cardStatus={p.cardStatus}
            invert={invert}
          />
        );
      })}
      {firstTeamAlliance && (
        <AllianceText invert={invert}>
          {firstTeamAlliance.allianceNameLong}
        </AllianceText>
      )}
    </Container>
  );
};
