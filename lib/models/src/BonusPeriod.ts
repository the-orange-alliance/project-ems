import { Match } from "./Match.js";
import { Crescendo } from "./index.js";

export enum BonusPeriodConfig {
    FRC_2024_AMPLIFY_RED = "FRC_2024_AMPLIFY_RED",
    FRC_2024_AMPLIFY_BLUE = "FRC_2024_AMPLIFY_BLUE"
}

/*
* This is a bonus period. It is a period of time in a match where certain actions can be taken to earn bonus points.
* duration: The duration of the bonus period in seconds.
* autoEnd: A function that takes the match at the start of the bonus period and the current match and returns true if the bonus period should end.
*/
export interface BonusPeriodSettings {
    duration: number;
    autoEnd: (matchAtStartState: Match<any>, currentMatchState: Match<any>) => boolean;
}

export const FRC_2024_AMPLIFY_RED: BonusPeriodSettings = {
    duration: 10,
    autoEnd: (matchAtStartState: Match<Crescendo.MatchDetails>, currentMatchState: Match<Crescendo.MatchDetails>) => {
        if (!matchAtStartState.details || !currentMatchState.details) return false;

        const totalAmpNotesAtStart = matchAtStartState.details.redAutoAmpNotes + matchAtStartState.details.redTeleAmpNotes;
        const totalAmpNotesNow = currentMatchState.details.redAutoAmpNotes + currentMatchState.details.redTeleAmpNotes;

        // 4 notes scored ends the period
        return totalAmpNotesNow - totalAmpNotesAtStart > 3;
    }
}

export const FRC_2024_AMPLIFY_BLUE: BonusPeriodSettings = {
    duration: 10,
    autoEnd: (matchAtStartState: Match<Crescendo.MatchDetails>, currentMatchState: Match<Crescendo.MatchDetails>) => {
        if (!matchAtStartState.details || !currentMatchState.details) return false;

        const totalAmpNotesAtStart = matchAtStartState.details.blueAutoAmpNotes + matchAtStartState.details.blueTeleAmpNotes;
        const totalAmpNotesNow = currentMatchState.details.blueAutoAmpNotes + currentMatchState.details.blueTeleAmpNotes;

        // 4 notes scored ends the period
        return totalAmpNotesNow - totalAmpNotesAtStart > 3;
    }
}

export const BonusPeriodSettings = {
    [BonusPeriodConfig.FRC_2024_AMPLIFY_RED]: FRC_2024_AMPLIFY_RED,
    [BonusPeriodConfig.FRC_2024_AMPLIFY_BLUE]: FRC_2024_AMPLIFY_BLUE
}