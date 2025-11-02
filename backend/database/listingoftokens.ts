import { supabase } from '../supabaseClient.js';

export type TokenStatus = 'Minted' | 'Retired' | 'Ready for Minting'

export async function addtokenListing(currTokenListing: {
  listingID: number;
  tokenID: number;
}) {
  const { data, error } = await supabase
    .from('listingOfTokens')
    .insert([
      {
        listingID: currTokenListing.listingID,
        tokenID: currTokenListing.tokenID,
      },
    ])
    .select(); // return the inserted row(s)

  if (error) {
    console.error('Error inserting token Listing:', error);
    return null;
  }

  console.log('Inserted tokenListing:', data);
  return data;
}

export async function getTokenListings() {
  const { data, error } = await supabase.from('listingOfTokens').select('*');
  if (error) {
    console.error('Error fetching listingsOFTokens:', error);
    return null;
  }

  return data;
}

export async function getListingsByTokenID(id: number) {
  const { data, error } = await supabase.from('listingOfTokens').select('*').eq('tokenID', id);
  if (error) {
    console.error('Error fetching Listings by Token ID:', error);
    return null;
  }
  return data || [];
}

export async function getTokensByListingID(id: number) {
  const { data, error } = await supabase.from('listingOfTokens').select('*').eq('listingID', id);
  if (error) {
    console.error('Error fetching tokens by Listing ID:', error);
    return null;
  }
  return data || [];
}

