import { Server, Socket } from 'socket.io';
import {
  FeedingTheFuture,
  FieldControlUpdatePacket,
  FeedingTheFutureFCS,
  Match as MatchObj,
  MatchSocketEvent,
  FieldControlStatus
} from '@toa-lib/models';
import Room from './Room.js';
import Match from './Match.js';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { environment } from '@toa-lib/server';
import logger from '../util/Logger.js';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export default class FCS extends Room {
  private readonly latestFcsStatus: FieldControlUpdatePacket = {
    hubs: {},
    wleds: {}
  };
  // private wledControllers: Record<string, WledController> = {};
  private wledControllers: Record<string, Worker> = {};
  private previousMatchDetails: FeedingTheFuture.MatchDetails =
    FeedingTheFuture.defaultMatchDetails;
  private packetManager: FeedingTheFutureFCS.PacketManager;
  private status: FieldControlStatus = { wleds: {} };

  public constructor(server: Server, matchRoom: Match) {
    super(server, 'fcs');

    this.packetManager = new FeedingTheFutureFCS.PacketManager(
      FeedingTheFutureFCS.defaultFieldOptions,
      this.broadcastFcsUpdate,
      matchRoom.localEmitter
    );

    // Connect to wled websocket servers if there are wleds
    Object.entries(this.packetManager.getInitPacket().wleds).forEach((wled) => {
      const isProd = environment.get().nodeEnv === 'production';
      const path = isProd
        ? `${__dirname}/worker/index.js`
        : join(__dirname, '../../build/util/WLEDWorker/worker.js');
      logger.verbose(`Creating WLED worker for ${wled[0]} at ${path}`);
      this.wledControllers[wled[0]] = new Worker(path, { workerData: wled[1] });

      // Set up wled statuses
      this.status.wleds[wled[0]] = {
        connected: false,
        stickyLostConnection: false
      };
      this.wledControllers[wled[0]].on('message', (message) => {
        if (message.type === 'status') {
          if (!message.data.connected)
            this.status.wleds[wled[0]].stickyLostConnection = true;
          this.status.wleds[wled[0]].connected = message.data.connected;
          this.broadcast().emit('fcs:status', this.status);
        }
      });
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
        this.previousMatchDetails = JSON.parse(JSON.stringify(match.details));
      }
    );
  }

  public initializeEvents(socket: Socket): void {
    // Emit init and status packets when a client connects
    socket.emit('fcs:init', this.packetManager.getInitPacket());
    socket.emit('fcs:status', this.status);

    socket.on(
      'fcs:setFieldOptions',
      (fieldOptions: FeedingTheFutureFCS.FieldOptions) => {
        this.packetManager.setFieldOptions(fieldOptions);
      }
    );

    socket.on('fcs:update', (update: FieldControlUpdatePacket) => {
      this.broadcastFcsUpdate(update);
    });

    socket.on('fcs:prepareField', this.packetManager.handlePrepareField);

    socket.on('fcs:allClear', this.packetManager.handleAllClear);

    socket.on('fcs:awardsMode', this.packetManager.awardsMode);

    socket.on(
      'fcs:settings',
      (fieldOptions: FeedingTheFutureFCS.FieldOptions) => {
        this.packetManager.setFieldOptions(fieldOptions);
        Object.entries(this.packetManager.getInitPacket().wleds).forEach(
          (wled) => {
            // this.wledControllers[wled[0]].initialize(wled[1]);
            this.wledControllers[wled[0]].postMessage({
              type: 'initialize',
              data: wled[1]
            });
          }
        );
      }
    );

    socket.on('fcs:digitalInputs', this.packetManager.handleDigitalInputs);

    socket.on('fcs:clearStatus', () => {
      Object.entries(this.status.wleds).forEach((wled) => {
        this.status.wleds[wled[0]].stickyLostConnection =
          !this.status.wleds[wled[0]].connected;
      });
      socket.emit('fcs:status', this.status);
    });

    socket.emit('fcs:update', this.latestFcsStatus);
  }

  private broadcastFcsUpdate = (update: FieldControlUpdatePacket): void => {
    this.broadcast().emit('fcs:update', update);

    // Handle wleds
    Object.entries(update.wleds).forEach((wled) => {
      // this.wledControllers[wled[0]].update(wled[1]);
      this.wledControllers[wled[0]].postMessage({
        type: 'update',
        data: wled[1]
      });
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
}
