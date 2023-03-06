import log from "../logger.js";
import { PlcInputs } from "../models/PlcInputs.js";
import PlcOutputCoils, { EStop, RobotStatus, StackLight } from "../models/PlcOutputCoils.js";
import { EmsFrcFms } from "../server.js";
import { MatchMode } from "@toa-lib/models";
import ModbusRTU from "modbus-serial";
import { Socket } from "socket.io-client";
import { sleep } from "../helpers/generic.js";

const logger = log("plc")

// Modbus Crash Course
// Registers: ?Counters?
// Inputs: Discrete Inputs (E-Stops)
// Coils: Outputs to PLC (Stack lights, LED Strips, Etc)

export class PlcSupport {
  private static _instance: PlcSupport;

  private modBusPort = 502;

  private client = new ModbusRTU.default();
  private plc = new PlcStatus();

  private firstConnection = true;
  private firstRead = true;
  private lastSentHeartbeat = 0;

  private noSettingsInterval: any = null
  private noSettingsState: number = 0;

  private processLock = false;

  private socket: Socket | null = null;

  public static getInstance(): PlcSupport {
    if (typeof PlcSupport._instance === "undefined") {
      PlcSupport._instance = new PlcSupport();
    }
    return PlcSupport._instance;
  }

  public setSocket(socket: Socket | null) {
    this.socket = socket;
  }

  public async initPlc(address: string) {
    this.plc.address = address;
    await this.client
      .connectTCP(this.plc.address, { port: this.modBusPort })
      .then(() => {
        logger.info(`✔ Connected to PLC at ${this.plc.address}:${this.modBusPort}`);
        this.client.setID(1);
        this.sendCoils();
        this.firstRead = true;
        this.firstConnection = false;
      })
      .catch(async (err: any) => {
        logger.error(`❌ Failed to connect to PLC (${this.plc.address}:${this.modBusPort}) with error: ${err}`);
        this.firstConnection = true;
        this.firstRead = true;
        await sleep(5000);
      });
  }

  public getEstop(station: EStop) {
    switch (station) {
      case EStop.Red1:
        return this.plc.inputs.redEstop1;
      case EStop.Red2:
        return this.plc.inputs.redEstop2;
      case EStop.Red3:
        return this.plc.inputs.redEstop3;
      case EStop.Blue1:
        return this.plc.inputs.blueEstop1;
      case EStop.Blue2:
        return this.plc.inputs.blueEstop2;
      case EStop.Blue3:
        return this.plc.inputs.blueEstop3;
      case EStop.Field:
        return this.plc.inputs.fieldEstop;
    }
  }

  public async runPlc() {
    // Process lock
    if (this.processLock) return;
    this.processLock = true;

    if (!this.client.isOpen) {
      // Print this only if this isn't the first connection
      if (!this.firstConnection) {
        logger.error(`❌ Lost connection to PLC (${this.plc.address}:${this.modBusPort}), retrying`);
        this.firstConnection = true;
      }
      await this.initPlc(this.plc.address);
    } else {
      // Read Registers
      this.plc.registers = await this.client.readHoldingRegisters(0, 10)
        .then(d => d.data)
        .catch(e => {
          logger.error(`❌ Error reading registers from PLC: ${e}`);
          return [];
        });

      const mState = EmsFrcFms.getInstance().matchState;
      this.plc.coils.matchStart =
        mState <= MatchMode.AUTONOMOUS &&
        mState <= MatchMode.ENDED &&
        !this.plc.coils.matchStart;

      // Read Inputs
      const inputs = await this.client
        .readDiscreteInputs(0, this.plc.inputs.inputCount)
        .then(d => d.data)
        .catch(e => {
          logger.error(`❌ Error reading inputs from PLC: ${e}`);
          return this.plc.inputs.toArray();
        });

      // Update Inputs
      this.plc.inputs.fromArray(inputs);

      // If there was a change (and not first read)
      if (!this.plc.inputs.equals(this.plc.oldInputs) && !this.firstRead) {
        // We have a new input, lets notify
        this.socket?.emit("frc-fms:plc-update", this.plc.inputs.toJSON());

        // Field E-STOP
        if (this.plc.inputs.fieldEstop) {
          logger.info("🛑 Field E-STOP Pressed! This can't be good!");
          this.socket?.emit("match:abort");
        } else if (!this.plc.inputs.fieldEstop && this.plc.oldInputs.fieldEstop) {
          logger.info("🟢 Field E-STOP Released!");
        }

        // Update "Old" Inputs
        this.plc.oldInputs = new PlcInputs().fromArray(inputs);
      }

      // Set not first read anymore
      this.firstRead = false;

      // Send coils if they've changed
      if (!this.plc.oldCoils.equals(this.plc.coils)) {
        // Send Coils
        this.plc.coils.heartbeat = true;
        await this.sendCoils();
      } else if (Date.now() - this.lastSentHeartbeat > 500) {
        // If there is no update to send, send heartbeat every 500ms to prevent the plc from going into 'warning' mode
        await this.sendHeartbeat();
      }
    }

    // Unlock process
    this.processLock = false;
  }

  // Start a flash pattern on field stack indicating we have no configured settings yet
  public startNoSettingsInterval() {
    // Reset State
    this.noSettingsState = 0;
    this.noSettingsInterval = setInterval(() => {
      switch (this.noSettingsState) {
        case 0:
          // Green
          this.setFieldStack(StackLight.Off, StackLight.Off, StackLight.Off, StackLight.On, StackLight.Off);
          this.noSettingsState++;
          break;
        case 1:
          // Green + Amber
          this.setFieldStack(StackLight.Off, StackLight.Off, StackLight.On, StackLight.On, StackLight.Off);
          this.noSettingsState++;
          break;
        case 2:
          // Amber
          this.setFieldStack(StackLight.Off, StackLight.Off, StackLight.On, StackLight.Off, StackLight.Off);
          this.noSettingsState++;
          break;
        case 3:
          // Off
          this.setFieldStack(StackLight.Off, StackLight.Off, StackLight.Off, StackLight.Off, StackLight.Off);
          this.noSettingsState = 0;
          break;
      }
    }, 500);
  }

  public stopNoSettingsInterval() {
    clearInterval(this.noSettingsInterval);
  }

  public async flashUpdatedSettings() {
    // Reset Stack
    this.setFieldStack(StackLight.Off, StackLight.Off, StackLight.Off, StackLight.Off, StackLight.Off);
    // Start Flash
    for (let i = 0; i < 4; i++) {
      this.setFieldStack(StackLight.Off, StackLight.Off, StackLight.On, StackLight.On, StackLight.On);
      await this.sendCoils();
      await sleep(150);
      this.setFieldStack(StackLight.Off, StackLight.Off, StackLight.Off, StackLight.Off, StackLight.Off);
      await this.sendCoils();
      await sleep(150);
    }
  }

  private sendHeartbeat(): Promise<void> {
    return this.client
      .writeCoil(0, true)
      .then(() => {
        this.plc.oldCoils = new PlcOutputCoils().fromCoilsArray(
          this.plc.coils.getCoilArray()
        );
        this.lastSentHeartbeat = Date.now();
      })
      .catch((err: any) => {
        logger.info(`❌ Error sending heartbeat to PLC: ${err}`);
      });
  }

  private sendCoils(): Promise<void> {
    return this.client
      .writeCoils(0, this.plc.coils.getCoilArray())
      .then(() => {
        this.plc.oldCoils = new PlcOutputCoils().fromCoilsArray(
          this.plc.coils.getCoilArray()
        );
        this.lastSentHeartbeat = Date.now();
      })
      .catch((err: any) => {
        logger.info("Error writing coils: " + err);
      });
  }

  public setStationStack(station: number, status: RobotStatus) {
    switch (station) {
      case 0:
        this.plc.coils.redOneConn = status;
        break;
      case 1:
        this.plc.coils.redTwoConn = status;
        break;
      case 2:
        this.plc.coils.redThreeConn = status;
        break;
      case 3:
        this.plc.coils.blueOneConn = status;
        break;
      case 4:
        this.plc.coils.blueTwoConn = status;
        break;
      case 5:
        this.plc.coils.blueThreeConn = status;
        break;
    }

    this.refreshFieldStack();
  }

  // We go green of all robots are either connected or bypassed
  private refreshFieldStack() {
    // Get Field Status
    const status = EmsFrcFms.getInstance().matchState;

    if (status >= MatchMode.PRESTART && status <= MatchMode.ENDED) {
      const redGood =
        (this.plc.coils.redOneConn || this.plc.coils.redOneBypass) &&
        (this.plc.coils.redTwoConn || this.plc.coils.redTwoBypass) &&
        (this.plc.coils.redThreeConn || this.plc.coils.redThreeBypass)

      const blueGood =
        (this.plc.coils.blueOneConn || this.plc.coils.blueOneBypass) &&
        (this.plc.coils.blueTwoConn || this.plc.coils.blueTwoBypass) &&
        (this.plc.coils.blueThreeConn || this.plc.coils.blueThreeBypass)


      // These are calculated inside of the PLC
      // Red Field Stack
      // this.plc.coils.stackLightRed = redGood ? StackLight.Off : StackLight.On;

      // Blue Field Stack
      // this.plc.coils.stackLightBlue = blueGood ? StackLight.Off : StackLight.On;

      // Calculate Green
      if (redGood && blueGood) {
        // Show Green
        this.plc.coils.stackLightGreen = StackLight.On;

        // If we're in prestart, sound the buzzer
        if (status === MatchMode.PRESTART) {
          this.soundBuzzer();
        }
      } else {
        // Post-Match or Aborted
        this.plc.coils.stackLightGreen = StackLight.Off;
        this.plc.coils.stackLightBlue = StackLight.On;
        this.plc.coils.stackLightRed = StackLight.On;
      }
    }
  }

  public setAllStationStacks(status: RobotStatus) {
    this.plc.coils.redOneConn = status;
    this.plc.coils.redTwoConn = status;
    this.plc.coils.redThreeConn = status;
    this.plc.coils.blueOneConn = status;
    this.plc.coils.blueTwoConn = status;
    this.plc.coils.blueThreeConn = status;
  }

  public soundBuzzer() {
    // Sound buzzer for 1.5 seconds
    this.plc.coils.stackLightBuzzer = StackLight.On;
    setTimeout(() => {
      this.plc.coils.stackLightBuzzer = StackLight.Off;
    }, 1500);
  }

  public setFieldStack(
    blue: StackLight,
    red: StackLight,
    orange: StackLight,
    green: StackLight,
    buzzer: StackLight
  ) {
    this.plc.coils.stackLightBlue = blue;
    this.plc.coils.stackLightRed = red;
    this.plc.coils.stackLightOrange = orange;
    this.plc.coils.stackLightGreen = green;
    this.plc.coils.stackLightBuzzer = buzzer;
  }

  // Actions to perform on prestart
  public onPrestart() {
    this.setAllStationStacks(RobotStatus.Disconnected);
    this.setFieldStack(
      StackLight.Off,
      StackLight.Off,
      StackLight.Off,
      StackLight.Off,
      StackLight.Off
    );
  }
}

class PlcStatus {
  public isHealthy: boolean;
  public address: string;
  public inputs: PlcInputs;
  public registers: number[];
  public coils: PlcOutputCoils;
  public oldInputs: PlcInputs;
  public oldRegisters: [];
  public oldCoils: PlcOutputCoils;
  public cycleCounter: number;
  constructor() {
    this.isHealthy = false;
    this.address = "10.0.100.10";
    this.inputs = new PlcInputs();
    this.registers = [];
    this.coils = new PlcOutputCoils();
    this.oldInputs = new PlcInputs();
    this.oldRegisters = [];
    this.oldCoils = new PlcOutputCoils();
    this.cycleCounter = -1;
  }
}

export default PlcSupport.getInstance();
