import { supabase} from '../supabaseClient';
import { getOneRequest, updateRequestStatus, getSavedQuality, getPendingRequestsOnHold } from './pendingrequests';
import { updateJobStatus, getJobByID } from './jobs';
import { getTelemetryDataByJobID } from './telemetrydata';
import { addToken } from './tokens';
import { recordTokenOnChain } from '../blockchain/blockchain';
import { mintTokenEvent } from './tokenEvents';
import { addSavedQuality } from './pendingrequests';

export async function processMintingRequest(requestID: number, verificationTimestamp: string, quality: number) {
  console.log(`\n=== Processing minting for request ${requestID} ===`);

  const request = await getOneRequest(requestID);
  if (!request) throw new Error("Request not found");

  const jobUpdate = await updateJobStatus(request.jobID, 'Ready for Minting');
  if (!jobUpdate) throw new Error("Failed to update job status");

  const job = await getJobByID(request.jobID);
  if (!job) throw new Error("Failed to fetch job details");

  const telemetryData = await getTelemetryDataByJobID(request.jobID);

  const co2Saved = calculateCO2Savings(telemetryData || []);

  const tokenMetadata = {
    jobID: request.jobID,
    jobTitle: job.jobTitle || 'Untitled Job',
    toolID: job.toolID,
    verificationDate: verificationTimestamp || new Date().toISOString(),
    co2Saved: co2Saved,
    telemetryRecords: telemetryData?.length || 0,
    evidenceHash: `hash_${request.jobID}_${Date.now()}`,
  };

  await updateJobStatus(request.jobID, 'Minted');

  const numTokens = Math.floor(co2Saved);
  const fractionalToken = co2Saved - numTokens;

  for (let i = 0; i < numTokens; i++) {
    const tokenHash = `${request.jobID}_${request.operatorID}_${i}`;
    const blockchainHash = await recordTokenOnChain(tokenHash);

    const insertedToken = await addToken({
      ownerID: job.operatorID,
      jobID: request.jobID,
      quality,
      status: 'Minted',
      mintedAt: new Date().toISOString(),
      retiredAt: null,
      metadata: tokenMetadata as unknown as JSON,
      mintingHash: blockchainHash,
      creditProportion: 1,
      tokenHash,
    });

    const tokenID = insertedToken?.[0]?.tokenID;
    await mintTokenEvent(job.operatorID, tokenID, blockchainHash || '');
  }

  if (fractionalToken > 0) {
    const tokenHash = `${request.jobID}_${request.operatorID}_${numTokens}`;
    await addToken({
      ownerID: job.operatorID,
      jobID: request.jobID,
      quality,
      status: 'Minted',
      mintedAt: new Date().toISOString(),
      retiredAt: null,
      metadata: tokenMetadata as unknown as JSON,
      mintingHash: await recordTokenOnChain(tokenHash),
      creditProportion: fractionalToken,
      tokenHash,
    });
  }

  return true;
}

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

export async function queueRequestForMinting(requestID: number, quality: number, verificationTimestamp: string) {
  await updateRequestStatus(requestID, 'On Hold', verificationTimestamp);
  await addSavedQuality(requestID, quality);
}

export async function processQueuedMintingRequests() {
  const pendingRequests = await getPendingRequestsOnHold();

  if (!pendingRequests || pendingRequests.length === 0) {
    console.log("No queued minting requests found.");
    return;
  }

  console.log(`Found ${pendingRequests.length} queued minting requests`);

  for (const req of pendingRequests) {
    // Defensive: ensure we have a valid requestID
    const requestID = req.requestID;
    if (!requestID) {
      console.warn("Skipping request with missing requestID:", req);
      continue;
    }

    console.log(`\n--> Processing request ${requestID} for job ${req.jobID}`);

    try {
      // Retrieve saved quality if it was stored
      const savedQuality = await getSavedQuality(requestID);

      // Determine quality value to use
      const quality = savedQuality ?? req.quality ?? 50;

      // Use verification timestamp if available, else now
      const verificationTimestamp = req.verificationTimestamp ?? new Date().toISOString();

      // Call the main minting function
      await processMintingRequest(requestID, verificationTimestamp, quality);

      // Update request status to Approved
      await updateRequestStatus(requestID, "Approved", verificationTimestamp);

      console.log(`✓ Successfully reprocessed request ${requestID}`);
    } catch (err) {
      console.error(`❌ Error processing request ${requestID}`, err);
      // Optional: mark as failed, retry later, or leave on hold
    }
  }

  console.log("\n=== Finished processing queued minting requests ===");
}


