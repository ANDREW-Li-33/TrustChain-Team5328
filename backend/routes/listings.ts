import express from 'express';
import { addListing, getActiveListings, getActiveListingsWithDetails, getListingByID, getListingsByOwnerID, getListingsInPriceRange, getListingsInQualityRange,
    completeListing, changeListingStatus, getListingsByDateRange
 } from '../database/listings';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { tokenIDs, sellerID, Price, Status, CreatedAt } = req.body;

        // Basic validation
        if (!tokenIDs || !sellerID || !Price) {
         return res.status(400).json({ error: "Missing required fields, error 1 in routes/Listings.ts" });
        }

        const newListing = await addListing({
            tokenIDs, sellerID, Price, Status, CreatedAt
        });

        if (!newListing) {
            return res.status(500).json({ error: "Failed to insert Listing, error 2 in routes/Listings.ts" });
        }

        res.status(201).json({ message: "Listing added successfully", data: newListing });
    } catch (error) {
        console.error("Error in routes/Listings.ss, error is: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/active', async (req, res) => {
  const listings = await getActiveListings();
  if (!listings) return res.status(500).json({ error: 'Failed to fetch active listings' });
  res.json(listings);
});

// Filtered active listings endpoint for SLB Admin
router.get('/active/filtered', async (req, res) => {
  try {
    const {
      minQuality,
      sellerID,
      tokenID,
      dateAfter,
      dateBefore,
      companyName,
    } = req.query;

    const filters: any = {};

    if (minQuality) {
      filters.minQuality = parseInt(minQuality as string);
    }
    if (sellerID) {
      filters.sellerID = parseInt(sellerID as string);
    }
    if (tokenID) {
      filters.tokenID = parseInt(tokenID as string);
    }
    if (dateAfter) {
      filters.dateAfter = dateAfter as string;
    }
    if (dateBefore) {
      filters.dateBefore = dateBefore as string;
    }
    if (companyName) {
      filters.companyName = companyName as string;
    }

    const listings = await getActiveListingsWithDetails(filters);
    
    if (listings === null) {
      return res.status(500).json({ error: 'Failed to fetch filtered listings' });
    }

    res.json(listings);
  } catch (error) {
    console.error('Error in /active/filtered:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const listing = await getListingByID(id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

router.get('/owner/:ownerID', async (req, res) => {
  const ownerID = parseInt(req.params.ownerID);
  const listings = await getListingsByOwnerID(ownerID);
  if (!listings) return res.status(500).json({ error: 'Failed to fetch listings for owner' });
  res.json(listings);
});

router.get('/price-range', async (req, res) => {
  const min = parseFloat(req.query.min as string) || 0;
  const max = parseFloat(req.query.max as string) || Number.MAX_SAFE_INTEGER;
  const listings = await getListingsInPriceRange(max, min);
  if (!listings) return res.status(500).json({ error: 'Failed to fetch listings in price range' });
  res.json(listings);
});

router.get('/quality-range', async (req, res) => {
  const min = parseFloat(req.query.min as string) || 0;
  const max = parseFloat(req.query.max as string) || Number.MAX_SAFE_INTEGER;
  const listings = await getListingsInQualityRange(max, min);
  if (!listings) return res.status(500).json({ error: 'Failed to fetch listings in quality range' });
  res.json(listings);
});


router.patch('/:listingID/status', async (req, res) => {
  const listingID = parseInt(req.params.listingID);
  const { newStatus } = req.body;
  if (newStatus !== 'Active' && newStatus !== 'Inactive') {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  const updated = await changeListingStatus(listingID, newStatus);
  if (!updated) return res.status(500).json({ error: 'Failed to update status' });
  res.json(updated);
});

router.post('/complete/:id', async (req, res) => {
  const { id } = req.params;
  const { buyerID, oldOwner, priceSold } = req.body;

  try {
    const result = await completeListing(Number(id), buyerID, oldOwner, priceSold);
    if (!result) return res.status(404).json({ message: 'No tokens found or error completing listing.' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete listing' });
  }
});

router.get('/date-range', async (req, res) => {
  const { start, end } = req.query;

  const listings = await getListingsByDateRange(
    start ? String(start) : null,
    end ? String(end) : null
  );

  if (!listings) {
    return res.status(404).json({ error: "No listings found in that range" });
  }

  res.status(200).json(listings);
});





export default router;