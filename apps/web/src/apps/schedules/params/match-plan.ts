import {
  ScheduleItem,
  ScheduleParams,
  calculateTotalMatches
} from '@toa-lib/models';

export interface MatchPlan {
  total: number;
  /** How the total was worked out, for display next to it. */
  formula: string;
  /** Team slots that no scheduled team fills, so the matchmaker adds surrogates. */
  surrogateSlots: number;
}

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

export const getMatchPlan = (schedule: ScheduleParams): MatchPlan => {
  const total = calculateTotalMatches(schedule);
  const { options, teamKeys, matchesPerTeam } = schedule;
  switch (schedule.type) {
    case 'Finals':
      return {
        total,
        formula: `Best of ${options.seriesType ?? 3}`,
        surrogateSlots: 0
      };
    case 'Round Robin':
    case 'Eliminations':
      return {
        total,
        formula: `${plural(options.allianceCount ?? 0, 'alliance')} ÷ 2 × ${plural(options.rounds, 'round')}`,
        surrogateSlots: 0
      };
    default: {
      const perMatch = options.teamsPerAlliance * 2;
      return {
        total,
        formula: `${plural(teamKeys.length, 'team')} × ${plural(matchesPerTeam, 'match')} ÷ ${perMatch} per match`,
        surrogateSlots: Math.max(
          0,
          total * perMatch - teamKeys.length * matchesPerTeam
        )
      };
    }
  }
};

/** Whether the generated items are the same schedule as the saved ones. */
export const matchesSavedItems = (
  generated: ScheduleItem[],
  saved: ScheduleItem[]
): boolean =>
  generated.length === saved.length &&
  generated.every(
    (item, i) =>
      item.name === saved[i].name &&
      item.day === saved[i].day &&
      item.isMatch === saved[i].isMatch &&
      item.duration === saved[i].duration &&
      Date.parse(item.startTime) === Date.parse(saved[i].startTime)
  );

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};
