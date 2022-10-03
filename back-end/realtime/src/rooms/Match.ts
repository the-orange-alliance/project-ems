import { Match as MatchObj, MatchState, MatchTimer } from "@toa-lib/models";
import {
  calculateScore,
  CarbonCaptureDetails,
  isCarbonCaptureDetails,
} from "@toa-lib/models";
import { Server, Socket } from "socket.io";
import logger from "../util/Logger";
import Room from "./Room";

export default class Match extends Room {
  private matchKey: string | null;
  private match: MatchObj | null;
  private timer: MatchTimer;
  private state: MatchState;
  private displayID: number;

  public constructor(server: Server) {
    super(server, "match");

    this.matchKey = null;
    this.match = null;
    this.timer = new MatchTimer();
    this.state = MatchState.MATCH_NOT_SELECTED;
    this.displayID = 0;
  }

  public initializeEvents(socket: Socket): void {
    // These are in case of mid-match disconnect/reconnects
    if (
      this.state >= MatchState.PRESTART_COMPLETE &&
      this.matchKey &&
      !this.timer.inProgress()
    ) {
      // Send prestart information
      socket.emit("match:prestart", this.matchKey);
      socket.emit("match:display", this.displayID);
    }

    if (this.match && this.timer.inProgress()) {
      socket.emit("match:update", this.match);
    }

    if (this.state === MatchState.RESULTS_COMMITTED) {
      socket.emit("match:commit", this.matchKey);
    }

    // Event listeners for matches
    socket.on("match:prestart", (matchKey: string) => {
      this.matchKey = matchKey;
      this.broadcast().emit("match:prestart", matchKey);
      this.broadcast().emit("match:display", 1);
      this.displayID = 1;
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
        this.broadcast().emit("match:start", "start");
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
      this.displayID = 2;
      this.timer.start();
      logger.info(`match started: ${this.matchKey}`);
    });
    socket.on("match:display", (id: number) => {
      this.displayID = id;
      this.broadcast().emit("match:display", id);
    });
    socket.on("match:update", (match: MatchObj) => {
      this.match = { ...match };
      if (!match.details || this.state >= MatchState.RESULTS_COMMITTED) return;
      if (!isCarbonCaptureDetails(match.details)) {
        const details = match.details as CarbonCaptureDetails;
        this.match.details = {
          ...details,
          carbonPoints: details.carbonPoints || 0,
          redRobotOneStorage: details.redRobotOneStorage || 0,
          redRobotTwoStorage: details.redRobotTwoStorage || 0,
          redRobotThreeStorage: details.redRobotThreeStorage || 0,
          blueRobotOneStorage: details.blueRobotOneStorage || 0,
          blueRobotTwoStorage: details.blueRobotTwoStorage || 0,
          blueRobotThreeStorage: details.blueRobotThreeStorage || 0,
          coopertitionBonusLevel: details.coopertitionBonusLevel || 0,
        };
      }

      // Calculate coopertition
      let coopertitionBonusLevel = 0;
      if ((this.match.details as any).carbonPoints >= 165 * 0.66) {
        coopertitionBonusLevel = 1;
      }
      if ((this.match.details as any).carbonPoints >= 165) {
        (this.match.details as any).carbonPoints = 165;
        coopertitionBonusLevel = 2;
      }
      (this.match.details as any).coopertitionBonusLevel =
        coopertitionBonusLevel;

      const [redScore, blueScore] = calculateScore(
        this.match.redMinPen,
        this.match.blueMinPen,
        this.match.details as CarbonCaptureDetails
      );
      this.match.redScore = redScore;
      this.match.blueScore = blueScore;
      this.broadcast().emit("match:update", this.match);
    });
    socket.on("match:commit", (matchKey: string) => {
      this.broadcast().emit("match:commit", matchKey);
      this.match = null;
      this.state = MatchState.RESULTS_COMMITTED;
      logger.info(`committing scores for ${matchKey}`);
    });
  }
}
