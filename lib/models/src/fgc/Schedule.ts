import { Match } from '../Match.js';
import { EventSchedule, ScheduleItem } from '../Schedule.js';

export namespace FGC2023 {
  // We can safely assume for FGC2023 there will be 5 fields.
  // Assign them as such, while keeping 3 match concurrency.
  export function assignFields(matches: Match<any>[]) {
    const newMatches: Match<any>[] = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      let fieldNumber = 5;
      const matchIndex = i % 6;
      switch (matchIndex) {
        case 0:
          fieldNumber = 1;
          break;
        case 1:
          fieldNumber = 3;
          break;
        case 3:
          fieldNumber = 2;
          break;
        case 4:
          fieldNumber = 4;
          break;
        default:
          fieldNumber = 5;
      }
      newMatches.push({ ...match, fieldNumber });
    }
    return newMatches;
  }
}
