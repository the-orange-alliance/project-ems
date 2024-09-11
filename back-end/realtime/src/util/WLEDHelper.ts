import { WledInitParameters, WledUpdateParameters } from "@toa-lib/models";

export const buildWledInitializationPacket = (packet: WledInitParameters): string => {
  const wledJson = {
    transition: 0,
    bri: 255,
    frz: false,
    fx: 0,
    seg: packet.segments
  }

  return JSON.stringify(wledJson);
}

export const buildWledSetColorPacket = (packet: WledUpdateParameters): string => {
  const wledJson = {
    seg: packet.targetSegments?.map((segment) => ({
      id: segment,
      on: true,
      frz: false,
      fx: 0,
      col: [
        packet.color
      ]
    }))
  }
  
  return JSON.stringify(wledJson);
}
