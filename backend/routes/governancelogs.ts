import express from 'express';
import { getGovernanceLogs, addGovernanceLog } from '../database/governancelogs';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const logs = await getGovernanceLogs();
    if (logs === null) {
      res.status(500).json({ error: 'Failed to fetch governance logs' });
      return;
    }
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching governance logs:', error);
    res.status(500).json({ error: 'Failed to fetch governance logs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { action, timestamp } = req.body;

    if (!action) {
      res.status(400).json({ error: 'Action is required' });
      return;
    }

    const logTimestamp = timestamp || new Date().toISOString();
    const result = await addGovernanceLog(action, logTimestamp);

    if (result === null) {
      res.status(500).json({ error: 'Failed to add governance log' });
      return;
    }

    res.status(201).json({ message: 'Governance log added successfully', data: result });
  } catch (error) {
    console.error('Error adding governance log:', error);
    res.status(500).json({ error: 'Failed to add governance log' });
  }
});

export default router;