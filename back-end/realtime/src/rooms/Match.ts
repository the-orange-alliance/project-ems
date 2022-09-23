import { Match as MatchObj, MatchState, MatchTimer } from "@toa-lib/models";
import { Server, Socket } from "socket.io";
import logger from "../util/Logger";
import Room from "./Room";

export default class Match extends Room {
  private matchKey: string | null;
  private match: MatchObj | null;
  private timer: MatchTimer;
  private state: MatchState;

  public constructor(server: Server) {
    super(server, "match");

    this.matchKey = null;
    this.match = null;
    this.timer = new MatchTimer();
    this.state = MatchState.MATCH_NOT_SELECTED;
  }

  public initializeEvents(socket: Socket): void {
    // These are in case of mid-match disconnect/reconnects
    if (this.state >= MatchState.PRESTART_COMPLETE && this.matchKey) {
      // Send prestart information
      socket.emit("match:prestart", this.matchKey);
    }

    // Event listeners for matches
    socket.on("match:prestart", (matchKey: string) => {
      this.matchKey = matchKey;
      this.broadcast().emit("match:prestart", matchKey);
      this.state = MatchState.PRESTART_COMPLETE;
      logger.info(`prestarting ${matchKey}`);
    });
    socket.on("match:abort", () => {
      this.matchKey = null;
      this.timer.abort();
      this.state = MatchState.MATCH_ABORTED;
    });
    socket.on("match:start", () => {
      if (this.timer.inProgress()) return;
      this.timer.once("timer:start", () => {
        this.broadcast().emit("match-start", "start");
        this.state = MatchState.MATCH_IN_PROGRESS;
        logger.info("match in progress");
      });
      this.timer.once("timer:auto", () => {
        this.broadcast().emit("match:auto");
        logger.info("match auto");
      });
      this.timer.once("timer:tele", () => {
        this.broadcast().emit("match:tele");
        logger.info("match tele");
      });
      this.timer.once("timer:endgame", () => {
        this.broadcast().emit("match:endgame");
        logger.info("match endgame");
      });
      this.timer.once("timer:end", () => {
        this.broadcast().emit("match:end");
        this.timer.removeListeners();
        this.state = MatchState.MATCH_COMPLETE;
        logger.info("match completed");
      });
      this.timer.once("timer:abort", () => {
        this.broadcast().emit("match:abort");
        this.timer.removeListeners();
        this.state = MatchState.PRESTART_READY;
        logger.info("match aborted");
      });
      this.timer.start();
      logger.info(`match started: ${this.matchKey}`);
    });
    socket.on("match:update", (match: MatchObj) => {
      this.broadcast().emit("match:update", match);
      this.match = match;
    });
  }
}
