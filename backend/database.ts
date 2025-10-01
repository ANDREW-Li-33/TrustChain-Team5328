import { supabase } from './supabaseClient.js';

async function testConnection() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Supabase data:', data);
  }
}

testConnection();