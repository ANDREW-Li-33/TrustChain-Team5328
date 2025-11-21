import express from 'express';
import { getTokensFullHistory, getUserTokenEvents } from '../database/tokenEvents';

const router = express.Router();

router.get('/token/:tokenID', async (req, res) => {
    const tokenHistoryInformation = await getTokensFullHistory(Number(req.params.tokenID));
    if (!tokenHistoryInformation) {
        return res.status(500).json({ error: 'Failed to fetch token full history' });
    }
    res.json(tokenHistoryInformation);
});

router.get('/user/:userID', async (req, res) => {
    const userTokenEvents = await getUserTokenEvents(Number(req.params.userID));
    if (!userTokenEvents) {
        return res.status(500).json({ error: 'Failed to fetch user token events' });
    }
    res.json(userTokenEvents);
});

export default router;