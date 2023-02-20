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
  executeMatchMaker,
  getAppData,
  getArgFromQualityStr
} from '@toa-lib/server';
import logger from '../util/Logger.js';

const router = Router();

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'match',
        `eventKey = "${req.params.eventKey}"`
      );
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/participants/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'match_participant',
        `eventKey = "${req.params.eventKey}"`
      );
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

// TODO - This might never function because it might just match /participants
router.get(
  '/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'match',
        `eventKey = "${req.params.eventKey}" AND tournamentKey = "${req.params.tournamentKey}"`
      );
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/all/:eventKey/:tournamentKey/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, id } = req.params;
      const [match] = await selectAllWhere(
        'match',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
      );
      const participants = await selectAllWhere(
        'match_participant',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
      );
      const [details] = await selectAllWhere(
        'match_detail',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
      );

      for (let i = 0; i < participants.length; i++) {
        const [team] = await selectAllWhere(
          'team',
          `teamKey = "${participants[i].teamKey}" AND eventKey = "${eventKey}"`
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
  '/:eventKey/:tournamentKey/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, id } = req.params;
      const data = await selectAllWhere(
        'match',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
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
      const pureMatches: Match<any>[] = req.body.map((m: Match<any>) => ({
        ...m
      }));
      for (const match of pureMatches) delete match.participants;
      const participants = req.body
        .map((match: Match<any>) => match.participants || [])
        .flat();
      const details: MatchDetailBase[] = req.body.map((match: Match<any>) => ({
        eventKey: match.eventKey,
        tournamentKey: match.tournamentKey,
        id: match.id
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
  '/:eventKey/:tournamentKey/:id',
  validateBody(isMatch),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, id } = req.params;
      const match = req.body;
      if (match.details) delete match.details;
      if (match.participants) delete match.participants;
      await updateWhere(
        'match',
        req.body,
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/details/:eventKey/:tournamentKey/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, id } = req.params;
      await updateWhere(
        'match_detail',
        req.body,
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/participants/:eventKey/:tournamentKey/:id',
  validateBody(isMatchParticipantArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, id } = req.params;
      const participants = req.body;
      for (const participant of participants) {
        if (participant.team) delete participant.team;
        const { station } = participant;
        await updateWhere(
          'match_participant',
          participant,
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id} AND station = ${station}`
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
      const teamsPath = join(
        getAppData('ems'),
        `${config.eventKey}-${config.name}_teams.txt`
      );
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
