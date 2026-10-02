import { Team } from '@toa-lib/models';

const parseCsvRow = (row: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      // CSV escapes quotes inside quoted values as ""
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);

  return fields;
};

export const parseTeamsFile = async (
  file: File,
  eventKey: string
): Promise<Team[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);

    reader.onload = (data: ProgressEvent<FileReader>) => {
      if (!data.target?.result) {
        resolve([]);
        return;
      }

      const rows = data.target.result
        .toString()
        .split(/\r?\n/)
        .filter((row) => row.trim().length > 0);

      const teams = rows.map((row, i) => {
        const t = parseCsvRow(row);

        return {
          eventKey,
          teamKey: i + 1,
          teamNumber: t[0]?.trim() ?? '',
          teamNameLong: t[1]?.trim() ?? '',
          teamNameShort: t[2]?.trim() ?? '',
          robotName: t[3]?.trim() ?? '',
          city: t[4]?.trim() ?? '',
          stateProv: t[5]?.trim() ?? '',
          country: t[6]?.trim() ?? '',
          countryCode: t[7]?.trim().toLowerCase() ?? '',
          cardStatus: 0,
          hasCard: false,
          rookieYear: Number.parseInt(t[8]?.trim() ?? '', 10)
        };
      });

      resolve(teams);
    };

    reader.readAsText(file);
  });
};
