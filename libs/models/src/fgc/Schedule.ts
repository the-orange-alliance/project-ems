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

// We'll leave this in for scientific purposes, but it turns out I'm actually a genius and don't need this.
// export function generateScheduleWithPremiereField(
//   oldSchedule: EventSchedule
// ): ScheduleItem[] {
//   const items = generateDefaultScheduleItems(oldSchedule);
//   const schedule = JSON.parse(JSON.stringify(oldSchedule));
//   let index = 0;
//   let normalIndex = 0;
//   let premiereIndex = 0;
//   let [prevItem] = items;
//   let breakPadding = 0;
//   let breakIndex = 0;

//   let needsBufferMatch = false;
//   let bufferCount = 0;
//   let dayPremiereTime = 0;
//   let dayNormalTime = 0;
//   for (const item of items) {
//     if (prevItem.day !== item.day) {
//       schedule.days[prevItem.day].endTime = DateTime.fromISO(prevItem.startTime)
//         .plus({ minutes: prevItem.duration })
//         .toISO();
//       premiereIndex = 0;
//       normalIndex = 0;
//       index = 0;
//       breakPadding = 0;
//       breakIndex = 0;
//       dayPremiereTime = 0;
//       dayNormalTime = 0;
//       needsBufferMatch = false;
//     }

//     if (item.isMatch) {
//       // For all matches that are NOT on the final day. FIRST GLOBAL ONLY.
//       // if (
//       //   item.day + 1 === schedule.days.length &&
//       //   schedule.type === 'Qualification'
//       // ) {
//       //   item.duration = FGC_SIDE_FIELDS_CYCLE_TIME;
//       //   item.startTime = schedule.days[item.day].startTime
//       //     .add(7 * premiereIndex + breakPadding, 'minutes')
//       //     .toISOString();
//       //   index++;
//       //   if (index % 3 === 0) {
//       //     index = 0;
//       //     premiereIndex++;
//       //   }
//       //   // TODO - Test and make sure this reflects on the fields.
//       // } else {
//       if (!needsBufferMatch) {
//         if (index % 7 < 4) {
//           item.duration = schedule.cycleTime;
//           item.startTime =
//             DateTime.fromISO(schedule.days[item.day].startTime)
//               .plus({ minutes: 10 * normalIndex + breakPadding })
//               .toISO() ?? '';
//           dayNormalTime += item.duration / 2;
//           // console.log("CREATING NORMAL MATCH", index, item.duration, dayPremiereTime, dayNormalTime);
//         } else {
//           item.duration = schedule.cycleTime;
//           item.startTime =
//             DateTime.fromISO(schedule.days[item.day].startTime)
//               .plus({ minutes: item.duration * premiereIndex + breakPadding })
//               .toISO() ?? '';
//           dayPremiereTime += item.duration;
//           premiereIndex++;
//           // console.log("CREATING PREMIERE MATCH", index, item.duration, dayPremiereTime, dayNormalTime);
//         }
//         if (index % 7 === 1) {
//           normalIndex++;
//         }
//         if (index % 7 === 6) {
//           // console.log("NEW MATCH PAIRS");
//           index = 0;
//           normalIndex++;
//           bufferCount = 0;
//           needsBufferMatch =
//             dayPremiereTime - dayNormalTime === schedule.cycleTime;
//         } else {
//           index++;
//         }
//       } else {
//         // console.log("BUFFER MATCH");
//         item.duration = schedule.cycleTime;
//         item.startTime =
//           DateTime.fromISO(schedule.days[item.day].startTime)
//             .plus({ minutes: item.duration * normalIndex + breakPadding })
//             .toISO() ?? '';
//         dayPremiereTime = 0;
//         dayNormalTime = 0;
//         bufferCount++;
//         needsBufferMatch = bufferCount < 2;
//         if (!needsBufferMatch) {
//           normalIndex++;
//         }
//       }
//       // }
//     } else {
//       const thisBreak = schedule.days[item.day].breaks[breakIndex];
//       schedule.days[item.day].breaks[breakIndex].startTime = DateTime.fromISO(
//         prevItem.startTime
//       ).plus({ minutes: prevItem.duration });
//       schedule.days[item.day].breaks[breakIndex].endTime = DateTime.fromISO(
//         thisBreak.startTime
//       ).plus({ minutes: thisBreak.duration });
//       breakPadding += item.duration;
//       breakIndex++;
//     }
//     prevItem = item;
//   }
//   if (items.length > 0) {
//     schedule.days[prevItem.day].endTime = DateTime.fromISO(
//       prevItem.startTime
//     ).plus({ minutes: prevItem.duration });
//   }
//   return items;
// }
