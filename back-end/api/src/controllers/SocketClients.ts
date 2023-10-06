import { NextFunction, Request, Response, Router } from 'express';
import { getDB } from '../db/EventDatabase.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all displays
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDB('global');
      const clients = await db.selectAll(
        'socket_clients'
      );
      res.json(clients);
    } catch (e) {
      next(e);
    }
  }
);

// New client
router.post(
  '/connect',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if client already exists
      const db = await getDB('global');
      if (req.body.persistantClientId) {
        // Update
        req.body.connected = 1;
        req.body.audienceDisplayChroma = req.body.audienceDisplayChroma.replaceAll('"', '')
        // Check if client already exists
        const client = await db.selectAllWhere(
          'socket_clients',
          `persistantClientId = "${req.body.persistantClientId}"`
        );
        // If client exists, update
        if (client.length > 0) {
          await db.updateWhere(
            'socket_clients',
            req.body,
            `persistantClientId = "${req.body.persistantClientId}"`
          );
        } else {
          await db.insertValue('socket_clients', [req.body]);
        }

      } else {
        // Brand new client, create new UUID
        req.body.persistantClientId = uuidv4();
        await db.insertValue('socket_clients', [req.body]);
      }

      res.json(req.body);
    } catch (e) {
      next(e);
    }
  }
);

// Client Disconnected
router.post(
  '/update/:persistantClientId',
  async (req: Request, res: Response, next: NextFunction) => {
    const { persistantClientId } = req.params;
    try {
      const db = await getDB('global');
      await db.updateWhere(
        'socket_clients',
        req.body,
        `persistantClientId = "${persistantClientId}"`
      );
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

// Client Deleted
router.post(
  '/disconnect/:lastSocketId',
  async (req: Request, res: Response, next: NextFunction) => {
    const { lastSocketId } = req.params;
    try {
      const db = await getDB('global');
      await db.updateWhere(
        'socket_clients',
        { connected: 0 },
        `lastSocketId = "${lastSocketId}"`
      );
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

// Client Deleted
router.delete(
  '/remove/:persistantClientId',
  async (req: Request, res: Response, next: NextFunction) => {
    const { persistantClientId } = req.params;
    try {
      const db = await getDB('global');
      await db.deleteWhere(
        'socket_clients',
        `persistantClientId = "${persistantClientId}"`
      );
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
