import express from 'express';
import { addRequest, getRequests, getOneRequest, getRequestsByOperatorID, deleteRequest } from '../database/pendingrequests';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { operatorID, jobID, status, requestTimestamp, verificationTimestamp } = req.body;

        // Basic validation
        if (!operatorID || !jobID || !status) {
         return res.status(400).json({ error: "Missing required fields, error 1 in routes/pendingrequests.ts" });
        }

        const newRequest = await addRequest({
            operatorID,
            jobID,
            status,
            requestTimestamp,
            verificationTimestamp
        });

        if (!newRequest) {
            return res.status(500).json({ error: "Failed to insert user, error 2 in routes/pendingrequests.ts" });
        }

        res.status(201).json({ message: "Request added successfully", data: newRequest });
    } catch (error) {
        console.error("Error in routes/pendingrequests.ts, error is: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/', async (req, res) => {
    const requests = await getRequests();
    if (!requests) {
        return res.status(500).json({ error: "Failed to fetch requests" });
    }
    res.status(200).json(requests);
});

router.get('/:id', async (req, res) => {
    const request = await getOneRequest(Number(req.params.id));
    if (!request) {
        return res.status(404).json({ error: "Request not found" });
    }
    res.status(200).json(request);
});

router.get('/operator/:operatorID', async (req, res) => {
    const requests = await getRequestsByOperatorID(Number(req.params.operatorID));
    if (!requests) {
        return res.status(404).json({ error: "No requests found for this operator" });
    }
    res.status(200).json(requests);
});

router.delete('/:id', async (req, res) => {
    const deletedRequest = await deleteRequest(Number(req.params.id));
    if (!deletedRequest) {
        return res.status(500).json({ error: "Failed to delete request" });
    }
    res.status(200).json({ message: "Request deleted successfully", data: deletedRequest });
});


export default router;