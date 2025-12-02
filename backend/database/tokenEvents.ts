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

  if (role === "Operator") {
    const mintedIDs = await getTokenIDsFromEvents(userID, 'Minting', 'firstOwner');
    history.tokensMinted = await sumCreditProportionForTokens(mintedIDs);
  }

  const boughtIDs = await getTokenIDsFromEvents(userID, 'Transfer', 'newOwner');
  history.tokensBought = await sumCreditProportionForTokens(boughtIDs);

  const soldIDs = await getTokenIDsFromEvents(userID, 'Transfer', 'firstOwner');
  history.tokensSold = await sumCreditProportionForTokens(soldIDs);

  const retiredIDs = await getTokenIDsFromEvents(userID, 'Retirement', 'firstOwner');
  history.tokensRetired = await sumCreditProportionForTokens(retiredIDs);

  if (role === "Operator") {
    const { data: jobs, error: jobsErr } = await supabase
      .from('Jobs')
      .select('jobID, jobTitle, status, dateCreated')
      .eq('operatorID', userID)
      .order('dateCreated', { ascending: false });
    if (jobsErr) console.error(jobsErr);
    history.jobsCreated = jobs ? jobs.length : 0;
    history.jobs = jobs || [];
  }

  const { data: owned, error: ownedErr } = await supabase
    .from('Tokens')
    .select('tokenID, creditProportion')
    .eq('ownerID', userID);

  if (ownedErr) console.error(ownedErr);

  const ownedByUser: Record<number, number> = {};
  owned?.forEach(t => {
    ownedByUser[t.tokenID] = (ownedByUser[t.tokenID] || 0) + Number(t.creditProportion);
  });
  history.currentTokensOwned = Object.values(ownedByUser).reduce((sum, v) => sum + v, 0);

  let eventQuery = supabase
    .from('tokenEvents')
    .select('*')
    .or(`firstOwner.eq.${userID},newOwner.eq.${userID}`)
    .order('createdAt', { ascending: false });

  if (role === "buyer") {
    eventQuery = eventQuery.neq('eventType', 'Minting');
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

async function getTokenIDsFromEvents(userID: number, eventType: string, ownerField: 'firstOwner' | 'newOwner') {
  const { data, error } = await supabase
    .from('tokenEvents')
    .select('tokenID')
    .eq('eventType', eventType)
    .eq(ownerField, userID);

  if (error) {
    console.error(error);
    return [];
  }

  return data?.map(d => d.tokenID) || [];
}

async function sumCreditProportionForTokens(tokenIDs: number[]) {
  if (!tokenIDs.length) return 0;

  const { data, error } = await supabase
    .from('Tokens')
    .select('creditProportion')
    .in('tokenID', tokenIDs);

  if (error) {
    console.error(error);
    return 0;
  }

  return data?.reduce((sum, t) => sum + Number(t.creditProportion), 0) || 0;
}
