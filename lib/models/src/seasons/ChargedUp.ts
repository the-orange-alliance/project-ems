import { Match, MatchDetailBase } from '../Match.js';
import { Ranking } from '../Ranking.js';

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

export const defaultChargedUpDetails: ChargedUpDetails = {
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

export interface ChargedUpRanking extends Ranking {
  rankingScore: number;
  avgAlliancePoints: number;
  avgAllianceChargePoints: number;
  avgAllianceAutoPoints: number;
}

export function calculateRankings(
  matches: Match<ChargedUpDetails>[]
): ChargedUpRanking[] {
  const teamAlliancePoints = new Map<number, number>();
  const teamAllianceChargePoints = new Map<number, number>();
  const teamAllianceAutoPoints = new Map<number, number>();
  for (const match of matches) {
    if (!match.participants) continue;
    for (const participant of match.participants) {
      if (!teamAlliancePoints.has(participant.teamKey)) {
        teamAlliancePoints.set(participant.teamKey, 0);
      }

      if (!teamAllianceChargePoints.has(participant.teamKey)) {
        teamAllianceChargePoints.set(participant.teamKey, 0);
      }

      if (!teamAllianceAutoPoints.has(participant.teamKey)) {
        teamAllianceAutoPoints.set(participant.teamKey, 0);
      }

      const prevPoints = teamAlliancePoints.get(participant.teamKey);
      const prevChargePoints = teamAllianceChargePoints.get(
        participant.teamKey
      );
      const prevAutoPoints = teamAllianceAutoPoints.get(participant.teamKey);
      if (!prevPoints || !prevChargePoints || !prevAutoPoints) continue;

      const isRed = participant.station < 20;

      const [redScore, blueScore] = calculateScore(match);
      const redFouls = match.redMinPen * 5 + match.redMajPen * 12;
      const blueFouls = match.blueMinPen * 5 + match.blueMajPen * 12;
      const score = isRed ? redScore - blueFouls : blueScore - redFouls;

      teamAllianceAutoPoints.set(participant.teamKey, prevPoints + score);
    }
  }
  return [];
}

export function calculateScore(
  match: Match<ChargedUpDetails>
): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];
  const redAutoMobility =
    (details.redAutoMobilityOne +
      details.redAutoMobilityTwo +
      details.redAutoMobilityThree) *
    3;
  const redAutoPieces =
    details.redAutoTopPieces * 6 +
    details.redAutoMidPieces * 4 +
    details.redAutoLowPieces * 3;
  const redAutoCharge =
    getAutoChargeStatus(details.redAutoChargeOne) +
    getAutoChargeStatus(details.redAutoChargeTwo) +
    getAutoChargeStatus(details.redAutoChargeThree);
  const redTelePieces =
    details.redTeleTopPieces * 5 +
    details.redTeleMidPieces * 3 +
    details.redTeleLowPieces * 2;
  const redTeleCharge =
    getAutoChargeStatus(details.redTeleChargeOne) +
    getAutoChargeStatus(details.redTeleChargeTwo) +
    getAutoChargeStatus(details.redTeleChargeThree);
  const redLinks = details.redLinks * 5;
  const redScore =
    redAutoMobility +
    redAutoPieces +
    redAutoCharge +
    redTelePieces +
    redTeleCharge +
    redLinks;

  const blueAutoMobility =
    (details.blueAutoMobilityOne +
      details.blueAutoMobilityTwo +
      details.blueAutoMobilityThree) *
    3;
  const blueAutoPieces =
    details.blueAutoTopPieces * 6 +
    details.blueAutoMidPieces * 4 +
    details.blueAutoLowPieces * 3;
  const blueAutoCharge =
    getAutoChargeStatus(details.blueAutoChargeOne) +
    getAutoChargeStatus(details.blueAutoChargeTwo) +
    getAutoChargeStatus(details.blueAutoChargeThree);
  const blueTelePieces =
    details.blueTeleTopPieces * 5 +
    details.blueTeleMidPieces * 3 +
    details.blueTeleLowPieces * 2;
  const blueTeleCharge =
    getAutoChargeStatus(details.blueTeleChargeOne) +
    getAutoChargeStatus(details.blueTeleChargeTwo) +
    getAutoChargeStatus(details.blueTeleChargeThree);
  const blueLinks = details.blueLinks * 5;
  const blueScore =
    blueAutoMobility +
    blueAutoPieces +
    blueAutoCharge +
    blueTelePieces +
    blueTeleCharge +
    blueLinks;

  const redFouls = match.redMinPen * 5 + match.redMajPen * 12;
  const blueFouls = match.blueMinPen * 5 + match.blueMajPen * 12;
  return [redScore + blueFouls, blueScore + redFouls];
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
    case 3:
      return 2;
    default:
      return 0;
  }
}
