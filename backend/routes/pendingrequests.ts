import express from 'express';
import { addRequest, getRequests, getRequestByJobID, getOneRequest, getRequestsByOperatorID, deleteRequest, updateRequestStatus } from '../database/pendingrequests';
import { updateJobStatus } from '../database/jobs';

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
            return res.status(500).json({ error: "Failed to insert request, error 2 in routes/pendingrequests.ts" });
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

router.get('/job/:jobID', async (req, res) => {
    const requests = await getRequestByJobID(Number(req.params.jobID));
    if (!requests) {
        return res.status(404).json({ error: "No requests found for this job" });
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

// Update to mint job when verification is complete
router.put('/:id/status', async (req, res) => {
    try {
      const { status, verificationTimestamp } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      // Get the request to find the associated jobID
      const request = await getOneRequest(Number(req.params.id));
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      const updatedRequest = await updateRequestStatus(
        Number(req.params.id), 
        status,
        verificationTimestamp
      );
      
      if (!updatedRequest) {
        return res.status(500).json({ error: "Failed to update request status" });
      }

      // If status is Complete, update the job status to Minted
      if (status === 'Complete') {
        console.log(`Minting job ${request.jobID} after verification approval`);
        const jobUpdate = await updateJobStatus(request.jobID, 'Minted');
        if (!jobUpdate) {
          console.error("Failed to update job status to Minted");
          // Continue anyway as the request was updated successfully
        } else {
          console.log(`Job ${request.jobID} successfully minted`);
        }
      }
      
      res.status(200).json({ 
        message: "Request status updated successfully", 
        data: updatedRequest 
      });
    } catch (error) {
      console.error("Error in PUT /pendingrequests/:id/status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
});

export default router;