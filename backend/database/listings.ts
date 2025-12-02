import { supabase } from '../supabaseClient.js';
import { updateOwnerOfToken, updateTokenStatus, updateRecentTransactionHash } from './tokens';
import { getTokensByListingID, removeAllTokensFromListing } from './listingoftokens'
import { recordTokenOnChain } from '../blockchain/blockchain';
import { transferTokenEvent } from './tokenEvents';


export async function addListing(listing: {
  tokenIDs: number[]; 
  sellerID: number;
  Price: number;
  Status?: 'Active' | 'Complete';
  createdAt?: string;
}) {
  try {
    const { data: listingData, error: listingError } = await supabase
      .from('Listings')
      .insert([
        {
          sellerID: listing.sellerID,
          Price: listing.Price,
          Status: listing.Status || 'Active',
          createdAt: listing.createdAt || new Date().toISOString(),
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

export async function getPreviousListingsBySeller(sellerID: number) {
  if (!sellerID) {
    const {data, error} = await supabase.from('Listings').select('*').eq('Status', 'Complete');
    if (error) {
      console.error('Error fetching previous listings:', error);
      return null;
    }
    return data;
  } else {
    const {data, error} = await supabase.from('Listings').select('*').eq('Status', 'Complete').eq('sellerID', sellerID);
    if (error) {
      console.error('Error fetching previous listings:', error);
      return null;
    }
    return data;
  }
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
    const normalizeDate = (listing: any): string => {
      return listing.CreatedAt || listing.createdAt || listing.Timestamp || listing.timestamp || listing.created_at || new Date().toISOString();
    };
    let query = supabase
      .from('Listings')
      .select('*')
      .eq('Status', 'Active');
    if (filters?.sellerID) {
      query = query.eq('sellerID', filters.sellerID);
    }

    if (filters?.dateAfter) {
      query = query.gte('CreatedAt', filters.dateAfter);
    }

    if (filters?.dateBefore) {
      query = query.lte('CreatedAt', filters.dateBefore);
    }

    let { data: listings, error: listingsError } = await query;
    
    if (listingsError && (listingsError.message?.includes('CreatedAt') || listingsError.message?.includes('column') || listingsError.message?.includes('schema cache'))) {
      console.warn('Date filter column (CreatedAt) not found, fetching all and filtering client-side');
      
      let retryQuery = supabase
        .from('Listings')
        .select('*')
        .eq('Status', 'Active');
      
      if (filters?.sellerID) {
        retryQuery = retryQuery.eq('sellerID', filters.sellerID);
      }
      
      const retryResult = await retryQuery;
      listings = retryResult.data;
      listingsError = retryResult.error;
      
      if (retryResult.error) {
        console.error('Error fetching listings:', retryResult.error);
        return null;
      }

      if (filters?.dateAfter || filters?.dateBefore) {
        listings = (listings || []).filter((listing: any) => {
          const listingDate = normalizeDate(listing);
          if (filters?.dateAfter && listingDate < filters.dateAfter) return false;
          if (filters?.dateBefore && listingDate > filters.dateBefore) return false;
          return true;
        });
      }
    }

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
        if (filters?.companyName) {
          const sellerName = seller?.organizationName || seller?.email || '';
          if (!sellerName.toLowerCase().includes(filters.companyName.toLowerCase())) {
            return null;
          }
        }
        // Get tokens for this listing
        const { data: tokenLinks, error: tokenLinksError } = await supabase
          .from('listingOfTokens')
          .select('tokenID')
          .eq('listingID', listing.listingID);

        // Normalize date field for consistency
        const normalizedDate = normalizeDate(listing);
        
        if (tokenLinksError || !tokenLinks) {
          return { ...listing, CreatedAt: normalizedDate, seller: seller || null, tokens: [], minQuality: 0, maxQuality: 0, avgQuality: 0 };
        }

        const tokenIDs = tokenLinks.map((t: any) => t.tokenID);

        if (tokenIDs.length === 0) {
          return { ...listing, CreatedAt: normalizedDate, seller: seller || null, tokens: [], minQuality: 0, maxQuality: 0, avgQuality: 0 };
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
        const qualities = tokens.map((t: any) => t.quality || 0).filter((q: number) => q > 0);
        if (qualities.length === 0) {
          return { ...listing, CreatedAt: normalizedDate, seller: seller || null, tokens: [], minQuality: 0, maxQuality: 0, avgQuality: 0 };
        }
        const minQuality = Math.min(...qualities);
        const maxQuality = Math.max(...qualities);
        const avgQuality = qualities.reduce((sum: number, q: number) => sum + q, 0) / qualities.length;
        
        return {
          ...listing,
          CreatedAt: normalizedDate, // Ensure frontend always has CreatedAt
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
    console.log('I got here as well');

    // Step 2: Update each token's owner and status
    const updatedTokens = [];
    const mintingHash = `Listing_${listingID}_SoldToUser_${newOwner}_FromUser_${oldOwner}_TheTokensSoldAre_${tokenIDs.join('_')}`;
    const transactionHash = await recordTokenOnChain(mintingHash);
    console.log(`Blockchain transaction hash for listing ${listingID}: ${transactionHash}`);


    for (const tokenID of tokenIDs) {
      const updatedToken = await updateOwnerOfToken(tokenID, newOwner);
      const updatedHash = await updateRecentTransactionHash(tokenID, transactionHash || 'N/A');
      if (updatedToken && updatedHash) {
        updatedTokens.push(updatedToken);
        console.log('I am here');
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
        Price: priceSold,
        transactionHash: transactionHash || 'N/A',
      })
      .eq('listingID', listingID)
      .select();

    //Step 4: Record transfer events for each token
    for (const tokenID of tokenIDs) {
      await transferTokenEvent(oldOwner, newOwner, tokenID, listingID, transactionHash || '');
    }

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

export async function removeListing(listingID: number) {
  try {
    // Step 1: Get all token IDs BEFORE deleting anything
    const tokenLinks = await getTokensByListingID(listingID);
    const tokenIDs = tokenLinks?.map(t => t.tokenID) || [];
    
    console.log(`Removing listing ${listingID} with tokens: ${tokenIDs.join(', ')}`);

    // Step 2: Update token statuses back to 'Minted' (before removing from join table)
    if (tokenIDs.length > 0) {
      const { error: tokenUpdateError } = await supabase
        .from('Tokens')
        .update({ status: 'Minted' })
        .in('tokenID', tokenIDs);

      if (tokenUpdateError) {
        console.error('Error updating token statuses during removal:', tokenUpdateError);
        // Continue anyway - we still want to clean up the listing
      } else {
        console.log(`Updated ${tokenIDs.length} token(s) status back to 'Minted'`);
      }
    }

    // Step 3: Remove tokens from the join table
    const removeSuccess = await removeAllTokensFromListing(listingID);
    if (!removeSuccess) {
      console.error('Failed to remove tokens from listing join table');
    }

    // Step 4: Delete the listing itself (only if it's Active)
    const { data, error } = await supabase
      .from('Listings')
      .delete()
      .eq('listingID', listingID)
      .eq('Status', 'Active')
      .select();

    if (error) {
      console.error('Error removing listing:', error);
      return null;
    }

    console.log(`✅ Successfully removed listing ${listingID}`);
    return data;
  } catch (err) {
    console.error('Error in removeListing:', err);
    return null;
  }
}

export async function getListingsByDateRange(startDate: string | null, endDate: string | null) {
  // Use getActiveListingsWithDetails with date filters to get quality data
  const filters: any = {};
  if (startDate) {
    filters.dateAfter = startDate;
  }
  if (endDate) {
    filters.dateBefore = endDate;
  }
  
  // If no date filters, get all listings with details
  if (!startDate && !endDate) {
    return await getActiveListingsWithDetails();
  }
  
  // Get all listings first, then filter by date range
  // Since getActiveListingsWithDetails only returns Active listings, we need to handle all statuses
  let query = supabase.from('Listings').select('*');

  // Try different date column names - Supabase will use the first one that exists
  if (startDate) {
    // Try createdAt (lowercase) first
    query = query.gte('createdAt', startDate);
  }

  if (endDate) {
    query = query.lte('createdAt', endDate);
  }

  let { data: listings, error } = await query;
  
  // If error is about column not found, try with different column names
  if (error && (error.message?.includes('createdAt') || error.message?.includes('column') || error.message?.includes('schema cache'))) {
    // Retry with CreatedAt (capitalized)
    let retryQuery = supabase.from('Listings').select('*');
    if (startDate) {
      retryQuery = retryQuery.gte('CreatedAt', startDate);
    }
    if (endDate) {
      retryQuery = retryQuery.lte('CreatedAt', endDate);
    }
    const retryResult = await retryQuery;
    listings = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    console.error('Error fetching listings by date range:', error);
    // Fallback: try without date filters and filter client-side
    const allListings = await getActiveListingsWithDetails();
    if (!allListings) return null;
    
    const normalizeDate = (listing: any): string => {
      return listing.CreatedAt || listing.createdAt || listing.Timestamp || listing.timestamp || listing.created_at || new Date().toISOString();
    };
    
    return allListings.filter((listing: any) => {
      const listingDate = normalizeDate(listing);
      if (startDate && listingDate < startDate) return false;
      if (endDate && listingDate > endDate) return false;
      return true;
    });
  }

  if (!listings || listings.length === 0) {
    return [];
  }

  // Get all users to map seller info
  const { data: allUsers } = await supabase.from('Users').select('userID, email, organizationName, role');
  
  const normalizeDate = (listing: any): string => {
    return listing.CreatedAt || listing.createdAt || listing.Timestamp || listing.timestamp || listing.created_at || new Date().toISOString();
  };

  // Enhance each listing with seller info and token details
  const listingsWithDetails = await Promise.all(
    listings.map(async (listing: any) => {
      const seller = allUsers?.find((u: any) => u.userID === listing.sellerID);
      
      // Get tokens for this listing
      const { data: tokenLinks } = await supabase
        .from('listingOfTokens')
        .select('tokenID')
        .eq('listingID', listing.listingID);

      const tokenIDs = tokenLinks?.map((t: any) => t.tokenID) || [];

      let minQuality = 0, maxQuality = 0, avgQuality = 0;
      let tokenDetails: any[] = [];

      if (tokenIDs.length > 0) {
        const { data: tokens } = await supabase
          .from('Tokens')
          .select('tokenID, quality, creditProportion')
          .in('tokenID', tokenIDs);

        if (tokens && tokens.length > 0) {
          tokenDetails = tokens;
          const qualities = tokens.map((t: any) => t.quality || 0).filter((q: number) => q > 0);
          if (qualities.length > 0) {
            minQuality = Math.min(...qualities);
            maxQuality = Math.max(...qualities);
            avgQuality = qualities.reduce((sum: number, q: number) => sum + q, 0) / qualities.length;
          }
        }
      }

      return {
        ...listing,
        CreatedAt: normalizeDate(listing),
        seller: seller || null,
        tokens: tokenIDs,
        tokenDetails,
        minQuality,
        maxQuality,
        avgQuality,
      };
    })
  );

  return listingsWithDetails;
}