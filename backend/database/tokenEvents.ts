import { supabase } from '../supabaseClient.js';

export async function getTokensFullHistory(tokenID: number) {
    const { data, error } = await supabase.from('tokenEvents').select('*').eq('tokenID', tokenID).order('createdAt', { ascending: true });
    if (error) {
        console.error('Error fetching token full history:', error);
        return null;
    }
    return data;
}

export async function getUserTokenEvents(userID: number) {
    const { data, error } = await supabase.from('tokenEvents').select('*').eq('userID', userID).order('createdAt', { ascending: false });
    if (error) {
        console.error('Error fetching user token events:', error);
        return null;
    }
    return data;
}

export async function mintTokenEvent(userID: number, tokenID: number, hashInformationConfirmation: string) {
    const { data, error } = await supabase.from('tokenEvents').insert([
        {
            createdAt: new Date().toISOString(),
            eventType: 'Minting',
            firstOwner: userID,
            newOwner: null,
            tokenID: tokenID,
            listingID: null,
            hashInformationConfirmation: hashInformationConfirmation,
        }
    ]).select();
    if (error) {
        console.error('Error minting token event:', error);
        return null;
    }
    return data;
}

export async function transferTokenEvent(oldOwner: number, newOwner: number, tokenID: number, listingID: number, hashInformationConfirmation: string) {
    const { data, error } = await supabase.from('tokenEvents').insert([
        {
            createdAt: new Date().toISOString(),
            eventType: 'Transfer',
            firstOwner: oldOwner,
            newOwner: newOwner,
            tokenID: tokenID,
            listingID: listingID,
            hashInformationConfirmation: hashInformationConfirmation,
        }
    ]).select();
    if (error) {
        console.error('Error transferring token event:', error);
        return null;
    }
    return data;
}

export async function retireTokenEvent(userID: number, tokenID: number, hashInformationConfirmation: string) {
    const { data, error } = await supabase.from('tokenEvents').insert([
        {
            createdAt: new Date().toISOString(),
            eventType: 'Retirement',
            firstOwner: userID,
            newOwner: null,
            tokenID: tokenID,
            listingID: null,
            hashInformationConfirmation: hashInformationConfirmation,
        }
    ]).select();
    if (error) {
        console.error('Error retiring token event:', error);
        return null;
    }
    return data;
}