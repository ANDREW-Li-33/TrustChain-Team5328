import express from 'express';
import { addToken, getTokens, getTokenByID, getTokensByOwnerID, updateOwnerOfToken, getTokensGroupedByOwner, updateTokenStatus, retireToken} from '../database/tokens';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { ownerID, jobID, quality, status, mintedAt, retiredAt, metadata, mintingHash, creditProportion, tokenHash } = req.body;

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
            mintingHash,
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


router.post('/retire', async (req, res) => {
  try {
    const { tokenIDs, ownerID } = req.body;

    if (!tokenIDs || !Array.isArray(tokenIDs) || tokenIDs.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid tokenIDs array' });
    }

    if (!ownerID) {
      return res.status(400).json({ error: 'Missing ownerID field' });
    }

    const results = [];
    const errors = [];

    for (const tokenID of tokenIDs) {
      const token = await getTokenByID(tokenID);
      
      if (!token) {
        errors.push({ tokenID, error: 'Token not found' });
        continue;
      }

      if (token.ownerID !== ownerID) {
        errors.push({ tokenID, error: 'Token does not belong to this owner' });
        continue;
      }

      if (token.status === 'Retired') {
        errors.push({ tokenID, error: 'Token is already retired' });
        continue;
      }

      if (token.status === 'On The Marketplace') {
        errors.push({ tokenID, error: 'Cannot retire token that is on the marketplace' });
        continue;
      }

      const retiredToken = await retireToken(tokenID, ownerID);
      if (retiredToken) {
        results.push({ tokenID, success: true, data: retiredToken });
      } else {
        errors.push({ tokenID, error: 'Failed to retire token' });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return res.status(400).json({ 
        error: 'Failed to retire any tokens', 
        details: errors 
      });
    }

    res.status(200).json({ 
      message: `Successfully retired ${results.length} token(s)`,
      retired: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in POST /tokens/retire:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;