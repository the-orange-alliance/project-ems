import { Flex } from 'antd';
import { Match, Team, Tournament } from '@toa-lib/models';
import { FC } from 'react';
import TournamentDropdown from 'src/components/dropdowns/tournament-dropdown.js';
import { MatchResultsTable } from 'src/components/tables/match-results-table.js';

// Viewport height minus the header, controls and tab chrome above the table, so
// the rows scroll in place instead of the page; never shorter than ~5 rows.
const TABLE_BODY_HEIGHT = 'max(240px, calc(100vh - 580px))';

interface Props {
  matches?: Match<any>[];
  teams?: Team[];
  tournaments?: Tournament[];
  tournamentKey: string | null;
  disabled?: boolean;
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
  selected,
  onTournamentChange,
  onMatchSelect
}) => {
  return (
    <Flex vertical gap={12}>
      <TournamentDropdown
        tournaments={tournaments}
        value={tournamentKey}
        onChange={onTournamentChange}
      />
      <MatchResultsTable
        colored
        matches={matches ?? []}
        teams={teams ?? []}
        selected={selected}
        onSelect={onMatchSelect}
        disabled={disabled}
        scroll={{ y: TABLE_BODY_HEIGHT }}
      />
    </Flex>
  );
};
