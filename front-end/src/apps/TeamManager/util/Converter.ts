import { Team } from '@toa-lib/models';

export function getTeamsFromFile(data: string): Team[] {
  return data.split('\n').map((team) => {
    const t = team.split(',');
    return {
      teamKey: parseInt(t[0]),
      eventParticipantKey: t[1],
      teamNameLong: t[2],
      teamNameShort: '',
      robotName: '',
      city: t[5],
      stateProv: '',
      country: t[6],
      countryCode: t[7],
      cardStatus: 0,
      hasCard: false,
      rookieYear: 2022
    };
  });
}
