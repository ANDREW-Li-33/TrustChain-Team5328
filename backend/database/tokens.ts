import { supabase } from '../supabaseClient.js';

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

async function testConnection() {
  const { data, error } = await supabase.from('Tokens').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Supabase Token Data:', data);
  }
}

testConnection();