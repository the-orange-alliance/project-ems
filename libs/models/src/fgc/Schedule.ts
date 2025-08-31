import { Match } from '../base/Match.js';

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

export namespace FGC2024 {
  export function assignFields(matches: Match<any>[]) {
    // FGC2024 will have 5 fields.
    // Assign them as such, while keeping 3 match concurrency.
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
          fieldNumber = 4;
          break;
        case 2:
          fieldNumber = 3;
          break;
        case 3:
          fieldNumber = 2;
          break;
        case 4:
          fieldNumber = 5;
          break;
        default:
          fieldNumber = 3;
      }
      newMatches.push({ ...match, fieldNumber });
    }
    return newMatches;
  }
  export const fgcAllianceOrder = [
    [1, 9, 24],
    [2, 10, 23],
    [3, 11, 22],
    [4, 12, 21],
    [5, 13, 20],
    [6, 14, 19],
    [7, 15, 18],
    [8, 16, 17]
  ];
}

export namespace FGC2025 {
  export function assignFields(matches: Match<any>[]) {
    // FGC2025 will have 5 fields.
    // Assign them as such, while keeping 3 match concurrency.
    // Field 5 is the premiere field.
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
        case 2:
          fieldNumber = 5;
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
  export const fgcAllianceOrder = [
    [1, 9, 24],
    [2, 10, 23],
    [3, 11, 22],
    [4, 12, 21],
    [5, 13, 20],
    [6, 14, 19],
    [7, 15, 18],
    [8, 16, 17]
  ];
}
