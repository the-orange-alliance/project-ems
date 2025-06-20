import { Button } from 'antd';
import {
  ScheduleParams,
  Match,
  ScheduleItem,
  Tournament,
  assignMatchTimes
} from '@toa-lib/models';
import { FGCSchedule } from '@toa-lib/models';
import { FC, useState } from 'react';
import { createMatchSchedule } from 'src/api/use-match-data.js';
import { MatchMakerQualityDropdown } from 'src/components/dropdowns/match-maker-dropdown.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';

interface Props {
  eventSchedule?: ScheduleParams;
  scheduleItems?: ScheduleItem[];
  tournament?: Tournament;
  onCreateMatches: (matches: Match<any>[]) => void;
}

export const RandomMatches: FC<Props> = ({
  eventSchedule,
  scheduleItems,
  tournament,
  onCreateMatches
}) => {
  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const createMatches = async () => {
    setLoading(true);
    try {
      if (!eventSchedule) return;
      if (!tournament) return;
      if (!scheduleItems) return;
      const { eventKey, tournamentKey, teamKeys } = eventSchedule;
      const { fieldCount: fields, name } = tournament;
      const matches = await createMatchSchedule({
        eventKey,
        tournamentKey,
        quality,
        fields,
        matchesPerTeam: 5, // TODO: Make this configurable????
        teamsParticipating: teamKeys.length,
        teamsPerAlliance: eventSchedule.options.teamsPerAlliance,
        teamKeys,
        name
      });
      onCreateMatches(
        assignMatchTimes(
          eventSchedule.hasPremiereField
            ? FGCSchedule.FGC2024.assignFields(matches)
            : matches,
          scheduleItems
        )
      );
      showSnackbar('MatchMaker executed successfully.');
      setLoading(false);
    } catch (e) {
      setLoading(false);
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while executing matchmaker.', error);
    }
  };
  return (
    <div>
      <MatchMakerQualityDropdown quality={quality} onChange={setQuality} />
      <Button
        style={{ marginTop: 16, display: 'block', marginLeft: 'auto' }}
        type='primary'
        disabled={loading}
        onClick={createMatches}
        loading={loading}
      >
        Create Match Schedule
      </Button>
    </div>
  );
};
