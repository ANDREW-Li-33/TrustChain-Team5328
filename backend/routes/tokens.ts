import express from 'express';
import { addToken, getTokens, getTokenByID, getTokensByOwnerID, updateOwnerOfToken, getTokensGroupedByOwner, updateTokenStatus} from '../database/tokens';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { ownerID, jobID, quality, status, mintedAt, retiredAt, metadata, blockchainHash, creditProportion, tokenHash } = req.body;

        // Basic validation
        if (!ownerID || !jobID || !quality || !metadata) {
         return res.status(400).json({ error: "Missing required fields, error 1 in routes/tokens.ts" });
        }

        const newToken = await addToken({
            ownerID,
            jobID,
            quality,
            status,
            mintedAt,
            retiredAt,
            metadata,
            blockchainHash,
            creditProportion,
            tokenHash
        });

        if (!newToken) {
            return res.status(500).json({ error: "Failed to insert user, error 2 in routes/tokens.ts" });
        }

        res.status(201).json({ message: "User added successfully", data: newToken });
    } catch (error) {
        console.error("Error in routes/tokens.ts, error is: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/', async (req, res) => {
  const tokens = await getTokens();
  if (!tokens) {
    return res.status(500).json({ error: 'Failed to fetch tokens' });
  }
  res.status(200).json(tokens);
});

router.get('/:id', async (req, res) => {
  const token = await getTokenByID(Number(req.params.id));
  if (!token) {
    return res.status(404).json({ error: 'Token not found' });
  }
  res.status(200).json(token);
});

router.get('/owner/:ownerID', async (req, res) => {
  const tokens = await getTokensByOwnerID(Number(req.params.ownerID));
  if (!tokens) {
    return res.status(404).json({ error: 'No tokens found for this owner' });
  }
  res.status(200).json(tokens);
});

router.get('/grouped/:ownerID', async (req, res) => {
  const { ownerID } = req.params;
  try {
    const grouped = await getTokensGroupedByOwner(Number(ownerID));
    if (!grouped || grouped.length === 0) {
      return res.status(404).json([]);
    }
    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch grouped tokens' });
  }
});



router.patch('/:id/status', async (req, res) => {
  try {
    const tokenID = Number(req.params.id);
    const { newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({ error: 'Missing newStatus field' });
    }

    const updatedToken = await updateTokenStatus(tokenID, newStatus);
    if (!updatedToken) {
      return res.status(500).json({ error: 'Failed to update token status' });
    }

    res.status(200).json({ message: 'Token status updated', data: updatedToken });
  } catch (error) {
    console.error('Error in PATCH /tokens/:id/status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/owner', async (req, res) => {
  try {
    const tokenID = Number(req.params.id);
    const { newOwnerID } = req.body;

    if (!newOwnerID) {
      return res.status(400).json({ error: 'Missing newOwnerID field' });
    }

    const updatedToken = await updateOwnerOfToken(tokenID, newOwnerID);
    if (!updatedToken) {
      return res.status(500).json({ error: 'Failed to update token owner' });
    }

    res.status(200).json({ message: 'Token ownership updated', data: updatedToken });
  } catch (error) {
    console.error('Error in PATCH /tokens/:id/owner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;