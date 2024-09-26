import { WledInitParameters, WledUpdateParameters } from '@toa-lib/models';
import logger from '../Logger.js';
import {
  buildWledInitializationPacket,
  buildWledSetColorPacket
} from '../WLEDHelper.js';
import WebSocket from 'ws';

export class WledController {
  private static heartbeatPeriodMs = 500;
  private static keepAlivePeriodMs = 500;
  private static reconnectPeriodMs = 1250;
  private static keepAliveTimeoutMs = 1250;

  private socket: WebSocket | null;
  private initPacket: WledInitParameters;
  private keepAlive: NodeJS.Timer | null;
  private heartbeat: NodeJS.Timer | null;

  private latestState: WledUpdateParameters | undefined;
  private connected = false;

  private lastTimestamp: number | null;

  constructor(initPacket: WledInitParameters) {
    this.initPacket = initPacket;
    this.keepAlive = null;
    this.heartbeat = null;
    this.socket = null;
    this.lastTimestamp = null;
  }

  public initialize(initPacket?: WledInitParameters): void {
    if (initPacket) {
      this.initPacket = initPacket;
      if (this.initPacket.address === this.socket?.url && this.connected)
        return;
    }

    if (this.initPacket.address === '') return;

    try {
      this.socket = new WebSocket(this.initPacket.address);
    } catch (e) {
      logger.error(`${this.getName()} failed to create websocket: ${e}`);
      return;
    }

    this.socket.onopen = (e: WebSocket.Event) => {
      if (!this.socket) return;
      if (this.socket.readyState === 0) return;
      this.connected = true;
      logger.info(`${this.getName()} === connected ===`);
      try {
        this.socket?.send(buildWledInitializationPacket(this.initPacket));
      } catch (e) {
        logger.error(`${this.getName()} failed to initialize: ${e}`);
      }

      this.startHeartbeat();
      this.startKeepalive();

      if (this.latestState) {
        this.update(this.latestState);
      }
    };

    this.socket.onclose = () => {
      logger.error(`${this.getName()} disconnected`);
      this.connected = false;
      // If the keepalive loop is running, clear it
      if (this.keepAlive) {
        clearInterval(this.keepAlive);
        this.keepAlive = null;
      }
      // Attempt to reconnect once the socket has closed
      setTimeout(() => this.initialize(), WledController.reconnectPeriodMs);
    };

    this.socket.onerror = (e: WebSocket.ErrorEvent) => {
      logger.error(`${this.getName()} failed to connect: ${e.error}`);
    };

    this.socket.onmessage = () => {
      this.lastTimestamp = Date.now();
    };
  }

  private startHeartbeat(): void {
    logger.info(`${this.getName()} starting heartbeat`);
    this.heartbeat = setInterval(() => {
      // Send dummy message that the controller will respond to
      try {
        this.socket?.send('{}');
      } catch {
        logger.warn(`${this.getName()} failed to send heartbeat`);
      }
      if (!this.connected && this.heartbeat) {
        logger.info(`${this.getName()} clearing heartbeat`);
        clearInterval(this.heartbeat);
        this.heartbeat = null;
      }
    }, WledController.heartbeatPeriodMs);
  }

  private startKeepalive(): void {
    logger.info(`${this.getName()} starting keepalive`);
    this.keepAlive = setInterval(() => {
      if (!this.connected) return;
      if (!this.lastTimestamp) return;
      if (
        Date.now() - this.lastTimestamp >=
        WledController.keepAliveTimeoutMs
      ) {
        logger.error(`${this.getName()} keepalive timeout`);
        this.connected = false;
        this.socket?.terminate();

        if (this.keepAlive) {
          logger.info(`${this.getName()} clearing keepalive`);
          clearInterval(this.keepAlive);
          this.keepAlive = null;
        }

        setTimeout(() => {
          logger.info(`${this.getName()} attempting to reinitialize`);
          this.initialize();
        }, WledController.reconnectPeriodMs);
      }
    }, WledController.keepAlivePeriodMs);
  }

  public update(update: WledUpdateParameters): void {
    try {
      this.socket?.send(buildWledSetColorPacket(update));
    } catch {
      logger.error(`${this.getName()} failed to send pattern update`);
    }

    if (!this.latestState) {
      this.latestState = update;
    }
    for (const newPattern of update.patterns) {
      this.latestState.patterns =
        this.latestState.patterns.filter(
          (oldPattern) => oldPattern.segment != newPattern.segment
        ) ?? [];

      this.latestState.patterns!.push(newPattern);
    }
  }

  private getName(): string {
    const name = this.initPacket.address.replace(/(ws:\/\/)|(\/ws)/g, '');
    const parts = name.split('-');
    return name.replace(parts[0] + '-', '');
  }
}
