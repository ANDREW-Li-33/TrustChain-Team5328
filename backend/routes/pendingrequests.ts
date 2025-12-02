import express from 'express';
import { addRequest, getRequests, addSavedQuality, getRequestByJobID, getOneRequest, getRequestsByOperatorID, deleteRequest, updateRequestStatus } from '../database/pendingrequests';
import { updateJobStatus, getJobByID } from '../database/jobs';
import { processMintingRequest, queueRequestForMinting } from '../database/helpers';
import { getMintingStatus } from '../database/systemStatus';
import { setMintingActive } from '../database/systemStatus';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { operatorID, jobID, status, requestTimestamp, verificationTimestamp } = req.body;

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

// Helper function to calculate CO2 savings from telemetry data
function calculateCO2Savings(telemetryData: any[]): number {
    // Simple calculation - in production this would use the MRV engine
    // For now, we'll estimate based on power consumption
    const emissionFactor = 0.00025; // tCO2e per kWh
    
    let totalSavings = 0;
    for (const data of telemetryData) {
        const metadata = data.metadata;
        if (metadata?.measurements) {
            const powerKw = metadata.measurements.power_kw || 0;
            const runtimeHours = (metadata.measurements.runtime_sec || 0) / 3600;
            const energyUsed = powerKw * runtimeHours;
            const CO2TonsSaved = metadata.measurements.TotalCO2Saved;
            totalSavings = Math.max(CO2TonsSaved, totalSavings);
        }
    }
    console.log("Total CO2 Saved is: ", totalSavings);
    
    return Math.round(totalSavings * 1000) / 1000; // Round to 3 decimals
}

// Update to mint job when verification is complete AND create token
router.put('/:id/status', async (req, res) => {
  try {
    const { status, verificationTimestamp, quality, denialReason } = req.body;
    const requestID = Number(req.params.id);

    if (!status) return res.status(400).json({ error: "Status is required" });

    const updatedRequests = await updateRequestStatus(requestID, status, verificationTimestamp, denialReason);
    if (!updatedRequests || updatedRequests.length === 0) {
      // Check if this might be a database schema issue
      if (status === 'Denied' && denialReason) {
        return res.status(500).json({ 
          error: "Failed to update request. The denialReason column may not exist in the database.",
          details: "Please run the migration SQL: ALTER TABLE \"PendingRequests\" ADD COLUMN IF NOT EXISTS \"denialReason\" TEXT;",
          migrationFile: "backend/migrations/add_denial_reason_to_pending_requests.sql"
        });
      }
      return res.status(500).json({ error: "Failed to update request" });
    }
    const updatedRequest = Array.isArray(updatedRequests) ? updatedRequests[0] : updatedRequests;

    if (status === 'Approved') {
      const mintingActive = await getMintingStatus();

      if (!mintingActive) {
        await queueRequestForMinting(requestID, quality, verificationTimestamp);
        return res.status(200).json({
          message: "Minting is paused. Request queued for automatic processing.",
          data: updatedRequest,
        });
      }

      await processMintingRequest(requestID, verificationTimestamp, quality);
    }

    if (status === 'Denied') await updateJobStatus(updatedRequest.jobID, 'Denied');

    res.status(200).json({ message: "Request updated successfully", data: updatedRequest });

  } catch (error: any) {
    console.error("Error in PUT /pendingrequests/:id/status:", error);
    // Provide more specific error message if it's a database schema issue
    if (error.message && (error.message.includes("denialReason") || error.message.includes("column") || error.message.includes("does not exist"))) {
      return res.status(500).json({ 
        error: "Database schema error: denialReason column not found",
        details: "Please run the migration SQL in your Supabase dashboard",
        sql: "ALTER TABLE \"PendingRequests\" ADD COLUMN IF NOT EXISTS \"denialReason\" TEXT;"
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/test/processQueue', async (req, res) => {
  try {
    await setMintingActive();
    res.status(200).json({ message: "Minting activated for testing." });
  } catch (error) {
    console.error("Error in POST /pendingrequests/test/processQueue:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;