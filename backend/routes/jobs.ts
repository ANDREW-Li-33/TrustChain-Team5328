import express from 'express';
import { addJob, getJobs, getJobByID, getJobsByOperatorID, updateJobStatus, JobStatus } from '../database/jobs';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { operatorID, toolID, status, dateCreated, jobTitle } = req.body;

        // Basic validation
        if (!operatorID || !toolID || !status || !jobTitle) {
         return res.status(400).json({ error: "Missing required fields, error 1 in routes/jobs.ts" });
        }

        const newJob = await addJob({
            operatorID,
            toolID,
            status: status as JobStatus,
            dateCreated,
            jobTitle,
        });

        if (!newJob) {
            return res.status(500).json({ error: "Failed to insert job, error 2 in routes/jobs.ts" });
        }

        res.status(201).json({ message: "Job added successfully", data: newJob });
    } catch (error) {
        console.error("Error in routes/jobs.ts, error is: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.get('/', async (req, res) => {
    const jobs = await getJobs();
    if (!jobs) {
        return res.status(500).json({ error: "Failed to fetch jobs" });
    }
    res.status(200).json(jobs);
});

router.get('/:id', async (req, res) => {
    const job = await getJobByID(Number(req.params.id));
    if (!job) {
        return res.status(404).json({ error: "Job not found" });
    }
    res.status(200).json(job);
});

router.get('/operator/:operatorID', async (req, res) => {
    const jobs = await getJobsByOperatorID(Number(req.params.operatorID));
    if (!jobs) {
        return res.status(404).json({ error: "No jobs found for this operator" });
    }
    res.status(200).json(jobs);
});

router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    
    if (!status) {
        return res.status(400).json({ error: "Status is required" });
    }

    // Validate status value
    const validStatuses: JobStatus[] = ['Active', 'Completed', 'Paused', 'Ready for Minting', 'Denied', 'Minted'];
    if (!validStatuses.includes(status as JobStatus)) {
        return res.status(400).json({ error: "Invalid status value" });
    }

    const updatedJob = await updateJobStatus(Number(req.params.id), status as JobStatus);
    if (!updatedJob) {
        return res.status(500).json({ error: "Failed to update job status" });
    }
    res.status(200).json({ message: "Job status updated successfully", data: updatedJob });
});

export default router;