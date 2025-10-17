import {
  AllianceMember,
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey,
  Match as MatchObj,
  MatchKey,
  MatchSocketEvent,
  MatchState,
  MatchTimer,
  ItemUpdate,
  CardStatusUpdate,
  NumberAdjustment,
  FRC_MATCH_CONFIG,
  FGC_MATCH_CONFIG,
  BonusPeriodConfig,
  BonusPeriodSettings,
  Displays,
  MatchMode,
  EcoEquilibriumFCS,
} from "@toa-lib/models";
import { EventEmitter } from "node:events";
import { Server, Socket } from "socket.io";
import logger from "../util/Logger.js";
import Room from "./Room.js";

export default class Match extends Room {
  private key: MatchKey | null;
  private match: MatchObj<any> | null;
  private timer: MatchTimer;
  private state: MatchState;
  private displayID: number;
  private bonuses: Map<
    BonusPeriodConfig,
    { matchAtStartState: MatchObj<any>; timeout: any }
  > = new Map();
  public readonly localEmitter: EventEmitter;

  public constructor(server: Server) {
    super(server, "match");

    this.key = null;
    this.match = null;
    this.timer = new MatchTimer();
    this.state = MatchState.MATCH_NOT_SELECTED;
    this.displayID = 0;
    this.localEmitter = new EventEmitter();

    // Needed for FCS room to send events here
    this.localEmitter.on(
      MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM,
      this.onMatchUpdateDetailsItem,
    );
    this.localEmitter.on(
      MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER,
      this.onMatchAdjustNumber,
    );
  }

  public initializeEvents(socket: Socket): void {
    // Emit the last known display
    socket.emit(MatchSocketEvent.DISPLAY, this.displayID);

    // These are in case of mid-match disconnect/reconnects
    if (
      this.state >= MatchState.PRESTART_COMPLETE &&
      this.state < MatchState.RESULTS_POSTED &&
      this.key
    ) {
      // Send prestart information
      socket.emit(MatchSocketEvent.PRESTART, this.key);
      socket.emit(MatchSocketEvent.UPDATE, this.match);
    }

    // If timer is in progress, send match update and current timer mode
    if (this.timer.inProgress() && this.match) {
      switch (this.timer.mode) {
        case MatchMode.AUTONOMOUS:
        case MatchMode.TRANSITION:
          socket.emit(MatchSocketEvent.AUTONOMOUS);
          break;
        case MatchMode.TELEOPERATED:
          socket.emit(MatchSocketEvent.TELEOPERATED);
          break;
        case MatchMode.ENDGAME:
          socket.emit(MatchSocketEvent.ENDGAME);
          break;
      }
    }

    // If match complete, send update and send match end event
    if (this.state === MatchState.MATCH_COMPLETE) {
      socket.emit(MatchSocketEvent.END);
    }

    // if results committed, send update, end, and commit event
    if (this.state === MatchState.RESULTS_COMMITTED) {
      socket.emit(MatchSocketEvent.END);
      socket.emit(MatchSocketEvent.COMMIT, this.key);
    }

    // Event listener to remove soon
    socket.on(MatchSocketEvent.ALLIANCE, (newAlliance: AllianceMember[]) => {
      this.emitToAll(MatchSocketEvent.ALLIANCE, newAlliance);
    });

    // Event listeners for matches
    socket.on(MatchSocketEvent.PRESTART, (key: MatchKey) => {
      this.key = key;
      this.emitToAll(MatchSocketEvent.PRESTART, key);
      this.emitToAll(MatchSocketEvent.DISPLAY, 1);
      this.displayID = 1;
      this.state = MatchState.PRESTART_COMPLETE;
      logger.info(`prestarting ${key.eventKey}-${key.tournamentKey}-${key.id}`);
    });
    socket.on(MatchSocketEvent.ABORT, () => {
      this.key = null;
      this.timer.abort();
      this.state = MatchState.MATCH_ABORTED;
    });
    socket.on(MatchSocketEvent.START, () => {
      if (this.timer.inProgress()) return;
      this.timer.once("timer:start", () => {
        this.emitToAll(MatchSocketEvent.START, "start");
        this.state = MatchState.MATCH_IN_PROGRESS;
        logger.info("match in progress");
      });
      this.timer.once("timer:auto", () => {
        this.emitToAll(MatchSocketEvent.AUTONOMOUS);
        logger.info("match auto");
      });
      this.timer.once("timer:tele", () => {
        this.emitToAll(MatchSocketEvent.TELEOPERATED);
        logger.info("match tele");
      });
      this.timer.once("timer:endgame", () => {
        this.emitToAll(MatchSocketEvent.ENDGAME);
        logger.info("match endgame");
      });
      this.timer.once("timer:end", () => {
        this.emitToAll(MatchSocketEvent.END);
        this.timer.removeListeners();
        this.state = MatchState.MATCH_COMPLETE;
        logger.info("match completed");
      });
      this.timer.once("timer:abort", () => {
        this.emitToAll(MatchSocketEvent.ABORT);
        this.timer.removeListeners();
        this.state = MatchState.PRESTART_READY;
        logger.info("match aborted");
      });
      this.displayID = 2;

      // Get season key frome event key
      const seasonKey = getSeasonKeyFromEventKey(
        (this.key ?? { eventKey: "" }).eventKey,
      );

      // Set match config based on season key
      const matchConfig = seasonKey.includes("frc")
        ? FRC_MATCH_CONFIG
        : FGC_MATCH_CONFIG;
      this.timer.matchConfig = matchConfig;

      // Start timer
      this.timer.start();
      logger.info(
        `match started: ${this.key?.eventKey}-${this.key?.tournamentKey}-${this.key?.id}`,
      );
    });
    socket.on(MatchSocketEvent.DISPLAY, (id: number) => {
      this.displayID = id;
      if (id === Displays.MATCH_RESULTS) {
        this.state = MatchState.RESULTS_POSTED;
      }
      this.emitToAll(MatchSocketEvent.DISPLAY, id);
    });
    socket.on(MatchSocketEvent.UPDATE, (match: MatchObj<any>) => {
      this.handlePartiallyUpdatedMatch(match);
    });
    socket.on(MatchSocketEvent.MATCH_UPDATE_ITEM, (itemUpdate: ItemUpdate) => {
      const match: any = this.match;
      if (match) {
        match[itemUpdate.key] = itemUpdate.value;
        this.handlePartiallyUpdatedMatch(match);
      }
    });
    socket.on(
      MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM,
      this.onMatchUpdateDetailsItem,
    );
    socket.on(
      MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER,
      this.onMatchAdjustNumber,
    );
    socket.on(
      MatchSocketEvent.UPDATE_CARD_STATUS,
      (teamCard: CardStatusUpdate) => {
        const participant = this.match?.participants?.find(
          (participant) => participant.teamKey == teamCard.teamKey,
        );
        if (participant) {
          participant.cardStatus = teamCard.cardStatus;
          this.handlePartiallyUpdatedMatch(this.match!);
        }
      },
    );
    socket.on(MatchSocketEvent.COMMIT, (key: MatchKey) => {
      this.emitToAll(MatchSocketEvent.COMMIT, key);
      this.match = null;
      this.state = MatchState.RESULTS_COMMITTED;
      logger.info(
        `committing scores for ${key.eventKey}-${key.tournamentKey}-${key.id}`,
      );
    });
    socket.on(MatchSocketEvent.TIMER, () => {
      socket.emit(MatchSocketEvent.TIMER, {
        modeTimeLeft: this.timer.modeTimeLeft,
        mode: this.timer.mode,
        inProgress: this.timer.inProgress(),
        timeLeft: this.timer.timeLeft,
      });
    });

    socket.on(MatchSocketEvent.BONUS_START, (bonusType: BonusPeriodConfig) => {
      // If a bonus period exists for this match, clear it
      if (this.bonuses.has(bonusType)) {
        clearTimeout(this.bonuses.get(bonusType)?.timeout);
      }

      // Set new timeout for bonus period
      const bonusTimeout = setTimeout(() => {
        this.emitToAll(MatchSocketEvent.BONUS_END, bonusType);
      }, BonusPeriodSettings[bonusType].duration * 1000);
      this.bonuses.set(bonusType, {
        timeout: bonusTimeout,
        matchAtStartState: {
          ...this.match!,
          details: { ...this.match!.details! },
        },
      });

      this.broadcast().emit(MatchSocketEvent.BONUS_START, bonusType);
    });

    // Season-Specific
    socket.on(
      EcoEquilibriumFCS.SocketEvents.ForceEcosystemUpdate,
      (data: EcoEquilibriumFCS.EcosystemUpdate): void => {
        logger.info("fcs:forceEcosystemUpdate", data);
        this.server
          .to("fcs")
          .emit(EcoEquilibriumFCS.SocketEvents.ForceEcosystemUpdate, data);
      },
    );
  }

  onMatchUpdateDetailsItem = (itemUpdate: ItemUpdate) => {
    const matchDetails = this.match?.details;
    if (matchDetails) {
      const keys = itemUpdate.key.split(".");
      keys.slice(0, -1).reduce((obj, key) => obj[key], matchDetails)[
        keys[keys.length - 1]
      ] = itemUpdate.value;
      this.handlePartiallyUpdatedMatch(this.match!);
    }
  };

  onMatchAdjustNumber = (numberAdjustment: NumberAdjustment) => {
    const matchDetails = this.match?.details;
    if (matchDetails) {
      try {
        matchDetails[numberAdjustment.key] += numberAdjustment.adjustment;
        this.handlePartiallyUpdatedMatch(this.match!);
      } catch (e) {
        // Don't take down the server if a client tries to adjust a non-numeric value
        logger.error(
          `Failed to adjust match details field ${numberAdjustment.key} (${
            matchDetails[numberAdjustment.key]
          })`,
        );
      }
    } else {
      logger.error(
        `Failed to adjust match details field ${numberAdjustment.key} - match details not found`,
      );
    }
  };

  private handlePartiallyUpdatedMatch(
    partiallyUpdatedMatch: MatchObj<any>,
  ): void {
    this.match = { ...partiallyUpdatedMatch };
    const seasonKey = getSeasonKeyFromEventKey(partiallyUpdatedMatch.eventKey);
    const functions = getFunctionsBySeasonKey(seasonKey);
    if (
      !partiallyUpdatedMatch.details ||
      !functions ||
      this.state >= MatchState.RESULTS_COMMITTED
    )
      return;
    if (functions.calculateRankingPoints) {
      this.match.details = functions.calculateRankingPoints(this.match.details);
    }
    const [redScore, blueScore] = functions.calculateScore(this.match);
    this.match.redScore = redScore;
    this.match.blueScore = blueScore;

    // Emit the updated match to all clients
    this.emitToAll(MatchSocketEvent.UPDATE, this.match);

    // Handle bonus shenanigans (Must happen AFTER the match data is updates, so that clients can see the updated match data when the bonus is ended)
    for (const [bonusType, bonus] of this.bonuses) {
      if (
        BonusPeriodSettings[bonusType].autoEnd(
          bonus.matchAtStartState,
          this.match,
        )
      ) {
        clearTimeout(bonus.timeout);
        this.bonuses.delete(bonusType);
        this.emitToAll(MatchSocketEvent.BONUS_END, bonusType);
      }
    }
  }

  private emitToAll(eventName: string, ...args: any[]): void {
    this.localEmitter.emit(eventName, ...args);
    this.broadcast().emit(eventName, ...args);
  }
}
