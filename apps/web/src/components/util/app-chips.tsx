// Various chips used on the home screen to show counts n things

import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { eventKeyAtom } from 'src/stores/state/event.js';
import { Spin, Tag } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useTournamentsForEvent } from 'src/api/use-tournament-data.js';
import { useMatchesForEvent } from 'src/api/use-match-data.js';

export const TeamCountTag: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const { data: teams, isLoading } = useTeamsForEvent(eventKey);
  const totalTeams = teams?.length ?? 0;
  return (
    <Tag
      color={isLoading ? 'warning' : totalTeams > 0 ? 'green' : 'red'}
      icon={
        isLoading ? (
          <Spin />
        ) : totalTeams > 0 ? (
          <CheckCircleOutlined />
        ) : (
          <ExclamationCircleOutlined />
        )
      }
      style={{ fontSize: 'medium', padding: '4px' }}
    >
      {isLoading ? '' : totalTeams} Team{totalTeams === 1 ? '' : 's'}
    </Tag>
  );
};

export const TournamentCountTag: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const { data: tournaments, isLoading } = useTournamentsForEvent(eventKey);
  const total = tournaments?.length ?? 0;
  return (
    <Tag
      color={isLoading ? 'warning' : total > 0 ? 'green' : 'red'}
      icon={
        isLoading ? (
          <Spin />
        ) : total > 0 ? (
          <CheckCircleOutlined />
        ) : (
          <ExclamationCircleOutlined />
        )
      }
      style={{ fontSize: 'medium', padding: '4px' }}
    >
      {isLoading ? '' : total} Tournament{total === 1 ? '' : 's'}
    </Tag>
  );
};

export const MatchCountTag: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const { data: matches, isLoading } = useMatchesForEvent(eventKey);
  const total = matches?.length ?? 0;
  return (
    <Tag
      color={isLoading ? 'warning' : total > 0 ? 'green' : 'red'}
      icon={
        isLoading ? (
          <Spin />
        ) : total > 0 ? (
          <CheckCircleOutlined />
        ) : (
          <ExclamationCircleOutlined />
        )
      }
      style={{ fontSize: 'medium', padding: '4px' }}
    >
      {isLoading ? '' : total} Match{total === 1 ? '' : 'es'}
    </Tag>
  );
};
