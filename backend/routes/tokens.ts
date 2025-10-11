import express from 'express';
import { addToken} from '../database/tokens';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { ownerID, jobID, quality, status, mintedAt, retiredAt, metadata, blockchainHash } = req.body;

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
            blockchainHash
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

export default router;