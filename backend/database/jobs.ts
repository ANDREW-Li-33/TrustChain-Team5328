import { supabase } from '../supabaseClient.js';

export type JobStatus = 'Active' | 'Completed' | 'Paused' | 'Ready for Minting' | 'Denied' | 'Minted'

export async function addJob(job: {
  operatorID: number;
  toolID: number;
  status: JobStatus;
  dateCreated?: string;
  jobTitle?: string;
}) {
  const { data, error } = await supabase
    .from('Jobs')
    .insert([
      {
        operatorID: job.operatorID,
        toolID: job.toolID,
        status: job.status || 'Active',
        dateCreated: job.dateCreated || new Date().toISOString(),
        jobTitle: job.jobTitle || 'Untitled Job',
      },
    ])
    .select();

  if (error) {
    console.error('Error inserting Job:', error);
    return null;
  }

  console.log('Inserted Job:', data);
  return data;
}

export async function getJobs() {
  const { data, error } = await supabase.from('Jobs').select('*');
  if (error) {
    console.error('Error fetching jobs:', error);
    return null;
  }
  return data;
}

export async function getJobByID(id: number) {
  const { data, error } = await supabase.from('Jobs').select('*').eq('jobID', id).single();
  if (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
  return data;
}

export async function getJobsByOperatorID(operatorID: number) {
    const { data, error } = await supabase.from('Jobs').select('*').eq('operatorID', operatorID);
    if (error) {
        console.error('Error fetching jobs by operator ID:', error);
        return null;
    }
    return data;
}

export async function updateJobStatus(jobID: number, newStatus: JobStatus) {
    const { data, error } = await supabase
      .from('Jobs')
      .update({ status: newStatus })
      .eq('jobID', jobID)
      .select();
    if (error) {
        console.error('Error updating job status:', error);
        return null;
    }
    return data;
}

async function testConnection() {
  const { data, error } = await supabase.from('Jobs').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Supabase Job Data:', data);
  }
}
