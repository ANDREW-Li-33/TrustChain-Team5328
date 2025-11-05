import { supabase } from '../supabaseClient.js';
import { updateOwnerOfToken } from './tokens';
import { getTokensByListingID } from './listingoftokens'

export async function addListing(listing: {
  tokenIDs: number[]; 
  sellerID: number;
  Price: number;
  Status?: 'Active' | 'Complete';
  CreatedAt?: string;
}) {
  try {
    const { data: listingData, error: listingError } = await supabase
      .from('Listings')
      .insert([
        {
          sellerID: listing.sellerID,
          Price: listing.Price,
          Status: listing.Status || 'Active',
          CreatedAt: listing.CreatedAt || new Date().toISOString(),
        },
      ])
      .select('listingID');

    if (listingError || !listingData?.length) {
      console.error('Error inserting Listing:', listingError);
      return null;
    }

    const listingID = listingData[0].listingID;
    console.log('Created listing ${listingID}');

    const tokenPairs = listing.tokenIDs.map(tokenID => ({
      listingID,
      tokenID,
    }));

    const { error: joinError } = await supabase
      .from('listingOfTokens')
      .insert(tokenPairs);

    if (joinError) {
      console.error('Error inserting ListingTokens:', joinError);
      return null;
    }

    const { error: tokenUpdateError } = await supabase
      .from('Tokens')
      .update({ status: 'On The Marketplace' })
      .in('tokenID', listing.tokenIDs);

    if (tokenUpdateError) {
      console.error('Error updating token statuses:', tokenUpdateError);
    }

    console.log('Linked tokens ${listing.tokenIDs.join(', ')} to listing ${listingID}');

    return {
      listingID,
      sellerID: listing.sellerID,
      tokenIDs: listing.tokenIDs,
      Price: listing.Price,
      Status: listing.Status || 'Active',
    };

  } catch (err) {
    console.error('Error in addListing:', err);
    return null;
  }
}


export async function getActiveListings() {
  const { data, error } = await supabase.from('Listings').select('*').eq('Status', 'Active');
  if (error) {
    console.error('Error fetching listings:', error);
    return null;
  }
  return data;
}

// Get active listings with full details including seller info and token quality
export async function getActiveListingsWithDetails(filters?: {
  minQuality?: number;
  sellerID?: number;
  tokenID?: number;
  dateAfter?: string;
  dateBefore?: string;
  companyName?: string;
}) {
  try {
    // Start with base query - join Listings with Users (seller info)
    // Try to join with Users table - if foreign key name is different, we'll handle it
    let query = supabase
      .from('Listings')
      .select('*')
      .eq('Status', 'Active');

    // Apply filters
    if (filters?.sellerID) {
      query = query.eq('sellerID', filters.sellerID);
    }

    if (filters?.dateAfter) {
      query = query.gte('CreatedAt', filters.dateAfter);
    }

    if (filters?.dateBefore) {
      query = query.lte('CreatedAt', filters.dateBefore);
    }

    const { data: listings, error: listingsError } = await query;

    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      return null;
    }

    if (!listings || listings.length === 0) {
      return [];
    }

    // Get all users to map seller info
    const { data: allUsers } = await supabase.from('Users').select('userID, email, organizationName, role');

    // Get tokens for each listing and filter by quality/tokenID
    const listingsWithTokens = await Promise.all(
      listings.map(async (listing: any) => {
        // Find seller info from users array
        const seller = allUsers?.find((u: any) => u.userID === listing.sellerID);
        
        // Filter by company name early if specified
        if (filters?.companyName && seller) {
          const sellerName = seller.organizationName || '';
          if (!sellerName.toLowerCase().includes(filters.companyName.toLowerCase())) {
            return null;
          }
        }
        // Get tokens for this listing
        const { data: tokenLinks, error: tokenLinksError } = await supabase
          .from('listingOfTokens')
          .select('tokenID')
          .eq('listingID', listing.listingID);

        if (tokenLinksError || !tokenLinks) {
          return { ...listing, tokens: [], minQuality: 0, maxQuality: 0, avgQuality: 0 };
        }

        const tokenIDs = tokenLinks.map((t: any) => t.tokenID);

        if (tokenIDs.length === 0) {
          return { ...listing, tokens: [], minQuality: 0, maxQuality: 0, avgQuality: 0 };
        }

        // Get token details
        let tokensQuery = supabase
          .from('Tokens')
          .select('tokenID, quality, creditProportion')
          .in('tokenID', tokenIDs);

        // Filter by tokenID if specified
        if (filters?.tokenID) {
          tokensQuery = tokensQuery.eq('tokenID', filters.tokenID);
        }

        // Filter by minQuality if specified
        if (filters?.minQuality !== undefined) {
          tokensQuery = tokensQuery.gte('quality', filters.minQuality);
        }

        const { data: tokens, error: tokensError } = await tokensQuery;

        if (tokensError || !tokens || tokens.length === 0) {
          return null; // Skip this listing if no tokens match filters
        }

        // Calculate quality metrics
        const qualities = tokens.map((t: any) => t.quality || 0);
        const minQuality = Math.min(...qualities);
        const maxQuality = Math.max(...qualities);
        const avgQuality = qualities.reduce((sum: number, q: number) => sum + q, 0) / qualities.length;

        return {
          ...listing,
          seller: seller || null,
          tokens: tokens.map((t: any) => t.tokenID),
          tokenDetails: tokens,
          minQuality,
          maxQuality,
          avgQuality,
        };
      })
    );

    // Filter out null listings (didn't match filters)
    const filtered = listingsWithTokens.filter((listing: any) => listing !== null);

    return filtered;
  } catch (err) {
    console.error('Error in getActiveListingsWithDetails:', err);
    return null;
  }
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

export async function changeListingStatus(listingID: number, newStatus: 'Active' | 'Complete') {
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

export async function completeListing(listingID: number, newOwner: number, oldOwner: number, priceSold: number) {
  try {
    // Step 1: Get all tokenIDs associated with this listing
    const tokenLinks = await getTokensByListingID(listingID);
    if (!tokenLinks || tokenLinks.length === 0) {
      console.log(`No tokens found for listing ${listingID}`);
      return null;
    }

    const tokenIDs = tokenLinks.map(t => t.tokenID);

    // Step 2: Update each token’s owner and status
    const updatedTokens = [];
    for (const tokenID of tokenIDs) {
      const updatedToken = await updateOwnerOfToken(tokenID, newOwner);
      if (updatedToken) {
        updatedTokens.push(updatedToken);
      } else {
        console.warn(`Failed to update token ${tokenID}`);
      }
    }

    // Step 3: Update the listing itself
    const { data: updatedListing, error: updateError } = await supabase
      .from('Listings')
      .update({
        Status: 'Complete',
        buyerID: newOwner,
        completedAt: new Date().toISOString(),
        Price: priceSold
      })
      .eq('listingID', listingID)
      .select();

    if (updateError) {
      console.error('Error updating listing status to Complete:', updateError);
      return null;
    }

    console.log(`✅ Completed listing ${listingID}. Updated tokens:`, updatedTokens);

    return {
      listing: updatedListing?.[0],
      tokensUpdated: updatedTokens.length,
      tokenIDs
    };

  } catch (err) {
    console.error('Error in completeListing:', err);
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

