import {supabase} from '../supabaseClient';
import { processQueuedMintingRequests } from './helpers';
import { addGovernanceLog } from './governancelogs';

export async function getMintingStatus() {
    const {data, error} = await supabase.from('CurrentSystemState').select('mintingStatus').eq('id', 1).single();
    if (error) {
        console.error('Error fetching minting status:', error);
        return null;
    }
    if (data.mintingStatus == 'Active') {
        return true;
    }
    return false;
}

export async function setMintingActive() {
    const {data, error} = await supabase.from('CurrentSystemState').update({mintingStatus: 'Active'}).eq('id', 1).select();
    if (error) {
        console.error('Error updating minting status to Active:', error);
        return null;
    }
    await processQueuedMintingRequests();
    await addGovernanceLog('Minting Activated', new Date().toISOString());

    return data;
}

export async function setMintingInactive() {
    const {data, error} = await supabase.from('CurrentSystemState').update({mintingStatus: 'Inactive'}).eq('id', 1).select();
    if (error) {
        console.error('Error updating minting status to Inactive:', error);
        return null;
    }
    await addGovernanceLog('Minting Deactivated', new Date().toISOString());
}

export async function getTransferStatus() {
    const {data, error} = await supabase.from('CurrentSystemState').select('transferStatus').eq('id', 1).single();
    if (error) {
        console.error('Error fetching transfer status:', error);
        return null;
    }
    if (data.transferStatus == 'Active') {
        return true;
    }
    return false;
}

export async function setTransferActive() {
    const {data, error} = await supabase.from('CurrentSystemState').update({transferStatus: 'Active'}).eq('id', 1).select();
    if (error) {
        console.error('Error updating transfer status to Active:', error);
        return null;
    }
    await addGovernanceLog('Transfer Activated', new Date().toISOString());

    return data;
}

export async function setTransferInactive() {
    const {data, error} = await supabase.from('CurrentSystemState').update({transferStatus: 'Inactive'}).eq('id', 1).select();
    if (error) {
        console.error('Error updating transfer status to Inactive:', error);
        return null;
    }
    await addGovernanceLog('Transfer Deactivated', new Date().toISOString());

    return data;
}

export async function setRetireActive() {
    const {data, error} = await supabase.from('CurrentSystemState').update({retireStatus: 'Active'}).eq('id', 1).select();
    if (error) {
        console.error('Error updating retire status to Active:', error);
        return null;
    }
    await addGovernanceLog('Retire Activated', new Date().toISOString());

    return data;
}

export async function setRetireInactive() {
    const {data, error} = await supabase.from('CurrentSystemState').update({retireStatus: 'Inactive'}).eq('id', 1).select();
    if (error) {
        console.error('Error updating retire status to Inactive:', error);
        return null;
    }
    await addGovernanceLog('Retire Deactivated', new Date().toISOString());

    return data;
}

export async function getRetireStatus() {
    const {data, error} = await supabase.from('CurrentSystemState').select('retireStatus').eq('id', 1).single();
    if (error) {
        console.error('Error fetching retire status:', error);
        return null;
    }
    if (data.retireStatus == 'Active') {
        return true;
    }
    return false;
}