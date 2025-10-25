import { supabase } from '../supabaseClient.js';
import { updateOwnerOfToken } from './tokens';
import { addTransaction } from './transactions';

export async function addListing(listing: {
  tokenID: number;
  ownerID: number;
  Price: number;
  Status: 'Active' | 'Inactive';
  Timestamp: string;
}) {
  const { data, error } = await supabase
    .from('Listings')
    .insert([
      {
        tokenID: listing.tokenID,
        ownerID: listing.ownerID,
        Price: listing.Price,
        Status: listing.Status || 'Active',
        Timestamp: listing.Timestamp || new Date().toISOString()
      },
    ])
    .select(); // return the inserted row(s)

  if (error) {
    console.error('Error inserting Listing:', error);
    return null;
  }

  console.log('Inserted Listing:', data);
  return data;
}

export async function getActiveListings() {
  const { data, error } = await supabase.from('Listings').select('*').eq('Status', 'Active');
  if (error) {
    console.error('Error fetching listings:', error);
    return null;
  }
  return data;
}

export async function getListingByID(id: number) {
  const { data, error } = await supabase.from('Listings').select('*').eq('listingID', id).single();
  if (error) {
    console.error('Error fetching Listing by ID:', error);
    return null;
  }
  return data;
}

export async function getListingsByOwnerID(ownerID: number) {
    const { data, error } = await supabase.from('Listings').select('*').eq('ownerID', ownerID);
    if (error) {
        console.error('Error fetching jobs by operator ID:', error);
        return null;
    }
    return data;
}

export async function getListingsInPriceRange(maxPrice: number, minPrice: number) {
  const { data, error } = await supabase
    .from('Listings')
    .select('*')
    .lte('Price', maxPrice)
    .gte('Price', minPrice);

  if (error) {
    console.error('Error fetching listings between prices:', error);
    return null;
  }
  return data;
}

export async function getListingsInQualityRange(maxQuality: number, minQuality: number) {
  const { data, error } = await supabase
    .from('Listings')
    .select('*')
    .lte('Quality', maxQuality)
    .gte('Quality', minQuality);

  if (error) {
    console.error('Error fetching listings between qualities:', error);
    return null;
  }
  return data;
}

export async function deleteListing(listingID: number) {
  const { data, error } = await supabase
    .from('Listings')
    .delete()
    .eq('listingID', listingID)
    .select();

  if (error) {
    console.error('Error deleting listing:', error);
    return null;
  }

  console.log(`Deleted listing ${listingID}`);
  return data;
}

export async function changeListingStatus(listingID: number, newStatus: 'Active' | 'Inactive') {
  const { data, error } = await supabase
    .from('Listings')
    .update({ Status: newStatus })
    .eq('listingID', listingID)
    .select();

  if (error) {
    console.error('Error updating listing status:', error);
    return null;
  }

  console.log(`Listing ${listingID} status updated to ${newStatus}`);
  return data;
}

export async function completeListing(listingID: number, tokenID: number, newOwner: number, oldOwner: number, priceSold: number) {
    try {
      const updatedToken = await updateOwnerOfToken(tokenID, newOwner);
      if (!updatedToken) {
        console.log('Error in listings API complete listing, error 1');
        return null;
      }

      const currTransaction = await addTransaction({tokenID: tokenID, buyerID: newOwner, sellerID: oldOwner, Price: priceSold, Timestamp: new Date().toISOString()});
      if (!currTransaction) {
        console.log('Failure adding a transaction after completing the listing, error 2 in api complete listing.');
        return null;
      }

      const deleted = await deleteListing(listingID);
      if (!deleted) {
        console.log('Error deleting listing in completeListing API method');
        return null;
      }
      return {currTransaction, updatedToken, deleted};
    } catch (err) {
      console.log('weird error in complete listing');
      return null;
    }
}

export async function getListingsByDateRange(startDate: string | null, endDate: string | null) {
  let query = supabase.from('Listings').select('*');

  if (startDate) {
    query = query.gte('Timestamp', startDate);
  }

  if (endDate) {
    query = query.lte('Timestamp', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching listings by date range:', error);
    return null;
  }

  return data;
}



async function testConnection() {
  const { data, error } = await supabase.from('Listings').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Supabase Listing Data:', data);
  }
}

testConnection();
