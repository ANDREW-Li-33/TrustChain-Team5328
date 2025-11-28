import {supabase} from '../supabaseClient';

export async function getGovernanceLogs() {
    const {data, error} = await supabase.from('GovernanceLogs').select('*').order('Timestamp', {ascending: false});
    if (error) {
        console.error('Error fetching governance logs:', error);
        return null;
    }
    return data;
}

export async function addGovernanceLog(Action: string, Timestamp: string) {
    const {data, error} = await supabase.from('GovernanceLogs').insert([
        {
            Action: Action,
            Timestamp: Timestamp,
        }
    ]).select();
    if (error) {
        console.error('Error adding governance log:', error);
        return null;
    }
    return data;
}