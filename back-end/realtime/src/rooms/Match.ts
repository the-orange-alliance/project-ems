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
    });
    socket.on("match:abort", () => {
      this.matchKey = null;
      this.timer.abort();
      this.state = MatchState.MATCH_ABORTED;
    });
    socket.on("match:start", () => {
      if (this.timer.inProgress()) return;
      this.timer.once("match:start", () => {
        this.broadcast().emit("match:timing:start");
        this.state = MatchState.MATCH_IN_PROGRESS;
        logger.info("match in progress");
      });
      this.timer.once("match:auto", () => {
        this.broadcast().emit("match:timing:auto");
      });
      this.timer.once("match:tele", () => {
        this.broadcast().emit("match:timing:tele");
      });
      this.timer.once("match:endgame", () => {
        this.broadcast().emit("match:timing:endgame");
      });
      this.timer.once("match:end", () => {
        this.broadcast().emit("match:timing:end");
        this.timer.removeListeners();
        this.state = MatchState.MATCH_COMPLETE;
        logger.info("match completed");
      });
      this.timer.once("match:abort", () => {
        this.broadcast().emit("match:timing:abort");
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
