import { supabase } from '../supabaseClient.js';

export async function addUser(user: {
  firebaseUID: string;
  email: string;
  role: 'Operator' | 'Buyer' | 'Admin' | 'Verifier';
  dateJoined?: string;
}) {
  const { data, error } = await supabase
    .from('Users')
    .insert([
      {
        firebaseUID: user.firebaseUID,
        email: user.email,
        role: user.role,
        dateJoined: user.dateJoined || new Date().toISOString(), // defaults to current time
      },
    ])
    .select(); // return the inserted row(s)

  if (error) {
    console.error('Error inserting user:', error);
    return null;
  }

  console.log('Inserted user:', data);
  return data;
}

export async function getUsers() {
  const { data, error } = await supabase.from('Users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return null;
  }
  return data;
}

export async function getUserByID(id: number) {
  const { data, error } = await supabase.from('Users').select('*').eq('userID', id).single();
  if (error) {
    console.error('Error fetching user by ID:', error);
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
