import log from "./logger.js";
import { DriverstationSupport } from "./devices/driverstation.js";
import { AccesspointSupport } from "./devices/accesspoint.js";
import { SwitchSupport } from "./devices/switch.js";
import { PlcSupport } from "./devices/plc.js";
import {
    Match,
    MatchTimer,
    Event,
    MatchMode,
    MatchKey
} from "@toa-lib/models";
import { getMatch } from "./helpers/ems.js";
import { environment } from "@toa-lib/server";
import { SocketSupport } from "./devices/socket.js";
import { SettingsSupport } from "./devices/settings.js";
import { sleep } from "./helpers/generic.js";

const logger = log("server");

const ipRegex =
    /\b(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\b/;

let host = environment.get().serviceHost || "127.0.0.1";
let udpTcpListenerIp = "10.0.100.5";

if (process.argv[2] && process.argv[2].match(ipRegex)) {
    host = process.argv[2];
}

export class EmsFrcFms {
    private static _instance: EmsFrcFms;
    public _timer: MatchTimer = new MatchTimer();
    public activeMatch: Match<any> | null;
    public timeLeft: number = 0;
    public matchState: number = 0;
    public event: Event;
    private dsInterval: any;
    private apInterval: any;
    private plcInterval: any;
    public matchStateMap: Map<String, number> = new Map<String, number>([
        ["prestart", 0],
        ["timeout", 1],
        ["post-timeout", 2],
        ["start-match", 3],
        ["auto", 4],
        ["transition", 5],
        ["tele", 5],
    ]);

    constructor() {
        this.activeMatch = {} as any;
        this.event = {} as any;
        // Attempt to Authenticate to EMS and then init FMS
        this.attemptInit();
    }

    public static getInstance(): EmsFrcFms {
        if (typeof EmsFrcFms._instance === "undefined") {
            EmsFrcFms._instance = new EmsFrcFms();
        }
        return EmsFrcFms._instance;
    }

    private async attemptInit() {
        let isInit = false;
        let initializeCount = 1;
        // Loop over init until we're successful
        while (!isInit) {
            await this.initFms()
                .then(() => {
                    isInit = true;
                })
                .catch(async (err) => {
                    logger.error(`❌ Failed to initialize FMS after ${initializeCount} tries. Error: ${err}`);
                    initializeCount++;
                    await sleep(5000);
                });
        }
    }

    public async initFms() {
        // Init EMS
        await SocketSupport.getInstance().initSocket();

        // Add some socket events
        await this.setupSocketEvents();

        // Init Timer
        this._timer = new MatchTimer();
        this.initTimer();
        this.timeLeft = this._timer.timeLeft;

        // Init settings
        SettingsSupport.getInstance().initSettings();

        // Restart/Start loops
        this.restartServices();
    }

    private async setupSocketEvents() {
        // Manage Socket Events
        SocketSupport.getInstance().socket?.on("match:prestart", (matchKey: MatchKey) => {
            logger.info("🔁 Prestart Command Issued");
            this.matchState = MatchMode.PRESTART;
            this.fmsOnPrestart(matchKey);
        });
    }

    public restartServices() {
        // If FMS is disabled, stop all loops
        if (!SettingsSupport.getInstance().settings.enableFms) {
            clearInterval(this.dsInterval);
            clearInterval(this.apInterval);
            clearInterval(this.plcInterval);
            DriverstationSupport.getInstance().kill();
        } else {
            // Initilize Driverstation
            DriverstationSupport.getInstance().kill();
            DriverstationSupport.getInstance().dsInit(udpTcpListenerIp);

            // Start/Restart Driverstation Loop
            clearInterval(this.dsInterval);
            this.startDriverStation();

            // Start advanced networking loops
            if (SettingsSupport.getInstance().settings.enableAdvNet) {
                // Start AP
                clearInterval(this.apInterval);
                this.startAPLoop();

                if (SettingsSupport.getInstance().settings.enablePlc) {
                    clearInterval(this.plcInterval);
                    this.startPLC();
                }
            } else {
                clearInterval(this.apInterval);
                clearInterval(this.plcInterval);
            }
        }
    }

    private async fmsOnPrestart(matchKey: MatchKey) {
        this.activeMatch = await this.getMatch(matchKey).catch((err) => {
            logger.error("❌ Error getting participant information: " + err);
            return null;
        });

        if (!this.activeMatch) {
            logger.error("❌ Received prestart command, but found no active match");
            return;
        }

        if (this.activeMatch.fieldNumber !== SettingsSupport.getInstance().settings.fieldNumber) {
            logger.error("ℹ Received prestart command, but not my field");
            this.activeMatch = null;
            return;
        }

        // Settings on prestart (this updates the tournament settings)
        SettingsSupport.getInstance().onPrestart(matchKey);

        // Call DriverStation Prestart
        DriverstationSupport.getInstance().onPrestart(this.activeMatch);

        // If advanced networking is enabled, configure AP and Switch
        if (SettingsSupport.getInstance().settings.enableAdvNet) {
            // Configure AP
            AccesspointSupport.getInstance().onPrestart(this.activeMatch);

            // Configure Switch
            SwitchSupport.getInstance().onPrestart(this.activeMatch);

            // Configure PLC, if enabled
            if (SettingsSupport.getInstance().settings.enablePlc) {
                // Set Field Lights
                PlcSupport.getInstance().onPrestart();
            }
        }
    }

    private initTimer() {
        SocketSupport.getInstance().socket?.on("match:start", () => {
            // Check if we have a match
            if (!this.activeMatch) {
                logger.info("ℹ Match Started, but I have no active match");
                return;
            }

            // TODO: Down the line, it may be possible to have multiple matches prestarted at the same time. 
            // TODO: Make sure we check that the match that got started is our active match!

            // Signal DriverStation Start
            DriverstationSupport.getInstance().driverStationMatchStart();
            this._timer.on("timer:auto", () => {
                this.matchState = MatchMode.AUTONOMOUS;
                logger.info("▶ Autonomous");
            });
            this._timer.on("timer:transition", () => {
                this.matchState = MatchMode.TRANSITION;
                logger.info("▶ Transistion");
            });
            this._timer.on("timer:tele", () => {
                this.matchState = MatchMode.TELEOPERATED;
                logger.info("▶ Teleoperated");
            });
            this._timer.on("timer:endgame", () => {
                this.matchState = MatchMode.ENDGAME;
                logger.info("▶ Endgame");
            });
            this._timer.on("timer:end", () => {
                this.removeMatchlisteners();
                this.matchState = MatchMode.ENDED;
                logger.info("⏹ Local Timer Ended");
            });

            logger.info("▶ Match Started");
            this._timer.start();
            this.matchState = MatchMode.AUTONOMOUS;
            this.timeLeft = this._timer.timeLeft;
            const timerID = global.setInterval(() => {
                this.timeLeft = this._timer.timeLeft;
                if (this._timer.timeLeft <= 0) {
                    this.timeLeft = this._timer.timeLeft;
                    global.clearInterval(timerID);
                }
            }, 1000);
        });
        SocketSupport.getInstance().socket?.on("match:end", () => {
            this._timer.stop();
            this.timeLeft = this._timer.timeLeft;
            this.matchState = MatchMode.ENDED;
            this.removeMatchlisteners();
            logger.info("⏹ Remote Timer Ended");
        });
        SocketSupport.getInstance().socket?.on("match:abort", () => {
            this._timer.abort();
            this.timeLeft = this._timer.timeLeft;
            this.matchState = MatchMode.ABORTED;
            this.removeMatchlisteners();
            logger.info("🛑 Match Aborted");
        });
    }

    private removeMatchlisteners() {
        this._timer.removeAllListeners("timer:auto");
        this._timer.removeAllListeners("timer:transition");
        this._timer.removeAllListeners("timer:tele");
        this._timer.removeAllListeners("timer:endgame");
        this._timer.removeAllListeners("timer:end");
    }

    private startDriverStation() {
        this.dsInterval = setInterval(() => {
            DriverstationSupport.getInstance().runDriverStations();
        }, 500);
        logger.info("✔ Driver Station Manager Init Complete, Running Loop");
    }

    private startPLC() {
        this.plcInterval = setInterval(() => {
            PlcSupport.getInstance().runPlc();
        }, 100);
        logger.info("✔ PLC Manager Init Complete, Running Loop");
    }

    private startAPLoop() {
        this.apInterval = setInterval(async () => {
            await AccesspointSupport.getInstance().runAp();
        }, 3000);
        logger.info("✔ Access Point Manager Init Complete, Running Loop");
    }

    private getMatch(prestartData: MatchKey): Promise<Match<any>> {
        return new Promise<Match<any>>((resolve, reject) => {
            getMatch(prestartData)
                .then((match: Match<any>) => {
                    resolve(match);
                })
                .catch((err) => {
                    logger.error("❌ Error getting match: " + err);
                    reject(null);
                });
        });
    }
}

export default EmsFrcFms.getInstance();
