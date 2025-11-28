import { supabase } from '../supabaseClient.js';
import { getUserRole } from './users';

export async function getTokensFullHistory(tokenID: number) {
    const { data, error } = await supabase.from('tokenEvents').select('*').eq('tokenID', tokenID).order('createdAt', { ascending: true });
    if (error) {
        console.error('Error fetching token full history:', error);
        return null;
    }
    return data;
}

export async function getUserHistory(userID: number) {
    const role = await getUserRole(userID);
    const history: any = { userID, role };

    // 1️⃣ Tokens minted (operators only)
    if (role === "operator") {
        const { data: minted, error: mintedErr } = await supabase
            .from("tokenEvents")
            .select("id")
            .eq("eventType", "Minting")
            .eq("firstOwner", userID);
        if (mintedErr) console.error(mintedErr);
        history.tokensMinted = minted ? minted.length : 0;
    }

    // 2️⃣ Tokens bought (newOwner = user)
    const { data: bought, error: boughtErr } = await supabase
        .from("tokenEvents")
        .select("id")
        .eq("eventType", "Transfer")
        .eq("newOwner", userID);
    if (boughtErr) console.error(boughtErr);
    history.tokensBought = bought ? bought.length : 0;

    // 3️⃣ Tokens sold (firstOwner = user)
    const { data: sold, error: soldErr } = await supabase
        .from("tokenEvents")
        .select("id")
        .eq("eventType", "Transfer")
        .eq("firstOwner", userID);
    if (soldErr) console.error(soldErr);
    history.tokensSold = sold ? sold.length : 0;

    // 4️⃣ Tokens retired
    const { data: retired, error: retiredErr } = await supabase
        .from("tokenEvents")
        .select("id")
        .eq("eventType", "Retirement")
        .eq("firstOwner", userID);
    if (retiredErr) console.error(retiredErr);
    history.tokensRetired = retired ? retired.length : 0;

    // 5️⃣ Jobs created (operator only)
    if (role === "operator") {
        const { data: jobs, error: jobsErr } = await supabase
            .from("jobs")
            .select("jobID")
            .eq("operatorID", userID);
        if (jobsErr) console.error(jobsErr);
        history.jobsCreated = jobs ? jobs.length : 0;
    }

    // 6️⃣ Tokens currently owned
    const { data: owned, error: ownedErr } = await supabase
        .from("tokens")
        .select("tokenID")
        .eq("ownerID", userID);
    if (ownedErr) console.error(ownedErr);
    history.currentTokensOwned = owned ? owned.length : 0;

    // 7️⃣ Full event list (filter out minting for buyers)
    let eventQuery = supabase
        .from("tokenEvents")
        .select("*")
        .or(`firstOwner.eq.${userID},newOwner.eq.${userID}`)
        .order("createdAt", { ascending: false });

    if (role === "buyer") {
        eventQuery = eventQuery.neq("eventType", "Minting");
    }

    const { data: events, error: eventsErr } = await eventQuery;
    if (eventsErr) console.error(eventsErr);
    history.events = events || [];

    return history;
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