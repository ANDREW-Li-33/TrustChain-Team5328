import { supabase } from '../supabaseClient.js';

export async function addTelemetryData(newData: {
  jobID: number;
  Approved: boolean;
  timeUploaded?: string;
  metadata: JSON;
}) {
  const { data, error } = await supabase
    .from('TelemetryData')
    .insert([
      {
        jobID: newData.jobID,
        Approved: newData.Approved || false,
        timeUploaded: newData.timeUploaded || new Date().toISOString(), // defaults to current time
        metadata: newData.metadata,
      },
    ])
    .select(); // return the inserted row(s)

  if (error) {
    console.error('Error inserting Telemetry Data:', error);
    return null;
  }

  console.log('Inserted Telemetry Data:', data);
  return data;
}

export async function getTelemetryData() {
    const { data, error } = await supabase.from('TelemetryData').select('*');
    if (error) {
        console.error('Error fetching telemetry data:', error);
        return null;
    }
    return data;
}

export async function getTelemetryDataByJobID(jobID: number) {
    const { data, error } = await supabase.from('TelemetryData').select(`*, Jobs ( jobTitle )`).eq('jobID', jobID);
    if (error) {
        console.error('Error fetching telemetry data by job ID:', error);
        return null;
    }
    return data;
}

export async function approveTelemetryData(entryID: number) {
    const { data, error } = await supabase.from('TelemetryData').update({ Approved: true }).eq('entryID', entryID).select();
    if (error) {
        console.error('Error approving telemetry data:', error);
        return null;
    }  
}

async function testConnection() {
  const { data, error } = await supabase.from('TelemetryData').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Supabase Telemetry Data:', data);
  }
}

testConnection();