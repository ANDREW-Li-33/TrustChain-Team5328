import express from 'express';
import { addTransaction, getTransactions, getTransactionsByBuyerID, getTransactionsByCreditID, getTransactionsBySellerID,
    getTransactionsByBuyerAndSeller, getTransactionsByDateRange, getTransactionsInPriceRange
} from '../database/transactions';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { tokenID, buyerID, sellerID, Price, Timestamp } = req.body;

        // Basic validation
        if (!tokenID || !buyerID || !sellerID || !Price) {
         return res.status(400).json({ error: "Missing required fields, error 1 in routes/transactions.ts" });
        }

        const newTransaction = await addTransaction({
            tokenID, buyerID, sellerID, Price, Timestamp
        });

        if (!newTransaction) {
            return res.status(500).json({ error: "Failed to insert transaction, error 2 in routes/transactions.ts" });
        }

        res.status(201).json({ message: "Transaction added successfully", data: newTransaction });
    } catch (error) {
        console.error("Error in routes/transactions, error is: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/', async (req, res) => {
    const transaction = await getTransactions();
    if (!transaction) {
        return res.status(500).json({ error: "Failed to fetch Transactions" });
    }
    res.status(200).json(transaction);
});

router.get('/credit/:id', async (req, res) => {
  const tx = await getTransactionsByCreditID(Number(req.params.id));
  if (!tx) {
    return res.status(404).json({ error: "No transactions found for that token ID" });
  }
  res.status(200).json(tx);
});

router.get('/buyer/:id', async (req, res) => {
  const tx = await getTransactionsByBuyerID(Number(req.params.id));
  if (!tx) {
    return res.status(404).json({ error: "No transactions found for that buyer ID" });
  }
  res.status(200).json(tx);
});

router.get('/seller/:id', async (req, res) => {
  const tx = await getTransactionsBySellerID(Number(req.params.id));
  if (!tx) {
    return res.status(404).json({ error: "No transactions found for that seller ID" });
  }
  res.status(200).json(tx);
});

router.get('/date-range', async (req, res) => {
  const start = req.query.start ? String(req.query.start) : null;
  const end = req.query.end ? String(req.query.end) : null;

  const data = await getTransactionsByDateRange(start, end);
  if (!data) return res.status(500).json({ error: 'Failed to fetch transactions by date range.' });
  res.json(data);
});

router.get('/buyer-seller', async (req, res) => {
  const buyer = req.query.buyer ? parseInt(String(req.query.buyer)) : null;
  const seller = req.query.seller ? parseInt(String(req.query.seller)) : null;

  const data = await getTransactionsByBuyerAndSeller(buyer, seller);
  if (!data) return res.status(500).json({ error: 'Failed to fetch transactions by buyer/seller.' });
  res.json(data);
});

router.get('/price-range', async (req, res) => {
  const min = parseFloat(req.query.min as string) || 0;
  const max = parseFloat(req.query.max as string) || Number.MAX_SAFE_INTEGER;
  const Transactions = await getTransactionsInPriceRange(max, min);
  if (!Transactions) return res.status(500).json({ error: 'Failed to fetch Transactions in price range' });
  res.json(Transactions);
});

export default router;