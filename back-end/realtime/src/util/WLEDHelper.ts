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
  const wledJson: any = {
    seg: []
  };

  packet.patterns.forEach((pattern) => {
    wledJson.seg.push(
      ...pattern.targetSegments.map((segment) => ({
        id: segment,
        on: true,
        frz: false,
        fx: 0,
        col: [pattern.color]
      }))
    );
  });

  return JSON.stringify(wledJson);
};
