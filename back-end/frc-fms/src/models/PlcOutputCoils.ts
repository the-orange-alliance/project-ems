export default class PlcOutputCoils {
  public heartbeat: boolean;
  public matchStart: boolean;
  private _stackLightGreen: boolean;
  private _stackLightOrange: boolean;
  private _stackLightRed: boolean;
  private _stackLightBlue: boolean;
  private _stackLightBuzzer: boolean;
  public fieldResetGreen: boolean;
  public gameElement1: boolean;
  public gameElement2: boolean;
  public gameElement3: boolean;
  public gameElement4: boolean;
  public gameElement5: boolean;
  public gameElement6: boolean;
  public gameElement7: boolean;
  public gameElement8: boolean;
  public gameElement9: boolean;
  public gameElement10: boolean;
  public unused18: boolean;
  public unused19: boolean;
  private _redOneConn: boolean;
  private _redTwoConn: boolean;
  private _redThreeConn: boolean;
  private _blueOneConn: boolean;
  private _blueTwoConn: boolean;
  private _blueThreeConn: boolean;
  private _redOneBypass: boolean;
  private _redTwoBypass: boolean;
  private _redThreeBypass: boolean;
  private _blueOneBypass: boolean;
  private _blueTwoBypass: boolean;
  private _blueThreeBypass: boolean;
  public redOneSoftwareEstop: boolean;
  public redTwoSoftwareEstop: boolean;
  public redThreeSoftwareEstop: boolean;
  public blueOneSoftwareEstop: boolean;
  public blueTwoSoftwareEstop: boolean;
  public blueThreeSoftwareEstop: boolean;
  public coilCount: number;

  constructor() {
    this.heartbeat = false;
    this.matchStart = false;
    this._stackLightGreen = false;
    this._stackLightOrange = false;
    this._stackLightRed = false;
    this._stackLightBlue = false;
    this._stackLightBuzzer = false;
    this.fieldResetGreen = false;
    this.gameElement1 = false;
    this.gameElement2 = false;
    this.gameElement3 = false;
    this.gameElement4 = false;
    this.gameElement5 = false;
    this.gameElement6 = false;
    this.gameElement7 = false;
    this.gameElement8 = false;
    this.gameElement9 = false;
    this.gameElement10 = false;
    this.unused18 = false;
    this.unused19 = false;
    this._redOneConn = false;
    this._redTwoConn = false;
    this._redThreeConn = false;
    this._blueOneConn = false;
    this._blueTwoConn = false;
    this._blueThreeConn = false;
    this._redOneBypass = false;
    this._redTwoBypass = false;
    this._redThreeBypass = false;
    this._blueOneBypass = false;
    this._blueTwoBypass = false;
    this._blueThreeBypass = false;
    this.redOneSoftwareEstop = false;
    this.redTwoSoftwareEstop = false;
    this.redThreeSoftwareEstop = false;
    this.blueOneSoftwareEstop = false;
    this.blueTwoSoftwareEstop = false;
    this.blueThreeSoftwareEstop = false;
    this.coilCount = 38;
  }

  public getCoilArray(): boolean[] {
    const allCoils: boolean[] = [];
    allCoils.push(this.heartbeat); // "watchdog"
    allCoils.push(this.matchStart);
    allCoils.push(this._stackLightGreen);
    allCoils.push(this._stackLightOrange);
    allCoils.push(this._stackLightRed);
    allCoils.push(this._stackLightBlue);
    allCoils.push(this._stackLightBuzzer);
    allCoils.push(this.fieldResetGreen);
    allCoils.push(this.gameElement1);
    allCoils.push(this.gameElement2);
    allCoils.push(this.gameElement3);
    allCoils.push(this.gameElement4);
    allCoils.push(this.gameElement5);
    allCoils.push(this.gameElement6);
    allCoils.push(this.gameElement7);
    allCoils.push(this.gameElement8);
    allCoils.push(this.gameElement9);
    allCoils.push(this.gameElement10);
    allCoils.push(this.unused18);
    allCoils.push(this.unused19);
    allCoils.push(this._redOneConn);
    allCoils.push(this._redTwoConn);
    allCoils.push(this._redThreeConn);
    allCoils.push(this._blueOneConn);
    allCoils.push(this._blueTwoConn);
    allCoils.push(this._blueThreeConn);
    allCoils.push(this._redOneBypass);
    allCoils.push(this._redTwoBypass);
    allCoils.push(this._redThreeBypass);
    allCoils.push(this._blueOneBypass);
    allCoils.push(this._blueTwoBypass);
    allCoils.push(this._blueThreeBypass);
    allCoils.push(this.redOneSoftwareEstop);
    allCoils.push(this.redTwoSoftwareEstop);
    allCoils.push(this.redThreeSoftwareEstop);
    allCoils.push(this.blueOneSoftwareEstop);
    allCoils.push(this.blueTwoSoftwareEstop);
    allCoils.push(this.blueThreeSoftwareEstop);
    return allCoils;
  }

  public fromCoilsArray(coils: boolean[]): PlcOutputCoils {
   this.heartbeat = coils[0];
   this.matchStart = coils[1];
   this._stackLightGreen = coils[2];
   this._stackLightOrange = coils[3];
   this._stackLightRed = coils[4];
   this._stackLightBlue = coils[5];
   this._stackLightBuzzer = coils[6];
   this.fieldResetGreen = coils[7];
   this.gameElement1 = coils[8];
   this.gameElement2 = coils[9];
   this.gameElement3 = coils[10];
   this.gameElement4 = coils[11];
   this.gameElement5 = coils[12];
   this.gameElement6 = coils[13];
   this.gameElement7 = coils[14];
   this.gameElement8 = coils[15];
   this.gameElement9 = coils[16];
   this.gameElement10 = coils[17];
   this.unused18 = coils[18];
   this.unused19 = coils[19];
   this._redOneConn = coils[20];
   this._redTwoConn = coils[21];
   this._redThreeConn = coils[22];
   this._blueOneConn = coils[23];
   this._blueTwoConn = coils[24];
   this._blueThreeConn = coils[25];
   this._redOneBypass = coils[26];
   this._redTwoBypass = coils[27];
   this._redThreeBypass = coils[28];
   this._blueOneBypass = coils[29];
   this._blueTwoBypass = coils[30];
   this._blueThreeBypass = coils[31];
   this.redOneSoftwareEstop = coils[32];
   this.redTwoSoftwareEstop = coils[33];
   this.redThreeSoftwareEstop = coils[34];
   this.blueOneSoftwareEstop = coils[35];
   this.blueTwoSoftwareEstop = coils[36];
   this.blueThreeSoftwareEstop = coils[37];
   return this;
  }

  public equals(compare: this): boolean {
    return (this.matchStart === compare.matchStart &&
      this.stackLightGreen === compare.stackLightGreen &&
      this.stackLightOrange === compare.stackLightOrange &&
      this.stackLightRed === compare.stackLightRed &&
      this.stackLightBlue === compare.stackLightBlue &&
      this.stackLightBuzzer === compare.stackLightBuzzer &&
      this.fieldResetGreen === compare.fieldResetGreen &&
      this.gameElement1 === compare.gameElement1 &&
      this.gameElement2 === compare.gameElement2 &&
      this.gameElement3 === compare.gameElement3 &&
      this.gameElement4 === compare.gameElement4 &&
      this.gameElement5 === compare.gameElement5 &&
      this.gameElement6 === compare.gameElement6 &&
      this.gameElement7 === compare.gameElement7 &&
      this.gameElement8 === compare.gameElement8 &&
      this.gameElement9 === compare.gameElement9 &&
      this.gameElement10 === compare.gameElement10 &&
      this.unused18 === compare.unused18 &&
      this.unused19 === compare.unused19 &&
      this.redOneConn === compare.redOneConn &&
      this.redTwoConn === compare.redTwoConn &&
      this.redThreeConn === compare.redThreeConn &&
      this.blueOneConn === compare.blueOneConn &&
      this.blueTwoConn === compare.blueTwoConn &&
      this.blueThreeConn === compare.blueThreeConn &&
      this.redOneBypass === compare.redOneBypass &&
      this.redTwoBypass === compare.redTwoBypass &&
      this.redThreeBypass === compare.redThreeBypass &&
      this.blueOneBypass === compare.blueOneBypass &&
      this.blueTwoBypass === compare.blueTwoBypass &&
      this.blueThreeBypass === compare.blueThreeBypass &&
      this.redOneSoftwareEstop === compare.redOneSoftwareEstop &&
      this.redTwoSoftwareEstop === compare.redTwoSoftwareEstop &&
      this.redThreeSoftwareEstop === compare.redThreeSoftwareEstop &&
      this.blueOneSoftwareEstop === compare.blueOneSoftwareEstop &&
      this.blueTwoSoftwareEstop === compare.blueTwoSoftwareEstop &&
      this.blueThreeSoftwareEstop === compare.blueThreeSoftwareEstop);
  }

  get stackLightGreen(): StackLight {
    return this._stackLightGreen ? StackLight.On : StackLight.Off
  }

  get stackLightOrange(): StackLight {
    return this._stackLightOrange ? StackLight.On : StackLight.Off
  }

  get stackLightRed(): StackLight {
    return this._stackLightRed ? StackLight.On : StackLight.Off
  }

  get stackLightBlue(): StackLight {
    return this._stackLightBlue ? StackLight.On : StackLight.Off
  }

  get stackLightBuzzer(): StackLight {
    return this._stackLightBuzzer ? StackLight.On : StackLight.Off
  }  
  
  get redOneConn(): RobotStatus {
    return this._redOneConn ? RobotStatus.Connected : RobotStatus.Disconnected
  }
  
  get redTwoConn(): RobotStatus {
    return this._redTwoConn ? RobotStatus.Connected : RobotStatus.Disconnected
  }
  
  get redThreeConn(): RobotStatus {
    return this._redThreeConn ? RobotStatus.Connected : RobotStatus.Disconnected
  }
  
  get blueOneConn(): RobotStatus {
    return this._blueOneConn ? RobotStatus.Connected : RobotStatus.Disconnected
  }
  
  get blueTwoConn(): RobotStatus {
    return this._blueTwoConn ? RobotStatus.Connected : RobotStatus.Disconnected
  }
  
  get blueThreeConn(): RobotStatus {
    return this._blueThreeConn ? RobotStatus.Connected : RobotStatus.Disconnected
  }

  get redOneBypass(): BypassStatus {
    return this._redOneBypass ? BypassStatus.Bypassed : BypassStatus.Enabled;
  }
  
  get redTwoBypass(): BypassStatus {
    return this._redTwoBypass ? BypassStatus.Bypassed : BypassStatus.Enabled
  }
  
  get redThreeBypass(): BypassStatus {
    return this._redThreeBypass ? BypassStatus.Bypassed : BypassStatus.Enabled
  }
  
  get blueOneBypass(): BypassStatus {
    return this._blueOneBypass ? BypassStatus.Bypassed : BypassStatus.Enabled
  }
  
  get blueTwoBypass(): BypassStatus {
    return this._blueTwoBypass ? BypassStatus.Bypassed : BypassStatus.Enabled
  }
  
  get blueThreeBypass(): BypassStatus {
    return this._blueThreeBypass ? BypassStatus.Bypassed : BypassStatus.Enabled
  }

  set stackLightGreen(status: StackLight) {
    this._stackLightGreen = !!status;
  }

  set stackLightOrange(status: StackLight) {
    this._stackLightOrange = !!status;
  }

  set stackLightRed(status: StackLight) {
    this._stackLightRed = !!status;
  }

  set stackLightBlue(status: StackLight) {
    this._stackLightBlue = !!status;
  }

  set stackLightBuzzer(status: StackLight) {
    this._stackLightBuzzer = !!status;
  }

  set redOneConn(status: RobotStatus) {
    this._redOneConn = !!status;
  }

  set redTwoConn(status: RobotStatus) {
    this._redTwoConn = !!status;
  }

  set redThreeConn(status: RobotStatus) {
    this._redThreeConn = !!status;
  }

  set blueOneConn(status: RobotStatus) {
    this._blueOneConn = !!status;
  }

  set blueTwoConn(status: RobotStatus) {
    this._blueTwoConn = !!status;
  }

  set blueThreeConn(status: RobotStatus) {
    this._blueThreeConn = !!status;
  }

  set redOneBypass(status: BypassStatus) {
    this._redOneBypass = !!status;
  }

  set redTwoBypass(status: BypassStatus) {
    this._redTwoBypass = !!status;
  }

  set redThreeBypass(status: BypassStatus) {
    this._redThreeBypass = !!status;
  }

  set blueOneBypass(status: BypassStatus) {
    this._blueOneBypass = !!status;
  }

  set blueTwoBypass(status: BypassStatus) {
    this._blueTwoBypass = !!status;
  }

  set blueThreeBypass(status: BypassStatus) {
    this._blueThreeBypass = !!status;
  }
}

export enum StackLight {
  Off = 0,
  On = 1
}

export enum RobotStatus {
  Disconnected = 0,
  Connected = 1
}

export enum BypassStatus {
  Enabled = 0,
  Bypassed = 1
}

export enum EStop {
  Red1,
  Red2,
  Red3,
  Blue1,
  Blue2,
  Blue3,
  Field
}
