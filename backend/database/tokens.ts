import { supabase } from '../supabaseClient.js';
import { recordTokenOnChain } from '../blockchain/blockchain';
import { retireTokenEvent } from './tokenEvents';

export type TokenStatus = 'Minted' | 'Retired' | 'On The Marketplace'

export async function addToken(currToken: {
  ownerID: number;
  jobID: number;
  quality: number;
  status: 'Minted' | 'Retired' | 'On The Marketplace';
  mintedAt?: string;
  retiredAt?: string | null;
  metadata: JSON;
  mintingHash?: string | null;
  creditProportion: number;
  tokenHash: string;
}) {

  const { data, error } = await supabase
    .from('Tokens')
    .insert([
      {
        ownerID: currToken.ownerID,
        jobID: currToken.jobID,
        quality: currToken.quality,
        status: currToken.status || 'Minted',
        mintedAt: currToken.mintedAt || new Date().toISOString(),
        retiredAt: currToken.retiredAt || null, // defaults to null, will change when retired
        metadata: currToken.metadata,
        mintingHash: currToken.mintingHash,
        creditProportion: currToken.creditProportion || 1,
        tokenHash: currToken.tokenHash,
      },
    ])
    .select(); // return the inserted row(s)
    console.log("I got here");

  if (error) {
    console.error('Error inserting Token:', error);
    return null;
  }

  //console.log('Inserted Token:', data);
  return data;
}

export async function getTokens() {
  const { data, error } = await supabase.from('Tokens').select('*');
  if (error) {
    console.error('Error fetching Tokens:', error);
    return null;
  }

  return data;
}

export async function getTokenByID(id: number) {
  const { data, error } = await supabase.from('Tokens').select('*').eq('tokenID', id).single();
  if (error) {
    console.error('Error fetching Token by ID:', error);
    return null;
  }
  return data;
}

export async function getTokensByOwnerID(operatorID: number) {
    const { data, error } = await supabase.from('Tokens').select('*').eq('ownerID', operatorID);
    if (error) {
        console.error('Error fetching Tokens by operator ID:', error);
        return null;
    }
    return data;
}

export async function updateRecentTransactionHash(tokenID: number, newHash: string) {
  const { data, error } = await supabase.from('Tokens').update({ recentTransactionHash: newHash }).eq('tokenID', tokenID).select();
  if (error) {
        console.error('Error updating recent transaction hash:', error);
        return null;
    }
  return data;
}

export async function getTokensGroupedByOwner(ownerID: number) {
  const { data, error } = await supabase
    .from('Tokens')
    .select('jobID, status, quality, mintedAt, retiredAt, creditProportion')
    .eq('ownerID', ownerID);

  if (error) {
    console.error('Error fetching grouped tokens:', error);
    return null;
  }

  const groups: Record<string, any[]> = {};

  // Group by jobID and status
  for (const t of data) {
    const key = `${t.jobID}_${t.status}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  // Build the result summary per group
  const groupedTokens = Object.entries(groups).map(([key, tokens]) => {
    const [jobID, status] = key.split('_');

    // Sum creditProportions
    const totalCredits = tokens.reduce((a, t) => a + (t.creditProportion || 0), 0);

    // Use consistent fields
    const quality = tokens[0].quality;
    const mintedAt = tokens[0].mintedAt || null;

    // RetiredAt = latest retiredAt among tokens, if any are retired
    const retiredDates = tokens
      .map(t => t.retiredAt)
      .filter(date => date !== null);
    const retiredAt = retiredDates.length
      ? retiredDates.sort().slice(-1)[0] // get latest
      : null;

    return {
      jobID: Number(jobID),
      status,
      totalCredits,
      quality,
      mintedAt,
      retiredAt,
    };
  });

  return groupedTokens;
}


export async function updateTokenStatus(tokenID: number, newStatus: TokenStatus) {
  if (newStatus == 'Minted') {
    const { data, error } = await supabase.from('Tokens').update({ status: newStatus, mintedAt: new Date().toISOString }).eq('tokenID', tokenID).select();
    if (error) {
        console.error('Error updating job status:', error);
        return null;
    }
    return data;

  } else if (newStatus == 'Retired') {
  const { data, error } = await supabase.from('Tokens').update({ status: newStatus, retiredAt: new Date().toISOString }).eq('tokenID', tokenID).select();
    if (error) {
        console.error('Error updating job status:', error);
        return null;
    }
    return data;
  } else {
    console.error('Invalid submitted status, check frontend problem');
    return null;
  }

}

export async function updateOwnerOfToken(tokenID: number, newOwnerID: number) {
  const {data, error } = await supabase.from('Tokens').update({ ownerID: newOwnerID, status: 'Minted' }).eq('tokenID', tokenID).select();
  if (error) {
        console.error('Error updating token owner:', error);
        return null;
    }
  return data;

}

export async function retireToken(tokenID: number, ownerID: number) {
    const tokenHash = `YourToken_${tokenID}_RetiredByUser_${ownerID}_OnDate_${new Date().toISOString()}`;
    const blockchainTokenHash = await recordTokenOnChain(tokenHash);
    console.log(`Blockchain token hash for retired token ${tokenID}: ${blockchainTokenHash}`);
    const { data, error } = await supabase.from('Tokens').update({ status: 'Retired', retiredAt: new Date().toISOString(),
       retirementHash: blockchainTokenHash || null }).eq('tokenID', tokenID).select();
    if (error) {
        console.error('Error retiring token:', error);
        return null;
    }


    await retireTokenEvent(ownerID, tokenID, blockchainTokenHash || '');
    return data;
}

export async function getTokensFullHistory(tokenID: number) {

}

async function testConnection() {
  const { data, error } = await supabase.from('Tokens').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    //console.log('Supabase Token Data:', data);
  }
}

