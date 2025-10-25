import { supabase } from '../supabaseClient.js';

export async function addTransaction(transaction: {
  tokenID: number,
  buyerID: number,
  sellerID: number,
  Price: number,
  Timestamp?: string,
}) {
  const { data, error } = await supabase
    .from('Transactions')
    .insert([
      {
        tokenID: transaction.tokenID,
        buyerID: transaction.buyerID,
        sellerID: transaction.sellerID,
        price: transaction.Price,
        Timestamp: transaction.Timestamp || new Date().toISOString(),
      },
    ])
    .select(); // return the inserted row(s)

  if (error) {
    console.error('Error inserting Transaction:', error);
    return null;
  }

  console.log('Inserted Transaction:', data);
  return data;
}

export async function getTransactions() {
  const { data, error } = await supabase.from('Transactions').select('*');
  if (error) {
    console.error('Error fetching Transactions:', error);
    return null;
  }
  return data;
}

export async function getTransactionsByCreditID(id: number) {
  const { data, error } = await supabase.from('Transactions').select('*').eq('tokenID', id);
  if (error) {
    console.error('Error fetching user by token ID:', error);
    return null;
  }
  return data;
}

export async function getTransactionsByBuyerID(id: number) {
  const { data, error } = await supabase.from('Transactions').select('*').eq('buyerID', id);
  if (error) {
    console.error('Error fetching Transaction by Buyer ID:', error);
    return null;
  }
  return data;
}

export async function getTransactionsBySellerID(id: number) {
  const { data, error } = await supabase.from('Transactions').select('*').eq('sellerID', id);
  if (error) {
    console.error('Error fetching Transaction by Seller ID:', error);
    return null;
  }
  return data;
}

export async function getTransactionsByDateRange(startDate: string | null, endDate: string | null) {
  let query = supabase.from('Transactions').select('*');

  if (startDate) {
    query = query.gte('Timestamp', startDate);
  }

  if (endDate) {
    query = query.lte('Timestamp', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions by date range:', error);
    return null;
  }

  return data;
}

export async function getTransactionsByBuyerAndSeller(buyerID: number | null, sellerID: number | null) {
  let query = supabase.from('Transactions').select('*');

  if (buyerID !== null) {
    query = query.eq('buyerID', buyerID);
  }

  if (sellerID !== null) {
    query = query.eq('sellerID', sellerID);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions by buyer/seller:', error);
    return null;
  }

  return data;
}

export async function getTransactionsInPriceRange(maxPrice: number, minPrice: number) {
  const { data, error } = await supabase
    .from('Transactions')
    .select('*')
    .lte('Price', maxPrice)
    .gte('Price', minPrice);

  if (error) {
    console.error('Error fetching Transactions between prices:', error);
    return null;
  }
  return data;
}

async function testConnection() {
  const { data, error } = await supabase.from('Users').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Supabase User Data:', data);
  }
}

testConnection();
