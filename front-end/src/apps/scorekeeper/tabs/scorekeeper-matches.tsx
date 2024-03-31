import { Divider } from '@mui/material';
import { Match, Team, Tournament } from '@toa-lib/models';
import { FC } from 'react';
import TournamentDropdown from 'src/components/dropdowns/tournament-dropdown';
import { MatchResultsTable } from 'src/components/tables/match-results-table';

interface Props {
  matches?: Match<any>[];
  teams?: Team[];
  tournaments?: Tournament[];
  tournamentKey: string | null;
  selected?: (match: Match<any>) => boolean;
  onTournamentChange: (tournamentKey: string) => void;
  onMatchSelect: (matchId: number) => void;
}

export const ScorekeeperMatches: FC<Props> = ({
  matches,
  teams,
  tournaments,
  tournamentKey,
  selected,
  onTournamentChange,
  onMatchSelect
}) => {
  return (
    <>
      <TournamentDropdown
        tournaments={tournaments}
        value={tournamentKey}
        onChange={onTournamentChange}
      />
      <Divider />
      <MatchResultsTable
        matches={matches ?? []}
        teams={teams ?? []}
        selected={selected}
        onSelect={onMatchSelect}
      />
    </>
  );
};
