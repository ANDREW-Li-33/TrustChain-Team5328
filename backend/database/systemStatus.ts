import {supabase} from '../supabaseClient';
import { processQueuedMintingRequests } from './helpers';

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

    return data;
}

export async function setMintingInactive() {
    const {data, error} = await supabase.from('CurrentSystemState').update({mintingStatus: 'Inactive'}).eq('id', 1).select();
    if (error) {
        console.error('Error updating minting status to Inactive:', error);
        return null;
    }
    return data;
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

export async function setTransferStatus(isActive: boolean) {
    const newStatus = isActive ? 'Active' : 'Inactive';
    const {data, error} = await supabase.from('CurrentSystemState').update({transferStatus: newStatus}).eq('id', 1).select();
    if (error) {
        console.error('Error updating transfer status:', error);
        return null;
    }
    return data;
}

export async function setRetireStatus(isActive: boolean) {
    const newStatus = isActive ? 'Active' : 'Inactive';
    const {data, error} = await supabase.from('CurrentSystemState').update({retireStatus: newStatus}).eq('id', 1).select();
    if (error) {
        console.error('Error updating retire status:', error);
        return null;
    }
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