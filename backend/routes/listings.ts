import express from 'express';
import { addListing, getActiveListings, getListingByID, getListingsByOwnerID, getListingsInPriceRange, getListingsInQualityRange,
    completeListing, deleteListing, changeListingStatus, getListingsByDateRange
 } from '../database/listings';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { tokenID, ownerID, Price, Status, Timestamp } = req.body;

        // Basic validation
        if (!tokenID || !ownerID || !Price) {
         return res.status(400).json({ error: "Missing required fields, error 1 in routes/Listings.ts" });
        }

        const newListing = await addListing({
            tokenID, ownerID, Price, Status, Timestamp
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

router.delete('/:listingID', async (req, res) => {
  const listingID = parseInt(req.params.listingID);
  const deleted = await deleteListing(listingID);
  if (!deleted) return res.status(500).json({ error: 'Failed to delete listing' });
  res.json({ success: true, deleted });
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

router.post('/complete', async (req, res) => {
  const { listingID, tokenID, newOwner, oldOwner, priceSold } = req.body;
  const result = await completeListing(listingID, tokenID, newOwner, oldOwner, priceSold);
  if (!result) return res.status(500).json({ error: 'Failed to complete listing' });
  res.json(result);
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