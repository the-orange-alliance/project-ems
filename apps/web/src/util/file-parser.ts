import { Team } from '@toa-lib/models';

export const parseTeamsFile = async (
  file: File,
  eventKey: string
): Promise<Team[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (data: ProgressEvent<FileReader>) => {
      if (!data.target || !data.target.result) {
        resolve([]);
        return;
      }
      resolve(
        data.target.result
          .toString()
          .split('\r')
          .map((team, i) => {
            const t = team.split(',');
            return {
              eventKey,
              teamKey: i + 1,
              teamNumber: t[0].replace('\n', ''),
              teamNameLong: t[1],
              teamNameShort: t[2],
              robotName: t[3],
              city: t[4],
              stateProv: t[5],
              country: t[6],
              countryCode: t[7].toLowerCase(),
              cardStatus: 0,
              hasCard: false,
              rookieYear: parseInt(t[8])
            };
          })
      );
    };
    reader.readAsText(file);
  });
};
