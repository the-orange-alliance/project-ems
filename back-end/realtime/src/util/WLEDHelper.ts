import { WledInitParameters, WledUpdateParameters } from '@toa-lib/models';

export const buildWledInitializationPacket = (
  packet: WledInitParameters
): string => {
  const wledJson = {
    transition: 0,
    bri: 255,
    frz: false,
    fx: 0,
    seg: packet.segments
  };

  return JSON.stringify(wledJson);
};

export const buildWledSetColorPacket = (
  packet: WledUpdateParameters
): string => {
  const segments = new Map<number, any>();

  packet.patterns.forEach((pattern) => {
    if (!pattern.subset) {
      segments.set(pattern.segment, {
        id: pattern.segment,
        on: true,
        frz: false,
        fx: 0,
        col: [pattern.color]
      });
    } else {
      if (!segments.get(pattern.segment)) {
        segments.set(pattern.segment, {
          id: pattern.segment,
          on: true,
          i: [pattern.subset.startIndex, pattern.subset.endIndex, pattern.color]
        });
      } else {
        segments
          .get(pattern.segment)
          .i.push(
            pattern.subset.startIndex,
            pattern.subset.endIndex,
            pattern.color
          );
      }
    }
  });

  return JSON.stringify({ seg: Array.from(segments.values()) });
};
