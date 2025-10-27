import { supabase } from '../supabaseClient.js';

export type TokenStatus = 'Minted' | 'Retired' | 'Ready for Minting'

export async function addToken(currToken: {
  ownerID: number;
  jobID: number;
  quality: number;
  status: 'Minted' | 'Retired' | 'Ready for Minting';
  mintedAt?: string;
  retiredAt?: string;
  metadata: JSON;
  blockchainHash?: number;
}) {
  const { data, error } = await supabase
    .from('Tokens')
    .insert([
      {
        ownerID: currToken.ownerID,
        jobID: currToken.jobID,
        quality: currToken.quality,
        status: currToken.status || 'Ready for Minting',
        mintedAt: currToken.mintedAt || null, // defaults to null, will change when minted
        retiredAt: currToken.retiredAt || null, // defaults to null, will change when retired
        metadata: currToken.metadata,
        blockchainHash: currToken.blockchainHash || null, // defaults to null, will change when minted
      },
    ])
    .select(); // return the inserted row(s)

  if (error) {
    console.error('Error inserting Token:', error);
    return null;
  }

  console.log('Inserted Token:', data);
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
  const {data, error } = await supabase.from('Tokens').update({ ownerID: newOwnerID }).eq('tokenID', tokenID).select();
  if (error) {
        console.error('Error updating token owner:', error);
        return null;
    }
  return data;

}



async function testConnection() {
  const { data, error } = await supabase.from('Tokens').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Supabase Token Data:', data);
  }
}

testConnection();