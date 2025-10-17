import { supabase } from '../supabaseClient.js';

export async function addJob(job: {
  operatorID: number;
  toolID: number;
  status: 'Active' | 'Completed' | 'Paused';
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
        dateCreated: job.dateCreated || new Date().toISOString(), // defaults to current time
        jobTitle: job.jobTitle || 'Untitled Job',
      },
    ])
    .select(); // return the inserted row(s)

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

export async function updateJobStatus(jobID: number, newStatus: 'Active' | 'Completed' | 'Paused') {
    const { data, error } = await supabase.from('Jobs').update({ status: newStatus }).eq('jobID', jobID).select();
    if (error) {
        console.error('Error updating job status:', error);
        return null;
    }
}

async function testConnection() {
  const { data, error } = await supabase.from('Jobs').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Supabase Job Data:', data);
  }
}

testConnection();