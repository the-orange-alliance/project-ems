import { Server, Socket } from 'socket.io';
import {
  defaultFieldOptions,
  FeedingTheFuture,
  FieldControlUpdatePacket,
  FieldOptions,
  Match as MatchObj,
  MatchSocketEvent,
  WledInitParameters
} from '@toa-lib/models';
import Room from './Room.js';
import Match from './Match.js';
import { WebSocket } from 'ws';
import {
  buildWledInitializationPacket,
  buildWledSetColorPacket
} from '../util/WLEDHelper.js';
import logger from '../util/Logger.js';
import { defaultMatchDetails } from '@toa-lib/models/build/seasons/FeedingTheFuture.js';
import { PacketManager } from '@toa-lib/models/build/fcs/FeedingTheFutureFCS.js';

export default class FCS extends Room {
  private readonly latestFcsStatus: FieldControlUpdatePacket = {
    hubs: {},
    wleds: {}
  };
  private wledSockets: Record<string, WebSocket> = {};
  private previousMatchDetails: FeedingTheFuture.MatchDetails =
    defaultMatchDetails;
  private packetManager: PacketManager;

  public constructor(server: Server, matchRoom: Match) {
    super(server, 'fcs');

    this.packetManager = new PacketManager(
      defaultFieldOptions,
      this.broadcastFcsUpdate,
      matchRoom.localEmitter
    );

    // Connect to wled websocket servers if there are wleds
    Object.entries(this.packetManager.getInitPacket().wleds).forEach((wled) => {
      this.initializeWled(wled[0], wled[1]);
    });

    matchRoom.localEmitter.on(
      MatchSocketEvent.TELEOPERATED,
      this.packetManager.handleMatchStart
    );

    matchRoom.localEmitter.on(
      MatchSocketEvent.ENDGAME,
      this.packetManager.handleEndGame
    );

    matchRoom.localEmitter.on(
      MatchSocketEvent.END,
      this.packetManager.handleMatchEnd
    );

    matchRoom.localEmitter.on(
      MatchSocketEvent.ABORT,
      this.packetManager.handleAbort
    );

    matchRoom.localEmitter.on(
      MatchSocketEvent.UPDATE,
      (match: MatchObj<any>) => {
        if (!match.details) return;
        this.packetManager.handleMatchUpdate(
          this.previousMatchDetails,
          match.details,
          this.broadcastFcsUpdate
        );
        this.previousMatchDetails = { ...match.details };
      }
    );
  }

  public initializeEvents(socket: Socket): void {
    socket.emit('fcs:init', this.packetManager.getInitPacket());

    socket.on('fcs:setFieldOptions', (fieldOptions: FieldOptions) => {
      this.packetManager.setFieldOptions(fieldOptions);
    });

    socket.on('fcs:update', (update: FieldControlUpdatePacket) => {
      this.broadcastFcsUpdate(update);
    });

    socket.on('fcs:prepareField', this.packetManager.handlePrepareField);

    socket.on('fcs:allClear', this.packetManager.handleAllClear);

    socket.on('fcs:settings', (fieldOptions: FieldOptions) => {
      this.packetManager.setFieldOptions(fieldOptions);
      this.reinitializeWleds();
    });

    socket.on('fcs:digitalInputs', this.packetManager.handleDigitalInputs);

    socket.emit('fcs:update', this.latestFcsStatus);
  }

  private broadcastFcsUpdate = (update: FieldControlUpdatePacket): void => {
    this.broadcast().emit('fcs:update', update);

    // Handle wleds
    Object.entries(update.wleds).forEach((wled) => {
      try {
        this.wledSockets[wled[0]].send(buildWledSetColorPacket(wled[1]));
      } catch {
        logger.warn('Failed to send wled pattern update');
      }
    });

    // Update this.latestFcsStatus AFTER sending out the new update
    for (const hubNumber in update.hubs) {
      const hubFromThisUpdate = update.hubs[hubNumber];

      let latestFcsStatusHub = this.latestFcsStatus.hubs[hubNumber];
      if (!latestFcsStatusHub) {
        latestFcsStatusHub = {};
        this.latestFcsStatus.hubs[hubNumber] = latestFcsStatusHub;
      }

      const servosFromThisUpdate = hubFromThisUpdate.servos;
      const motorsFromThisUpdate = hubFromThisUpdate.motors;
      const digitalInputsFromThisUpdate = hubFromThisUpdate.digitalInputs;

      if (servosFromThisUpdate) {
        for (const newServoParams of servosFromThisUpdate) {
          // Remove any parameters from this.latestFcsStatus that are intended for the same servo as newServoParams.
          latestFcsStatusHub.servos =
            latestFcsStatusHub.servos?.filter(
              (oldServoParams) => oldServoParams.port != newServoParams.port
            ) ?? [];

          latestFcsStatusHub.servos!.push(newServoParams);
        }
      }

      if (motorsFromThisUpdate) {
        for (const newMotorParams of motorsFromThisUpdate) {
          // Remove any parameters from this.latestFcsStatus that are intended for the same motor as newMotorParams.
          latestFcsStatusHub.motors =
            latestFcsStatusHub.motors?.filter(
              (oldMotorParams) => oldMotorParams.port != newMotorParams.port
            ) ?? [];

          latestFcsStatusHub.motors!.push(newMotorParams);
        }
      }

      if (digitalInputsFromThisUpdate) {
        for (const newDigitalInputParams of digitalInputsFromThisUpdate) {
          // Remove any parameters from this.latestFcsStatus that are intended for the same channel as newDigitalInputParams.
          latestFcsStatusHub.digitalInputs =
            latestFcsStatusHub.digitalInputs?.filter(
              (oldDigitalInputParams) =>
                oldDigitalInputParams.channel != newDigitalInputParams.channel
            ) ?? [];

          latestFcsStatusHub.digitalInputs!.push(newDigitalInputParams);
        }
      }
    }
  };

  // TODO(jan): Handle disconnects? Regular websockets suck

  private initializeWled(wled: string, packet: WledInitParameters): void {
    // Don't initialize if address is the default empty string
    if (packet.address === '') return;

    this.wledSockets[wled] = new WebSocket(packet.address);

    // Send initialization packet
    this.wledSockets[wled].onopen = () => {
      logger.info(
        `Successfully connected to ${wled} wled websocket: ${packet.address}`
      );
      this.wledSockets[wled].send(buildWledInitializationPacket(packet));
    };

    // Don't end program if connection failed
    this.wledSockets[wled].onerror = () => {
      logger.error(
        `Failed to connect to ${wled} wled websocket: ${packet.address}`
      );
    };
  }

  private reinitializeWleds(): void {
    Object.entries(this.packetManager.getInitPacket().wleds).forEach((wled) => {
      if (
        !this.wledSockets[wled[0]] ||
        this.wledSockets[wled[0]].url !== wled[1].address
      ) {
        // Address update
        this.initializeWled(wled[0], wled[1]);
      } else {
        try {
          this.wledSockets[wled[0]].send(
            buildWledInitializationPacket(wled[1])
          );
        } catch {
          logger.warn('Failed to send wled initialization packet');
        }
      }
    });
  }
}
