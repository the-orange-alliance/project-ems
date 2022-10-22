import {
  Match,
  MatchMakerParams,
  MatchParticipant,
  getTournamentLevelFromType,
  getMatchKeyPartialFromType
} from '@toa-lib/models';
import { execFile } from 'child_process';

export const getArgFromQualityStr = (quality: string): string => {
  switch (quality) {
    case 'fair':
      return '-f';
    case 'good':
      return '-g';
    case 'best':
      return '-b';
    default:
      return '-b';
  }
};

export const executeMatchMaker = async (
  path: string,
  args: string[],
  params: MatchMakerParams
) => {
  return new Promise((resolve, reject) => {
    execFile(path, args, (error: any, stdout: any, stderr: any) => {
      // TODO - better error-handling
      if (error) {
        reject(error);
      } else {
        resolve(parseMatchMaker(stdout, params));
      }
    });
  });
};

function parseMatchMaker(output: string, params: MatchMakerParams): Match[] {
  const matches: Match[] = [];
  const lines = output.toString().split('\n');
  for (const line of lines) {
    if (line.length <= 1) break;
    const properties = line.split(' ');
    const matchNumber = parseInt(properties[0]);
    const matchKey = `${params.eventKey}-${getMatchKeyPartialFromType(
      params.type
    )}${matchNumber.toString().padStart(3, '0')}`;
    const participants: MatchParticipant[] = [];

    for (let i = 0; i < params.teamsPerAlliance * 2; i++) {
      participants.push({
        eventKey: params.eventKey,
        tournamentKey: params.tournamentKey,
        id: matchNumber,
        cardStatus: 0,
        station:
          i < params.teamsPerAlliance
            ? 11 + i
            : 21 + i - params.teamsPerAlliance,
        surrogate: parseInt(properties[i * 2 + 2].toString().replace('\r', '')),
        teamKey: parseInt(properties[i * 2 + 1]),
        disqualified: 0,
        noShow: 0
      });
    }

    matches.push({
      eventKey: params.eventKey,
      tournamentKey: params.tournamentKey,
      id: matchNumber,
      fieldNumber:
        matchNumber % params.fields === 0
          ? params.fields
          : matchNumber % params.fields,
      name: `${params.type} Match ${matchNumber}`,
      result: -1,
      active: 0,
      blueMajPen: 0,
      blueMinPen: 0,
      blueScore: 0,
      cycleTime: 0,
      prestartTime: '',
      redMajPen: 0,
      redMinPen: 0,
      redScore: 0,
      scheduledTime: '',
      startTime: '',
      uploaded: 0,
      participants
    });
  }
  return matches;
}
