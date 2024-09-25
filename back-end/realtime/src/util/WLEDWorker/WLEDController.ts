import { WledInitParameters, WledUpdateParameters } from "@toa-lib/models";
import logger from "../Logger.js";
import { buildWledInitializationPacket, buildWledSetColorPacket } from "../WLEDHelper.js";
import WebSocket from "ws";

export class WledController {
    private static heartbeatPeriodMs = 1000;
    private static keepAliveTimeoutMs = 2000;
    private static reconnectPeriodMs = 1000;

    private socket: WebSocket | undefined;
    private initPacket: WledInitParameters;
    private keepAlive: NodeJS.Timeout | undefined;
    private heartbeat: NodeJS.Timer | undefined;
    private reinit: NodeJS.Timeout | undefined;

    private latestState: WledUpdateParameters | undefined;
    private connected = false;

    constructor(initPacket: WledInitParameters) {
        this.initPacket = initPacket;
    }

    public initialize(initPacket?: WledInitParameters): void {
        if (initPacket) {
            this.initPacket = initPacket;
            if (this.initPacket.address === this.socket?.url && this.connected) return;
        }

        clearInterval(this.heartbeat);
        clearTimeout(this.reinit);
        clearTimeout(this.keepAlive);

        if (this.initPacket.address === '') return;

        try {
            this.socket = new WebSocket(this.initPacket.address);
        } catch (e) {
            logger.error(`Failed to create websocket for ${this.initPacket.address}: ${e}`);
            return;
        }

        this.socket.onopen = () => {
            this.connected = true;
            logger.info(`Connected to ${this.initPacket.address}`);
            try {
                this.socket?.send(buildWledInitializationPacket(this.initPacket));
            } catch (e) {
                logger.error(`Failed to initialize ${this.initPacket.address}: ${e}`);
            }
            this.startHeartbeat();

            if (this.latestState) {
                this.update(this.latestState);
            }
        };

        this.socket.onerror = (e) => {
            logger.error(`Failed to connect to ${this.initPacket.address}: ${e}`);

            // Attempt to reconnect
            this.reinit = setTimeout(() => {
                this.initialize();
            }, WledController.reconnectPeriodMs);
        };

        this.socket.onmessage = () => {
            clearTimeout(this.keepAlive);
        };
    }

    private startHeartbeat(): void {
        this.heartbeat = setInterval(() => {
            // Send dummy message that the controller will respond to
            try {
                this.socket?.send('{}');
            } catch {
                logger.error(`Failed to send heartbeat to ${this.initPacket.address}`);
            }

            // Start keepalive
            this.keepAlive = setTimeout(() => {
                this.connected = false;
                logger.info(`Disconnected from ${this.initPacket.address}`);

                // If the keepalive is not cleared in time attempt to reinitialize
                this.initialize();
            }, WledController.keepAliveTimeoutMs);
        }, WledController.heartbeatPeriodMs);
    }

    public update(update: WledUpdateParameters): void {
        try {
            this.socket?.send(buildWledSetColorPacket(update));
        } catch {
            logger.error(`Failed to send pattern to ${this.initPacket.address}`);
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
}
