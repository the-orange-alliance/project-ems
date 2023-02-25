import EventEmitter from 'events';

export interface MatchConfiguration {
  delayTime: number;
  autoTime: number;
  transitionTime: number;
  teleTime: number;
  endTime: number;
}

export const FGC_MATCH_CONFIG: MatchConfiguration = {
  transitionTime: 0,
  delayTime: 0,
  autoTime: 0,
  teleTime: 150,
  endTime: 30
};

export const FRC_MATCH_CONFIG: MatchConfiguration = {
  transitionTime: 3,
  delayTime: 0,
  autoTime: 15,
  teleTime: 135,
  endTime: 30
};

export enum MatchMode {
  PRESTART = 0,
  AUTONOMOUS = 1,
  TRANSITION = 7,
  TELEOPERATED = 2,
  ENDGAME = 3,
  ENDED = 4,
  ABORTED = 5,
  RESET = 6
}

export class MatchTimer extends EventEmitter {
  private _matchConfig: MatchConfiguration;

  private _mode: MatchMode;
  private _timerID: any;
  private _timeLeft: number;
  private _modeTimeLeft: number;

  constructor() {
    super();

    this._mode = MatchMode.RESET;
    this._timerID = null;
    this._matchConfig = FRC_MATCH_CONFIG;
    this._timeLeft = getMatchTime(this._matchConfig);
    this._modeTimeLeft = this._matchConfig.delayTime;
  }

  public start() {
    if (!this.inProgress()) {
      if (this.matchConfig.delayTime > 0) {
        this._mode = MatchMode.PRESTART;
        this._modeTimeLeft = this.matchConfig.delayTime;
      } else if (this.matchConfig.autoTime > 0) {
        this._mode = MatchMode.AUTONOMOUS;
        this._modeTimeLeft = this.matchConfig.autoTime;
      } else if (this.matchConfig.transitionTime > 0) {
        this._mode = MatchMode.TRANSITION;
        this._modeTimeLeft = this.matchConfig.transitionTime;
      } else {
        this._mode = MatchMode.TELEOPERATED;
        this._modeTimeLeft = this.matchConfig.teleTime;
      }
      this._timeLeft = getMatchTime(this._matchConfig);
      this.emit('timer:start', this._timeLeft);
      this._timerID = setInterval(() => {
        this.tick();
      }, 1000);
    }
  }

  public stop() {
    if (this.inProgress()) {
      clearInterval(this._timerID);
      this._timerID = null;
      this._mode = MatchMode.ENDED;
      this._timeLeft = 0;
      this.emit('timer:end');
    }
  }

  public abort() {
    if (this.inProgress()) {
      clearInterval(this._timerID);
      this._timerID = null;
      this._mode = MatchMode.ABORTED;
      this._timeLeft = 0;
      this.emit('timer:abort');
    }
  }

  public reset() {
    if (!this.inProgress()) {
      this._mode = MatchMode.RESET;
      this._timerID = null;
      this._timeLeft = getMatchTime(this._matchConfig);
      this._modeTimeLeft = this._matchConfig.delayTime;
    }
  }

  public inProgress() {
    return this._timerID !== null;
  }

  public removeListeners(): void {
    this.removeAllListeners('timer:start');
    this.removeAllListeners('timer:auto');
    this.removeAllListeners('timer:tele');
    this.removeAllListeners('timer:endgame');
    this.removeAllListeners('timer:end');
    this.removeAllListeners('timer:abort');
  }

  private tick() {
    if (this._timeLeft === 0) {
      this.stop();
      return;
    }

    this._modeTimeLeft--;
    this._timeLeft--;

    if (this._modeTimeLeft === 0) {
      switch (this._mode) {
        case MatchMode.PRESTART:
          if (this.matchConfig.autoTime > 0) {
            this._mode = MatchMode.AUTONOMOUS;
            this._modeTimeLeft = this.matchConfig.autoTime;
            this.emit('timer:auto');
          } else {
            this._mode = MatchMode.TELEOPERATED;
            this._modeTimeLeft = this.matchConfig.teleTime;
            this.emit('timer:tele');
          }
          break;
        case MatchMode.AUTONOMOUS:
          if (this.matchConfig.transitionTime > 0) {
            this._mode = MatchMode.TRANSITION;
            this._modeTimeLeft = this.matchConfig.transitionTime;
            this.emit('timer:transition');
          } else if (this.matchConfig.teleTime > 0) {
            this._mode = MatchMode.TELEOPERATED;
            this._modeTimeLeft = this.matchConfig.teleTime;
            this.emit('timer:tele');
          } else {
            this.stop();
          }
          break;
        case MatchMode.TRANSITION:
          if (this.matchConfig.teleTime > 0) {
            this._mode = MatchMode.TELEOPERATED;
            this._modeTimeLeft = this.matchConfig.teleTime;
            this.emit('timer:tele');
          } else {
            this.stop();
          }
      }
    } else {
      if (
        this.matchConfig.endTime > 0 &&
        this._timeLeft === this.matchConfig.endTime
      ) {
        this._mode = MatchMode.ENDGAME;
        this.emit('timer:endgame');
      }
    }
  }

  get matchConfig(): MatchConfiguration {
    return this._matchConfig;
  }

  set matchConfig(value: MatchConfiguration) {
    this._matchConfig = value;
  }

  get timeLeft(): number {
    return this._timeLeft;
  }

  set timeLeft(value: number) {
    this._timeLeft = value;
  }

  get modeTimeLeft(): number {
    return this._modeTimeLeft;
  }

  set modeTimeLeft(value: number) {
    this._modeTimeLeft = value;
  }

  get mode(): MatchMode {
    return this._mode;
  }

  set mode(value: MatchMode) {
    this._mode = value;
  }
}

export function getMatchTime(config: MatchConfiguration): number {
  return (
    config.delayTime + config.autoTime + config.transitionTime + config.teleTime
  );
}
