import { Team } from '@toa-lib/models';

export function getTeamsFromFile(data: string): Team[] {
  return data.split('\n').map((team) => {
    const t = team.split(',');
    return {
      teamKey: parseInt(t[0]),
      eventParticipantKey: t[1],
      teamNameLong: t[2],
      teamNameShort: t[3],
      robotName: t[4],
      city: t[5],
      stateProv: t[6],
      country: t[7],
      countryCode: t[8],
      cardStatus: 0,
      hasCard: false,
      rookieYear: 2022
    };
  });
}
