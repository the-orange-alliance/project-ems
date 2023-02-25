import {
  calculateCUScore,
  ChargedUpDetails,
  ChargedUpRanking,
  isRankingArray,
  isTeamArray,
  Match,
  Ranking,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings,
  Team
} from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import {
  insertValue,
  selectAllJoinWhere,
  selectAllWhere
} from '../db/Database.js';
import { validateBody } from '../middleware/BodyValidator.js';

const router = Router();

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankings = await selectAllWhere(
        'ranking',
        `eventKey = "${req.params.eventKey}"`
      );
      const teams = await selectAllWhere(
        'team',
        `eventKey = "${req.params.eventKey}"`
      );
      res.send(reconcileTeamRankings(teams, rankings));
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankings = await selectAllWhere(
        'ranking',
        `eventKey = "${req.params.eventKey}" AND tournamentKey = "${req.params.tournamentKey}"`
      );
      const teams = await selectAllWhere(
        'team',
        `eventKey = "${req.params.eventKey}" AND tournamentKey = "${req.params.tournamentKey}"`
      );
      res.send(reconcileTeamRankings(teams, rankings));
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:eventKey/:tournamentKey/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, id } = req.params;
      const rankings = await selectAllJoinWhere(
        'ranking',
        'match_participant',
        'teamKey',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
      );
      res.send(rankings);
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/',
  validateBody(isRankingArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await insertValue('ranking', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/create/:tournamentKey',
  validateBody(isTeamArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentKey } = req.params;
      const teams: Team[] = req.body;
      const rankings: Ranking[] = teams.map((t) => ({
        eventKey: t.eventKey,
        tournamentKey,
        rank: 0,
        losses: 0,
        played: 0,
        rankChange: 0,
        teamKey: t.teamKey,
        ties: 0,
        wins: 0
      }));
      await insertValue('ranking', rankings);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/calculate/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey } = req.params;
      const matches = await selectAllWhere(
        'match',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const participants = await selectAllWhere(
        'match_participant',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const details = await selectAllWhere(
        'match_detail',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const matchesWithParticipants = reconcileMatchParticipants(
        matches,
        participants
      );
      const matchesWithDetails = reconcileMatchDetails(
        matchesWithParticipants,
        details
      );
      const rankings = calculateCUsRankings(matchesWithDetails);
      res.send(rankings);
    } catch (e) {
      return next(e);
    }
  }
);

export default router;

function calculateCUsRankings(
  matches: Match<ChargedUpDetails>[]
): ChargedUpRanking[] {
  const rankings: ChargedUpRanking[] = [];
  const rankingsMap = new Map<number, ChargedUpRanking>();
  const teamAlliancePoints = new Map<number, number>();
  const teamAllianceChargePoints = new Map<number, number>();
  const teamAllianceAutoPoints = new Map<number, number>();
  const teamRankingPoints = new Map<number, number>();
  for (const match of matches) {
    if (!match.participants || !match.details) {
      console.log(match.participants, match.details);
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
        !prevPoints ||
        !prevChargePoints ||
        !prevAutoPoints ||
        !prevRankingPoints
      ) {
        continue;
      }

      const isRed = participant.station < 20;

      const [redScore, blueScore] = calculateCUScore(match);
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

    for (const teamKey of rankingsMap.keys()) {
      const ranking = {
        ...(rankingsMap.get(teamKey) as ChargedUpRanking)
      };
      const autoPoints = teamAllianceAutoPoints.get(teamKey);
      const chargePoints = teamAllianceChargePoints.get(teamKey);
      const points = teamAlliancePoints.get(teamKey);
      const rankingPoints = teamRankingPoints.get(teamKey);

      if (!autoPoints || !chargePoints || !points || !rankingPoints) {
        continue;
      }

      const avgAllianceAutoPoints = autoPoints / ranking.played;
      const avgAllianceChargePoints = chargePoints / ranking.played;
      const avgAlliancePoints = points / ranking.played;
      const rankingScore =
        (rankingPoints + ranking.wins * 2 + ranking.ties) / ranking.played;

      rankings.push({
        ...ranking,
        avgAllianceAutoPoints,
        avgAllianceChargePoints,
        avgAlliancePoints,
        rankingScore
      });
    }
  }
  return [...rankings.sort(compareRankings)];
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
    default:
      return 0;
  }
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

function getRedAutoChargePoints(details: ChargedUpDetails): number {
  const redAutoCharge =
    getAutoChargeStatus(details.redAutoChargeOne) +
    getAutoChargeStatus(details.redAutoChargeTwo) +
    getAutoChargeStatus(details.redAutoChargeThree);
  return redAutoCharge;
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

function getBlueAutoChargePoints(details: ChargedUpDetails): number {
  const blueAutoCharge =
    getAutoChargeStatus(details.blueAutoChargeOne) +
    getAutoChargeStatus(details.blueAutoChargeTwo) +
    getAutoChargeStatus(details.blueAutoChargeThree);
  return blueAutoCharge;
}
