import { NextFunction, Request, Response, Router } from 'express';
import { Team, WPAKey, isFMSSettings } from '@toa-lib/models';
import { validateBody } from '../middleware/BodyValidator.js';
import { getDB } from '../db/EventDatabase.js';

// WPA Key Generator
const wpaKey = () => {
  var key = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 8; i++) {
    key += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return key;
};

const WPAKeyDatabase = 'fms_wpakeys';

const router = Router();

////////////////////// Advanced Networking Config //////////////////////

// Get all advanced networking configs, unless a specific hardware fingerprint is specified
router.get('/advancedNetworkingConfig', async (req, res) => {
  // Get query param
  const db = await getDB('global');
  const hwFingerprint = req.query.hwFingerprint;
  let data;
  try {
    if (typeof hwFingerprint === 'string' && hwFingerprint.length > 0) {
      data = await db.selectAllWhere(
        'fms_adv_net_cfg',
        `hwFingerprint="${hwFingerprint}"`
      );
    } else {
      data = await db.selectAll('fms_adv_net_cfg');
    }
    res.json(data);
  } catch (e) {
    res.json([]);
  }
});

// Update a specific config based on the hardware fingerprint
router.post(
  '/advancedNetworkingConfig',
  validateBody(isFMSSettings),
  async (req, res) => {
    const db = await getDB('global');
    try {
      await db.insertValue('fms_adv_net_cfg', [req.body]);
    } catch (e) {
      await db.updateWhere(
        'fms_adv_net_cfg',
        req.body,
        `hwFingerprint = '${req.body.hwFingerprint}'`
      );
    }
    res.json({ success: true });
  }
);

////////////////////// WPA Keys //////////////////////
router.get(
  '/:eventKey/wpakeys',
  async (req: Request, res: Response, next: NextFunction) => {
    const { eventKey } = req.params;
    const db = await getDB(eventKey);
    const keys = await db.selectAllWhere(
      WPAKeyDatabase,
      `eventKey = '${eventKey}'`
    );
    res.json(keys);
  }
);

// Regenerate ALL WPA Keys, returns all WPA Keys
router.post(
  '/:eventKey/wpakeys/generateAll',
  async (req: Request, res: Response, next: NextFunction) => {
    // The event key
    const { eventKey } = req.params;

    const db = await getDB(eventKey);

    // Get event teams
    const teams: Team[] = await db.selectAllWhere(
      'team',
      `eventKey = '${eventKey}'`
    );
    const wpaKeys: WPAKey[] = [];

    // Generate keys
    for (const team of teams) {
      wpaKeys.push({
        teamKey: team.teamKey,
        eventKey: team.eventKey,
        wpaKey: wpaKey()
      });
    }

    // Delete all existing keys
    await db.deleteWhere(WPAKeyDatabase, `eventKey = '${eventKey}'`);

    // Insert new keys
    await db.insertValue(WPAKeyDatabase, wpaKeys);

    // Return keys
    res.json(wpaKeys);
  }
);

// Generate only missing WPA Keys, returns ALL existing keys, including new ones
router.post(
  '/:eventKey/wpakeys/generateMissing',
  async (req: Request, res: Response, next: NextFunction) => {
    // The event key
    const { eventKey } = req.params;

    const db = await getDB(eventKey);

    // Get event teams
    const teams: Team[] = await db.selectAllWhere(
      'team',
      `eventKey = '${eventKey}'`
    );

    // Get existing WPA keys
    const existing: WPAKey[] = await db.selectAllWhere(
      WPAKeyDatabase,
      `eventKey = '${eventKey}'`
    );

    // Remove existing teams from teams array
    for (const exists of existing) {
      const existsIndex = teams.findIndex((t) => (t.teamKey = exists.teamKey));
      if (existsIndex > -1) {
        teams.splice(existsIndex, 1);
      }
    }

    const newWpaKeys: WPAKey[] = [];

    // Generate keys
    for (const team of teams) {
      newWpaKeys.push({
        teamKey: team.teamKey,
        eventKey: team.eventKey,
        wpaKey: wpaKey()
      });
    }

    // Insert new keys
    await db.insertValue(WPAKeyDatabase, newWpaKeys);

    // Get all keys
    const wpaKeys = await db.selectAllWhere(
      WPAKeyDatabase,
      `eventKey = '${eventKey}'`
    );

    // Return keys
    res.json(wpaKeys);
  }
);

export default router;
