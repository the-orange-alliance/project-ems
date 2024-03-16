import { Match, MatchDetailBase, RESULT_NOT_PLAYED } from '../base/Match.js';
import { Ranking } from '../base/Ranking.js';
import { Season, SeasonFunctions } from './index.js';

/**
 * Main season function declaration for the whole file.
 */
const functions: SeasonFunctions<ChargedUpDetails, ChargedUpRanking> = {
  calculateRankings,
  calculateRankingPoints,
  calculateScore,
  calculateAutoScore,
  calculateTeleScore,
  calculateEndScore
};

export interface ChargedUpDetails extends MatchDetailBase {
  redAutoMobilityOne: number;
  redAutoMobilityTwo: number;
  redAutoMobilityThree: number;
  redAutoTopPieces: number;
  redAutoMidPieces: number;
  redAutoLowPieces: number;
  redAutoChargeOne: number;
  redAutoChargeTwo: number;
  redAutoChargeThree: number;
  redTeleTopPieces: number;
  redTeleMidPieces: number;
  redTeleLowPieces: number;
  redTeleChargeOne: number;
  redTeleChargeTwo: number;
  redTeleChargeThree: number;
  redLinks: number;
  redSustainBonus: number;
  redActivationBonus: number;
  blueAutoMobilityOne: number;
  blueAutoMobilityTwo: number;
  blueAutoMobilityThree: number;
  blueAutoTopPieces: number;
  blueAutoMidPieces: number;
  blueAutoLowPieces: number;
  blueAutoChargeOne: number;
  blueAutoChargeTwo: number;
  blueAutoChargeThree: number;
  blueTeleTopPieces: number;
  blueTeleMidPieces: number;
  blueTeleLowPieces: number;
  blueTeleChargeOne: number;
  blueTeleChargeTwo: number;
  blueTeleChargeThree: number;
  blueLinks: number;
  blueSustainBonus: number;
  blueActivationBonus: number;
  coopertitionBonus: number;
}

export const defaultMatchDetails: ChargedUpDetails = {
  eventKey: '',
  tournamentKey: '',
  id: -1,
  redAutoMobilityOne: 0,
  redAutoMobilityTwo: 0,
  redAutoMobilityThree: 0,
  redAutoTopPieces: 0,
  redAutoMidPieces: 0,
  redAutoLowPieces: 0,
  redAutoChargeOne: 0,
  redAutoChargeTwo: 0,
  redAutoChargeThree: 0,
  redTeleTopPieces: 0,
  redTeleMidPieces: 0,
  redTeleLowPieces: 0,
  redTeleChargeOne: 0,
  redTeleChargeTwo: 0,
  redTeleChargeThree: 0,
  redLinks: 0,
  redSustainBonus: 0,
  redActivationBonus: 0,
  blueAutoMobilityOne: 0,
  blueAutoMobilityTwo: 0,
  blueAutoMobilityThree: 0,
  blueAutoTopPieces: 0,
  blueAutoMidPieces: 0,
  blueAutoLowPieces: 0,
  blueAutoChargeOne: 0,
  blueAutoChargeTwo: 0,
  blueAutoChargeThree: 0,
  blueTeleTopPieces: 0,
  blueTeleMidPieces: 0,
  blueTeleLowPieces: 0,
  blueTeleChargeOne: 0,
  blueTeleChargeTwo: 0,
  blueTeleChargeThree: 0,
  blueLinks: 0,
  blueSustainBonus: 0,
  blueActivationBonus: 0,
  coopertitionBonus: 0
};

export const ChargedUpSeason: Season<ChargedUpDetails, ChargedUpRanking> = {
  key: 'frc_2023',
  program: 'frc',
  name: 'Charged Up',
  defaultMatchDetails,
  functions
};

export interface ChargedUpRanking extends Ranking {
  rankingScore: number;
  avgAlliancePoints: number;
  avgAllianceChargePoints: number;
  avgAllianceAutoPoints: number;
}

function calculateRankings(
  matches: Match<ChargedUpDetails>[],
  prevRankings: ChargedUpRanking[]
): ChargedUpRanking[] {
  const rankingsMap = new Map<number, ChargedUpRanking>();
  const teamAlliancePoints = new Map<number, number>();
  const teamAllianceChargePoints = new Map<number, number>();
  const teamAllianceAutoPoints = new Map<number, number>();
  const teamRankingPoints = new Map<number, number>();
  for (const match of matches) {
    if (!match.participants || !match.details) {
      continue;
    }
    for (const participant of match.participants) {
      if (!rankingsMap.has(participant.teamKey)) {
        rankingsMap.set(participant.teamKey, {
          eventKey: participant.eventKey,
          tournamentKey: participant.tournamentKey,
          avgAllianceAutoPoints: 0,
          avgAllianceChargePoints: 0,
          avgAlliancePoints: 0,
          losses: 0,
          played: 0,
          rank: 0,
          rankChange: 0,
          rankingScore: 0,
          teamKey: participant.teamKey,
          ties: 0,
          wins: 0
        });
      }

      if (!teamAlliancePoints.has(participant.teamKey)) {
        teamAlliancePoints.set(participant.teamKey, 0);
      }

      if (!teamAllianceChargePoints.has(participant.teamKey)) {
        teamAllianceChargePoints.set(participant.teamKey, 0);
      }

      if (!teamAllianceAutoPoints.has(participant.teamKey)) {
        teamAllianceAutoPoints.set(participant.teamKey, 0);
      }

      if (!teamRankingPoints.has(participant.teamKey)) {
        teamRankingPoints.set(participant.teamKey, 0);
      }

      const ranking = {
        ...(rankingsMap.get(participant.teamKey) as ChargedUpRanking)
      };
      const prevPoints = teamAlliancePoints.get(participant.teamKey);
      const prevChargePoints = teamAllianceChargePoints.get(
        participant.teamKey
      );
      const prevAutoPoints = teamAllianceAutoPoints.get(participant.teamKey);
      const prevRankingPoints = teamRankingPoints.get(participant.teamKey);
      if (
        typeof prevPoints === 'undefined' ||
        typeof prevChargePoints === 'undefined' ||
        typeof prevAutoPoints === 'undefined' ||
        typeof prevRankingPoints === 'undefined' ||
        match.result <= RESULT_NOT_PLAYED
      ) {
        continue;
      }

      const isRed = participant.station < 20;

      const [redScore, blueScore] = calculateScore(match);
      const redFouls = match.redMinPen * 5 + match.redMajPen * 12;
      const blueFouls = match.blueMinPen * 5 + match.blueMajPen * 12;
      const score = isRed ? redScore - blueFouls : blueScore - redFouls;
      const { details } = match;

      const chargePoints = isRed
        ? getAutoChargeStatus(details.redAutoChargeOne) +
          getAutoChargeStatus(details.redAutoChargeTwo) +
          getAutoChargeStatus(details.redAutoChargeThree) +
          getTeleChargeStatus(details.redTeleChargeOne) +
          getTeleChargeStatus(details.redTeleChargeTwo) +
          getTeleChargeStatus(details.redTeleChargeThree)
        : getAutoChargeStatus(details.blueAutoChargeOne) +
          getAutoChargeStatus(details.blueAutoChargeTwo) +
          getAutoChargeStatus(details.blueAutoChargeThree) +
          getTeleChargeStatus(details.blueTeleChargeOne) +
          getTeleChargeStatus(details.blueTeleChargeTwo) +
          getTeleChargeStatus(details.blueTeleChargeThree);

      const autoPoints = isRed
        ? getRedAutoPoints(details)
        : getBlueAutoPoints(details);

      const rankingPoints = isRed
        ? details.redActivationBonus + details.redSustainBonus
        : details.blueActivationBonus + details.blueSustainBonus;

      if (participant.cardStatus < 2 && participant.disqualified < 1) {
        teamAlliancePoints.set(participant.teamKey, prevPoints + score);
        teamAllianceChargePoints.set(
          participant.teamKey,
          prevChargePoints + chargePoints
        );
        teamAllianceAutoPoints.set(
          participant.teamKey,
          prevAutoPoints + autoPoints
        );
        teamRankingPoints.set(
          participant.teamKey,
          prevRankingPoints + rankingPoints
        );

        const isTie = match.redScore === match.blueScore;
        const isRedWin = match.redScore > match.blueScore;

        ranking.played = ranking.played + 1;
        ranking.wins =
          ranking.wins +
          (isTie ? 0 : isRed && isRedWin ? 1 : !isRed && !isRedWin ? 1 : 0);
        ranking.ties = ranking.ties + (isTie ? 1 : 0);
        ranking.losses =
          ranking.losses +
          (isTie ? 0 : isRed && isRedWin ? 0 : !isRed && !isRedWin ? 0 : 1);

        rankingsMap.set(participant.teamKey, ranking);
      }
    }
  }

  for (const teamKey of rankingsMap.keys()) {
    const ranking = {
      ...(rankingsMap.get(teamKey) as ChargedUpRanking)
    };
    const autoPoints = teamAllianceAutoPoints.get(teamKey);
    const chargePoints = teamAllianceChargePoints.get(teamKey);
    const points = teamAlliancePoints.get(teamKey);
    const rankingPoints = teamRankingPoints.get(teamKey);

    if (
      typeof autoPoints === 'undefined' ||
      typeof chargePoints === 'undefined' ||
      typeof points === 'undefined' ||
      typeof rankingPoints === 'undefined' ||
      ranking.played <= 0
    ) {
      continue;
    }

    const avgAllianceAutoPoints = autoPoints / ranking.played;
    const avgAllianceChargePoints = chargePoints / ranking.played;
    const avgAlliancePoints = points / ranking.played;
    const rankingScore =
      (rankingPoints + ranking.wins * 2 + ranking.ties) / ranking.played;

    rankingsMap.set(teamKey, {
      ...ranking,
      avgAllianceAutoPoints,
      avgAllianceChargePoints,
      avgAlliancePoints,
      rankingScore
    });
  }

  const rankings = [...rankingsMap.values()].sort(compareRankings);

  // In this loop calculate the rank change
  for (let i = 0; i < rankings.length; i++) {
    const prevRanking = prevRankings.find(
      (r) => r.teamKey === rankings[i].teamKey
    );
    rankings[i].rank = i + 1;
    if (prevRanking) {
      const rankDelta =
        prevRanking.rank === 0 ? 0 : prevRanking.rank - rankings[i].rank;
      rankings[i].rankChange = rankDelta;
      rankings[i].eventKey = prevRanking.eventKey;
      rankings[i].tournamentKey = prevRanking.tournamentKey;
    }
  }

  return rankings;
}

function calculateScore(match: Match<ChargedUpDetails>): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];
  const redScore = getRedAutoPoints(details) + getRedTelePoints(details);
  const blueScore = getBlueAutoPoints(details) + getBlueTelePoints(details);
  const redFouls = match.redMinPen * 5 + match.redMajPen * 12;
  const blueFouls = match.blueMinPen * 5 + match.blueMajPen * 12;
  return [redScore + blueFouls, blueScore + redFouls];
}

function calculateRankingPoints(details: ChargedUpDetails): ChargedUpDetails {
  const redGoalLinks = details.coopertitionBonus ? 4 : 5;
  const blueGoalLinks = details.coopertitionBonus ? 4 : 5;
  const redChargePoints =
    getRedAutoChargePoints(details) + getRedTeleChargePoints(details);
  const blueChargePoints =
    getBlueAutoChargePoints(details) + getBlueTeleChargePoints(details);
  return Object.assign(
    {},
    {
      ...details,
      redSustainBonus: details.redLinks >= redGoalLinks ? 1 : 0,
      blueSustainBonus: details.blueLinks >= blueGoalLinks ? 1 : 0,
      redActivationBonus: redChargePoints >= 26 ? 1 : 0,
      blueActivationBonus: blueChargePoints >= 26 ? 1 : 0
    }
  );
}

function compareRankings(a: ChargedUpRanking, b: ChargedUpRanking): number {
  if (a.rankingScore !== b.rankingScore) {
    return b.rankingScore - a.rankingScore;
  } else if (a.avgAlliancePoints !== b.avgAlliancePoints) {
    return b.avgAlliancePoints - a.avgAlliancePoints;
  } else if (a.avgAllianceChargePoints !== b.avgAllianceChargePoints) {
    return b.avgAllianceAutoPoints - a.avgAllianceAutoPoints;
  } else {
    return 0;
  }
}

function calculateAutoScore(match: Match<ChargedUpDetails>): [number, number] {
  if (!match.details) return [0, 0];
  return [getRedAutoPoints(match.details), getBlueAutoPoints(match.details)];
}

function calculateTeleScore(match: Match<ChargedUpDetails>): [number, number] {
  if (!match.details) return [0, 0];
  return [getRedTelePoints(match.details), getBlueAutoPoints(match.details)];
}

function calculateEndScore(match: Match<ChargedUpDetails>): [number, number] {
  return [0, 0];
}

function getAutoChargeStatus(status: number): number {
  switch (status) {
    case 0:
      return 0;
    case 1:
      return 8;
    case 2:
      return 12;
    default:
      return 0;
  }
}

function getTeleChargeStatus(status: number): number {
  switch (status) {
    case 0:
      return 0;
    case 1:
      return 6;
    case 2:
      return 10;
    default:
      return 0;
  }
}

function getParkStatus(status: number): number {
  return status === 3 ? 2 : 0;
}

function getRedAutoChargePoints(details: ChargedUpDetails): number {
  const redAutoCharge =
    getAutoChargeStatus(details.redAutoChargeOne) +
    getAutoChargeStatus(details.redAutoChargeTwo) +
    getAutoChargeStatus(details.redAutoChargeThree);
  return redAutoCharge;
}

function getRedTeleChargePoints(details: ChargedUpDetails): number {
  const points =
    getTeleChargeStatus(details.redTeleChargeOne) +
    getTeleChargeStatus(details.redTeleChargeTwo) +
    getTeleChargeStatus(details.redTeleChargeThree);
  return points;
}

function getRedAutoPoints(details: ChargedUpDetails): number {
  const redAutoMobility =
    (details.redAutoMobilityOne +
      details.redAutoMobilityTwo +
      details.redAutoMobilityThree) *
    3;
  const redAutoPieces =
    details.redAutoTopPieces * 6 +
    details.redAutoMidPieces * 4 +
    details.redAutoLowPieces * 3;

  return redAutoMobility + redAutoPieces + getRedAutoChargePoints(details);
}

function getRedTelePoints(details: ChargedUpDetails): number {
  const redTelePieces =
    details.redTeleTopPieces * 5 +
    details.redTeleMidPieces * 3 +
    details.redTeleLowPieces * 2;
  const redTeleCharge =
    getTeleChargeStatus(details.redTeleChargeOne) +
    getTeleChargeStatus(details.redTeleChargeTwo) +
    getTeleChargeStatus(details.redTeleChargeThree);
  const redPark =
    getParkStatus(details.redTeleChargeOne) +
    getParkStatus(details.redTeleChargeTwo) +
    getParkStatus(details.redTeleChargeThree);
  const redLinks = details.redLinks * 5;
  return redTelePieces + redTeleCharge + redPark + redLinks;
}

function getBlueAutoChargePoints(details: ChargedUpDetails): number {
  const blueAutoCharge =
    getAutoChargeStatus(details.blueAutoChargeOne) +
    getAutoChargeStatus(details.blueAutoChargeTwo) +
    getAutoChargeStatus(details.blueAutoChargeThree);
  return blueAutoCharge;
}

function getBlueTeleChargePoints(details: ChargedUpDetails): number {
  const points =
    getTeleChargeStatus(details.blueTeleChargeOne) +
    getTeleChargeStatus(details.blueTeleChargeTwo) +
    getTeleChargeStatus(details.blueTeleChargeThree);
  return points;
}

function getBlueAutoPoints(details: ChargedUpDetails): number {
  const blueAutoMobility =
    (details.blueAutoMobilityOne +
      details.blueAutoMobilityTwo +
      details.blueAutoMobilityThree) *
    3;
  const blueAutoPieces =
    details.blueAutoTopPieces * 6 +
    details.blueAutoMidPieces * 4 +
    details.blueAutoLowPieces * 3;

  return blueAutoMobility + blueAutoPieces + getBlueAutoChargePoints(details);
}

function getBlueTelePoints(details: ChargedUpDetails): number {
  const blueTelePieces =
    details.blueTeleTopPieces * 5 +
    details.blueTeleMidPieces * 3 +
    details.blueTeleLowPieces * 2;
  const blueTeleCharge =
    getTeleChargeStatus(details.blueTeleChargeOne) +
    getTeleChargeStatus(details.blueTeleChargeTwo) +
    getTeleChargeStatus(details.blueTeleChargeThree);
  const bluePark =
    getParkStatus(details.blueTeleChargeOne) +
    getParkStatus(details.blueTeleChargeTwo) +
    getParkStatus(details.blueTeleChargeThree);
  const blueLinks = details.blueLinks * 5;
  return blueTelePieces + blueTeleCharge + bluePark + blueLinks;
}
