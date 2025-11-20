import express from 'express';
import { addRequest, getRequests, getRequestByJobID, getOneRequest, getRequestsByOperatorID, deleteRequest, updateRequestStatus } from '../database/pendingrequests';
import { updateJobStatus, getJobByID } from '../database/jobs';
import { addToken } from '../database/tokens';
import { getTelemetryDataByJobID } from '../database/telemetrydata';
import { recordTokenOnChain } from '../blockchain/blockchain';

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

// Helper function to calculate quality score (0-100)
function calculateQualityScore(telemetryData: any[]): number {
    // Quality based on data completeness and consistency
    if (telemetryData.length === 0) return 50; // Default if no data
    
    let score = 100;
    
    // Deduct points for missing data
    const completeRecords = telemetryData.filter(d => 
        d.metadata?.measurements?.power_kw && 
        d.metadata?.measurements?.runtime_sec
    );
    const completenessRatio = completeRecords.length / telemetryData.length;
    score = score * completenessRatio;
    
    // Bonus for more data points
    if (telemetryData.length >= 5) score = Math.min(100, score + 5);
    if (telemetryData.length >= 10) score = Math.min(100, score + 5);
    
    return Math.round(score);
}

// Update to mint job when verification is complete AND create token
router.put('/:id/status', async (req, res) => {
    try {
      const { status, verificationTimestamp, quality } = req.body;

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
        console.error(`Failed to update request ${req.params.id} with status ${status}`);
        return res.status(500).json({ 
          error: "Failed to update request status. Please check server logs for details."
        });
      }

      // If status is Complete, update the job status to Minted AND create token

        if (status === 'Approved') {
            console.log(`\n=== Processing verification approval for job ${request.jobID} ===`);
            
            // 1. Update job status to Ready for Minting
            console.log(`Step 1: Setting job ${request.jobID} to 'Ready for Minting'...`);
    const jobUpdate = await updateJobStatus(request.jobID, 'Ready for Minting');
            if (!jobUpdate) {
              console.error("Failed to update job status to Ready for Minting");
    return res.status(500).json({ error: "Failed to update job" });
            }
            console.log(`Job ${request.jobID} successfully set to 'Ready for Minting'`);
        // 2. Get job details to find the owner
        console.log(`Step 2: Fetching job details...`);
        const job = await getJobByID(request.jobID);
        if (!job) {
          console.error("Failed to fetch job details");
          return res.status(500).json({ error: "Failed to fetch job details" });
        }
        console.log(`Job details retrieved - Owner: ${job.operatorID}, Tool: ${job.toolID}`);

        // 3. Get telemetry data for metadata
        console.log(`Step 3: Fetching telemetry data...`);
        const telemetryData = await getTelemetryDataByJobID(request.jobID);
        if (!telemetryData || telemetryData.length === 0) {
          console.warn("No telemetry data found for this job");
        } else {
          console.log(`Retrieved ${telemetryData.length} telemetry records`);
        }

        // 4. Calculate CO2 savings and quality
        console.log(`Step 4: Calculating CO2 savings and quality score...`);
        const co2Saved = calculateCO2Savings(telemetryData || []);
        console.log(`CO2 Saved: ${co2Saved} tCO2e, Quality Score: ${quality}/100`);

        // 5. Create token metadata
        const tokenMetadata = {
          jobID: request.jobID,
          jobTitle: job.jobTitle || 'Untitled Job',
          toolID: job.toolID,
          verificationDate: verificationTimestamp || new Date().toISOString(),
          co2Saved: co2Saved,
          telemetryRecords: telemetryData?.length || 0,
          evidenceHash: `hash_${request.jobID}_${Date.now()}`, // In production, this would be a real hash
        };

        // 6. Create token record
        console.log(`Step 5: Creating token records...`);
        await updateJobStatus(request.jobID, 'Minted');
        const numTokens = Math.floor(co2Saved); // Ensure integer tokens
        const fractionalToken = co2Saved - numTokens;
        console.log("co2Saved:", co2Saved, "typeof:", typeof co2Saved);
        console.log("numTokens:", numTokens, "fractionalToken:", fractionalToken);
        if (numTokens <= 0) {
          console.warn("CO2 savings is 0 or invalid — skipping token creation");
        }
        for (let i = 0; i < numTokens; i++) {
          const tokenHash = `${request.jobID}_${request.operatorID}_${i}`;

          const blockchainTokenHash = await recordTokenOnChain(tokenHash);
          console.log("Blockchain token hash received in pendingrequests.ts: ", blockchainTokenHash);
          
          addToken({
            ownerID: job.operatorID,
            jobID: request.jobID,
            quality: quality,
            status: 'Minted',
            mintedAt: new Date().toISOString(),
            retiredAt: null,
            metadata: tokenMetadata as unknown as JSON,
            mintingHash: blockchainTokenHash,
            creditProportion: 1,
            tokenHash: tokenHash,
          })
        }
        if (fractionalToken > 0) {
          const tokenHash = `${request.jobID}_${request.operatorID}_${numTokens}`;
          const blockchainTokenHash = await recordTokenOnChain(tokenHash);
          console.log("Blockchain token hash received in pendingrequests.ts: ", blockchainTokenHash);
          addToken({
            ownerID: job.operatorID,
            jobID: request.jobID,
            quality: quality,
            status: 'Minted',
            mintedAt: new Date().toISOString(),
            retiredAt: null,
            metadata: tokenMetadata as unknown as JSON,
            mintingHash: blockchainTokenHash,
            creditProportion: fractionalToken,
            tokenHash: tokenHash,
          })
        }

      } else if (status === 'Denied') {
        // 1. Update job status to Denied
        console.log(`Step 1: Setting job ${request.jobID} to 'Denied'...`);
        const jobUpdate = await updateJobStatus(request.jobID, 'Denied');
        if (!jobUpdate) {
          console.error("Failed to update job status to Denied");
          return res.status(500).json({ error: "Failed to update job" });
        }
        console.log(`Job ${request.jobID} successfully set to 'Denied'`);
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