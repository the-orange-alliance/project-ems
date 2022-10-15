import {
  isMatchArray,
  isMatchMakerRequest,
  MatchMakerParams,
  Match,
  MatchDetailBase,
  getTournamentLevelFromType,
  TournamentType,
  isMatch,
  isMatchParticipantArray,
  PRACTICE_LEVEL
} from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import {
  insertValue,
  selectAll,
  selectAllWhere,
  updateWhere,
  __dirname
} from '../db/Database.js';
import { validateBody } from '../middleware/BodyValidator.js';
import { DataNotFoundError } from '../util/Errors.js';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import {
  environment,
  executeMatchMaker,
  getAppData,
  getArgFromQualityStr
} from '@toa-lib/server';
import logger from '../util/Logger.js';
import { postMatchResults } from './Results.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.query.tournamentLevel) {
      const data = await selectAllWhere(
        'match',
        `tournamentLevel = ${req.query.tournamentLevel}`
      );
      res.send(data);
    } else if (req.query.type) {
      const data = await selectAllWhere(
        'match',
        `tournamentLevel = ${getTournamentLevelFromType(
          req.query.type as TournamentType
        )}`
      );
      res.send(data);
    } else {
      const data = await selectAll('match');
      res.send(data);
    }
  } catch (e) {
    return next(e);
  }
});

router.get(
  '/participants',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.query.matchKeyPartial) {
        const data = await selectAllWhere(
          'match_participant',
          `matchKey LIKE "${req.query.matchKeyPartial}%"`
        );
        res.send(data);
      } else {
        const data = await selectAll('match_participant');
        res.send(data);
      }
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/all/:matchKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchKey = req.params.matchKey;
      const [match] = await selectAllWhere('match', `matchKey = "${matchKey}"`);
      const participants = await selectAllWhere(
        'match_participant',
        `matchKey = "${matchKey}"`
      );
      const [details] = await selectAllWhere(
        'match_detail',
        `matchKey = "${matchKey}"`
      );

      for (let i = 0; i < participants.length; i++) {
        const [team] = await selectAllWhere(
          'team',
          `teamKey = "${participants[i].teamKey}"`
        );
        participants[i].team = team;
      }

      match.participants = participants;
      match.details = details;

      res.send(match);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:matchKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'match',
        `matchKey = ${req.params.matchKey}`
      );
      if (!data) {
        return next(DataNotFoundError);
      }
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/',
  validateBody(isMatchArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pureMatches: Match[] = req.body.map((m: Match) => ({
        ...m
      }));
      for (const match of pureMatches) delete match.participants;
      const participants = req.body
        .map((match: Match) => match.participants || [])
        .flat();
      const details: MatchDetailBase[] = req.body.map((match: Match) => ({
        matchKey: match.matchKey,
        matchDetailKey: match.matchDetailKey
      }));
      await insertValue('match', pureMatches);
      await insertValue('match_participant', participants);
      await insertValue('match_detail', details);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:matchKey',
  validateBody(isMatch),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchKey = req.params.matchKey;
      const match = req.body;
      if (match.details) delete match.details;
      if (match.participants) delete match.participants;
      await updateWhere('match', req.body, `matchKey = "${matchKey}"`);
      if (match.tournamentLevel > PRACTICE_LEVEL && environment.isProd()) {
        try {
          logger.info('attempting to update results site...');
          postMatchResults(matchKey);
        } catch (e) {
          logger.warn(e);
        }
      }
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:matchKey/details',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateWhere(
        'match_detail',
        req.body,
        `matchKey = "${req.params.matchKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:matchKey/participants',
  validateBody(isMatchParticipantArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const participants = req.body;
      for (const participant of participants) {
        if (participant.team) delete participant.team;
        await updateWhere(
          'match_participant',
          participant,
          `matchParticipantKey = "${participant.matchParticipantKey}"`
        );
      }
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

/** SPECIAL ROUTES */
router.post(
  '/create',
  validateBody(isMatchMakerRequest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchMakerPath = join(__dirname, '../../bin/MatchMaker.exe');
      // First we have to make the teamlist for matchmaker
      const config: MatchMakerParams = req.body;
      const teamsPath = join(getAppData('ems'), `${config.type}-teams.txt`);
      const contents = config.teamKeys.toString().replace(/,/g, '\n');
      await writeFile(teamsPath, contents);
      logger.info(`wrote teams file at ${teamsPath}`);
      const matchMakerArgs = [
        '-l',
        teamsPath,
        '-t',
        config.teamsParticipating.toString(),
        '-r',
        config.matchesPerTeam.toString(),
        '-a',
        config.teamsPerAlliance.toString(),
        getArgFromQualityStr(config.quality),
        '-s',
        '-o'
      ];
      logger.info(
        `executing matchmaker (${matchMakerPath}) with arguments ${matchMakerArgs.toString()}`
      );
      const matches = await executeMatchMaker(
        matchMakerPath,
        matchMakerArgs,
        config
      );
      logger.info('mathmaker complete - sending results');
      res.send(matches);
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
