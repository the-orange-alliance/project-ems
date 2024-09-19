import {
  FieldControlInitPacket,
  FieldControlUpdatePacket
} from '../base/FieldControl.js';

export class LedStrip {
  public readonly controller: string;
  public readonly segment: number;

  public constructor(controller: string, segment: number) {
    this.controller = controller;
    this.segment = segment;
  }
}

type MotorPortType = 'on board' | 'spark mini';

export class Motor {
  public readonly hub: number;
  public readonly portType: MotorPortType;
  public readonly port: number;

  public constructor(hub: number, portType: MotorPortType, port: number) {
    this.hub = hub;
    this.portType = portType;
    this.port = port;
  }
}

export function applyPatternToStrips(
  color: string,
  strips: LedStrip[],
  packet: FieldControlUpdatePacket
): void {
  strips.forEach((strip) => {
    if (!packet.wleds[strip.controller]) {
      packet.wleds[strip.controller] = {
        patterns: []
      };
    }

    packet.wleds[strip.controller].patterns.push({
      segment: strip.segment,
      color
    });
  });
}

export function applyPartialPatternToStrips(
  color: string,
  startIndex: number,
  endIndex: number,
  strips: LedStrip[],
  packet: FieldControlUpdatePacket
): void {
  strips.forEach((strip) => {
    if (!packet.wleds[strip.controller]) {
      packet.wleds[strip.controller] = {
        patterns: []
      };
    }

    packet.wleds[strip.controller].patterns.push({
      segment: strip.segment,
      color,
      subset: {
        startIndex,
        endIndex
      }
    });
  });
}

export function applySetpointToMotors(
  setpoint: number,
  motors: Motor[],
  packet: FieldControlUpdatePacket
): void {
  motors.forEach((motor) => {
    if (packet.hubs[motor.hub] == undefined) {
      packet.hubs[motor.hub] = { motors: [], servos: [], digitalInputs: [] };
    }

    if (motor.portType === 'on board') {
      packet.hubs[motor.hub].motors?.push({
        port: motor.port,
        setpoint: setpoint
      });
    } else if (motor.portType === 'spark mini') {
      packet.hubs[motor.hub].servos?.push({
        port: motor.port,
        pulseWidth: setpoint * 1000 + 1500
      });
    }
  });
}
