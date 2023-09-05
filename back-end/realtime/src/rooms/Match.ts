import {
  AllianceMember,
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey,
  Match as MatchObj,
  MatchKey,
  MatchState,
  MatchTimer,
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
  public readonly localEmitter: EventEmitter;

  public constructor(server: Server) {
    super(server, "match");

    this.key = null;
    this.match = null;
    this.timer = new MatchTimer();
    this.state = MatchState.MATCH_NOT_SELECTED;
    this.displayID = 0;
    this.localEmitter = new EventEmitter();
  }

  public initializeEvents(socket: Socket): void {
    // Emit the last known display
    socket.emit("match:display", this.displayID);

    // These are in case of mid-match disconnect/reconnects
    if (
      this.state >= MatchState.PRESTART_COMPLETE &&
      this.state !== MatchState.MATCH_COMPLETE &&
      this.key &&
      !this.timer.inProgress()
    ) {
      // Send prestart information
      socket.emit("match:prestart", this.key);
      socket.emit("match:display", this.displayID);
    }

    if (
      (this.timer.inProgress() && this.match) ||
      this.state === MatchState.MATCH_COMPLETE
    ) {
      socket.emit("match:update", this.match);
    } else if (this.timer.inProgress() && !this.match) {
      logger.warn("no match data for this match - sending prestart");
      socket.emit("match:prestart", this.key);
    }

    if (this.state === MatchState.RESULTS_COMMITTED) {
      socket.emit("match:commit", this.key);
    }

    // Event listener to remove soon
    socket.on("match:alliance", (newAlliance: AllianceMember[]) => {
      this.emitToAll("match:alliance", newAlliance);
    });

    // Event listeners for matches
    socket.on("match:prestart", (key: MatchKey) => {
      this.key = key;
      this.emitToAll("match:prestart", key);
      this.emitToAll("match:display", 1);
      this.displayID = 1;
      this.state = MatchState.PRESTART_COMPLETE;
      logger.info(`prestarting ${key.eventKey}-${key.tournamentKey}-${key.id}`);
    });
    socket.on("match:abort", () => {
      this.key = null;
      this.timer.abort();
      this.state = MatchState.MATCH_ABORTED;
    });
    socket.on("match:start", () => {
      if (this.timer.inProgress()) return;
      this.timer.once("timer:start", () => {
        this.emitToAll("match:start", "start");
        this.state = MatchState.MATCH_IN_PROGRESS;
        logger.info("match in progress");
      });
      this.timer.once("timer:auto", () => {
        this.emitToAll("match:auto");
        logger.info("match auto");
      });
      this.timer.once("timer:tele", () => {
        this.emitToAll("match:tele");
        logger.info("match tele");
      });
      this.timer.once("timer:endgame", () => {
        this.emitToAll("match:endgame");
        logger.info("match endgame");
      });
      this.timer.once("timer:end", () => {
        this.emitToAll("match:end");
        this.timer.removeListeners();
        this.state = MatchState.MATCH_COMPLETE;
        logger.info("match completed");
      });
      this.timer.once("timer:abort", () => {
        this.emitToAll("match:abort");
        this.timer.removeListeners();
        this.state = MatchState.PRESTART_READY;
        logger.info("match aborted");
      });
      this.displayID = 2;
      this.timer.start();
      logger.info(
        `match started: ${this.key?.eventKey}-${this.key?.tournamentKey}-${this.key?.id}`
      );
    });
    socket.on("match:display", (id: number) => {
      this.displayID = id;
      this.emitToAll("match:display", id);
    });
    socket.on("match:update", (match: MatchObj<any>) => {
      this.match = { ...match };
      const seasonKey = getSeasonKeyFromEventKey(match.eventKey);
      const functions = getFunctionsBySeasonKey(seasonKey);
      if (
        !match.details ||
        !functions ||
        this.state >= MatchState.RESULTS_COMMITTED
      )
        return;
      const [redScore, blueScore] = functions.calculateScore(this.match);
      this.match.redScore = redScore;
      this.match.blueScore = blueScore;
      if (functions.calculateRankingPoints) {
        this.match.details = functions.calculateRankingPoints(
          this.match.details
        );
      }
      this.emitToAll("match:update", this.match);
    });
    socket.on("match:commit", (key: MatchKey) => {
      this.emitToAll("match:commit", key);
      this.match = null;
      this.state = MatchState.RESULTS_COMMITTED;
      logger.info(
        `committing scores for ${key.eventKey}-${key.tournamentKey}-${key.id}`
      );
    });
  }

  private emitToAll(eventName: string, ...args: any[]): void {
    this.localEmitter.emit(eventName, args);
    this.broadcast().emit(eventName, args);
  }
}
