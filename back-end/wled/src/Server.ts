import { getIPv4, environment as env } from "@toa-lib/server";
import { createServer } from 'http';
import express, { Application } from "express";
import io from "socket.io-client";
import logger from "./util/Logger.js";
import { FeedingTheFuture, FeedingTheFutureFCS, FieldControlUpdatePacket, ItemUpdate, Match, MatchSocketEvent, NumberAdjustment } from "@toa-lib/models";
import { WledController } from "./util/WLEDController.js";
import { PacketManager } from "@toa-lib/models/build/fcs/FeedingTheFutureFCS.js";
import { EventEmitter } from 'node:events';

const latestFcsStatus: FieldControlUpdatePacket = {
    hubs: {},
    wleds: {}
  };
const wledControllers: Record<string, WledController> = {};
const localEmitter: EventEmitter = new EventEmitter();
const packetManager: PacketManager = new PacketManager(
  FeedingTheFutureFCS.defaultFieldOptions,
  broadcastFcsUpdate,
  localEmitter
);
let previousMatchDetails: FeedingTheFuture.MatchDetails = FeedingTheFuture.defaultMatchDetails;


env.loadAndSetDefaults(process.env);

// Bind express to our http server
const app: Application = express();
const server = createServer(app);

// Network variables
const host = getIPv4();

// Connect to wled websocket servers if there are wleds
Object.entries(packetManager.getInitPacket().wleds).forEach((wled) => {
  wledControllers[wled[0]] = new WledController(wled[1]);
});

// Setup our socket client
const socket = io(`ws://${host}:8081`, {
    rejectUnauthorized: false,
    transports: ['websocket'],
  });
socket.on('connect', () => {
  logger.info('CONNECTED');
  socket.emit('fcs:init', packetManager.getInitPacket());
  socket.emit('fcs:update', latestFcsStatus);
  socket.emit('rooms', ['match', 'fcs']);
});
socket.on('disconnect', (reason) => {
  logger.info('DISCONNECT', reason);
});
socket.on('connect_error', (err) => {
  logger.info(`connect_error due to ${err}`);
});
socket.on('error', (err) => {
  logger.error(err);
  if (err.description) throw err.description;
    else throw err;
});
socket.on(MatchSocketEvent.TELEOPERATED, packetManager.handleMatchStart);
socket.on(MatchSocketEvent.ENDGAME, packetManager.handleEndGame);
socket.on(MatchSocketEvent.END, packetManager.handleMatchEnd);
socket.on(MatchSocketEvent.ABORT, packetManager.handleAbort);
socket.on(
  MatchSocketEvent.UPDATE,
  (match: Match<any>) => {
    if (!match.details) return;
      packetManager.handleMatchUpdate(
        previousMatchDetails,
          match.details,
          broadcastFcsUpdate
        );
        previousMatchDetails = { ...match.details };
      }
    );
socket.on(
  'fcs:setFieldOptions',
  (fieldOptions: FeedingTheFutureFCS.FieldOptions) => {
    packetManager.setFieldOptions(fieldOptions);
  }
);
socket.on(
  'fcs:update',
  (update: FieldControlUpdatePacket) => {
      broadcastFcsUpdate(update);
  }
);
socket.on('fcs:prepareField', () => {
  console.log("TESTINg");
  packetManager.handlePrepareField();
});
socket.on('fcs:allClear', packetManager.handleAllClear);
socket.on(
  'fcs:settings',
  (fieldOptions: FeedingTheFutureFCS.FieldOptions) => {
    logger.info("RECEIVED FIELD SETTINGS");
    packetManager.setFieldOptions(fieldOptions);
    Object.entries(packetManager.getInitPacket().wleds).forEach(
      (wled) => {
        wledControllers[wled[0]].initialize(wled[1]);
      }
    );
  }
);
socket.on('fcs:digitalInputs', packetManager.handleDigitalInputs);


// Local emitter events
localEmitter.on(
  MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM,
  (packet: ItemUpdate) => socket.send(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM, packet)
);
localEmitter.on(
  MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER,
  (packet: NumberAdjustment) => socket.send(MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER, packet)
);

// Broadcast to the FCS
function broadcastFcsUpdate(update: FieldControlUpdatePacket): void {
    socket.emit('fcs:update', update);

    // Handle wleds
    Object.entries(update.wleds).forEach((wled) => {
      wledControllers[wled[0]].update(wled[1]);
    });

    // Update this.latestFcsStatus AFTER sending out the new update
    for (const hubNumber in update.hubs) {
      const hubFromThisUpdate = update.hubs[hubNumber];

      let latestFcsStatusHub = latestFcsStatus.hubs[hubNumber];
      if (!latestFcsStatusHub) {
        latestFcsStatusHub = {};
        latestFcsStatus.hubs[hubNumber] = latestFcsStatusHub;
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

// Start the server
server.listen(
  {
    host,
    port: env.get().servicePort
  },
  () =>
    logger.info(
      `[${env.get().nodeEnv.charAt(0).toUpperCase()}][${env
        .get()
        .serviceName.toUpperCase()}] Server started on ${host}:${
        env.get().servicePort
      }`
    )
);
