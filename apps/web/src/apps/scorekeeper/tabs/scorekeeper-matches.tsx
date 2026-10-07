import { Flex } from 'antd';
import { Match, Team, Tournament } from '@toa-lib/models';
import { FC } from 'react';
import TournamentDropdown from 'src/components/dropdowns/tournament-dropdown.js';
import { MatchResultsTable } from 'src/components/tables/match-results-table.js';
import { useWindowHeight } from 'src/hooks/use-window-height.js';

// Space taken by the header, controls and tab chrome above the table body.
const CHROME_HEIGHT = 580;
const MIN_TABLE_HEIGHT = 240;

// Stable references keep the table's memoized rows from rebuilding.
const NO_MATCHES: Match<any>[] = [];
const NO_TEAMS: Team[] = [];

interface Props {
  matches?: Match<any>[];
  teams?: Team[];
  tournaments?: Tournament[];
  tournamentKey: string | null;
  disabled?: boolean;
  loading?: boolean;
  selected?: (match: Match<any>) => boolean;
  onTournamentChange: (tournamentKey: string) => void;
  onMatchSelect: (matchId: number) => void;
}

export const ScorekeeperMatches: FC<Props> = ({
  matches,
  teams,
  tournaments,
  tournamentKey,
  disabled,
  loading,
  selected,
  onTournamentChange,
  onMatchSelect
}) => {
  const windowHeight = useWindowHeight();
  return (
    <Flex vertical gap={12}>
      <TournamentDropdown
        tournaments={tournaments}
        value={tournamentKey}
        onChange={onTournamentChange}
      />
      <MatchResultsTable
        colored
        virtual
        matches={matches ?? NO_MATCHES}
        teams={teams ?? NO_TEAMS}
        selected={selected}
        onSelect={onMatchSelect}
        disabled={disabled}
        loading={loading}
        scroll={{ y: Math.max(MIN_TABLE_HEIGHT, windowHeight - CHROME_HEIGHT) }}
      />
    </Flex>
  );
};
