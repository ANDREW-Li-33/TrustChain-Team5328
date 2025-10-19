import express from 'express';
import { addTelemetryData, getTelemetryData, getTelemetryDataByJobID, approveTelemetryData } from '../database/telemetrydata';
import { getJobByID } from '../database/jobs';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { jobID, Approved, timeUploaded, metadata } = req.body;

        // Basic validation
        if (!jobID || !metadata) {
         return res.status(400).json({ error: "Missing required fields, error 1 in routes/telemetrydata.ts" });
        }

        // Check if the job exists and its status
        const job = await getJobByID(jobID);
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        // Prevent uploads to minted jobs
        if (job.status === 'Minted') {
            return res.status(403).json({ 
                error: "Cannot upload telemetry data to a minted job. The job has already been verified and minted as a carbon credit." 
            });
        }

        // Prevent uploads to completed jobs
        if (job.status === 'Completed') {
            return res.status(403).json({ 
                error: "Cannot upload telemetry data to a completed job. Please set the job to Active status first." 
            });
        }

        const newData = await addTelemetryData({
            jobID,
            Approved,
            timeUploaded,
            metadata,
        });

        if (!newData) {
            return res.status(500).json({ error: "Failed to insert Telemetry Data, error 2 in routes/telemetrydata.ts" });
        }

        res.status(201).json({ message: "Telemetry Data added successfully", data: newData });
    } catch (error) {
        console.error("Error in routes/telemetrydata.ts, error is: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/', async (req, res) => {
    const data = await getTelemetryData();
    if (!data) {
        return res.status(500).json({ error: "Failed to fetch telemetry data" });
    }
    res.status(200).json(data);
});

router.get('/job/:jobID', async (req, res) => {
    const data = await getTelemetryDataByJobID(Number(req.params.jobID));
    if (!data) {
        return res.status(404).json({ error: "Telemetry Data not found for this job" });
    }
    res.status(200).json(data);
});

router.put('/:id/approve', async (req, res) => {
    const updatedData = await approveTelemetryData(Number(req.params.id));
    if (!updatedData) {
        return res.status(500).json({ error: "Failed to update telemetry data approval status" });
    }
    res.status(200).json({ message: "Telemetry data approval status updated successfully", data: updatedData });
});

export default router;