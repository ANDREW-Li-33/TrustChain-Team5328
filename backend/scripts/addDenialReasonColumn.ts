/**
 * Script to add denial reason column to PendingRequests table
 * Run this with: npx tsx scripts/addDenialReasonColumn.ts
 */

import { supabase } from "../supabaseClient.js";

async function addDenialReasonColumn() {
  console.log("Adding denial reason columns to PendingRequests table...");

  try {
    // Try to add verificationNotes column (camelCase)
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE "PendingRequests" 
        ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT;
      `
    }).catch(() => ({ error: null }));

    if (error1) {
      console.log("Note: Could not add verificationNotes via RPC (this is expected if RPC doesn't exist)");
    }

    // Try to add verification_notes column (snake_case)
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE "PendingRequests" 
        ADD COLUMN IF NOT EXISTS verification_notes TEXT;
      `
    }).catch(() => ({ error: null }));

    if (error2) {
      console.log("Note: Could not add verification_notes via RPC (this is expected if RPC doesn't exist)");
    }

    // Try to add denialReason column
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE "PendingRequests" 
        ADD COLUMN IF NOT EXISTS "denialReason" TEXT;
      `
    }).catch(() => ({ error: null }));

    if (error3) {
      console.log("Note: Could not add denialReason via RPC (this is expected if RPC doesn't exist)");
    }

    // Try to add denial_reason column
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE "PendingRequests" 
        ADD COLUMN IF NOT EXISTS denial_reason TEXT;
      `
    }).catch(() => ({ error: null }));

    if (error4) {
      console.log("Note: Could not add denial_reason via RPC (this is expected if RPC doesn't exist)");
    }

    console.log("\n⚠️  IMPORTANT: This script cannot directly execute SQL via Supabase client.");
    console.log("You need to run the SQL migration manually in your Supabase dashboard:");
    console.log("\n1. Go to your Supabase project dashboard");
    console.log("2. Navigate to SQL Editor");
    console.log("3. Run the SQL from: backend/migrations/add_denial_reason_to_pending_requests.sql");
    console.log("\nOr run this SQL directly:");
    console.log(`
ALTER TABLE "PendingRequests" 
ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT;

ALTER TABLE "PendingRequests" 
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

ALTER TABLE "PendingRequests" 
ADD COLUMN IF NOT EXISTS "denialReason" TEXT;

ALTER TABLE "PendingRequests" 
ADD COLUMN IF NOT EXISTS denial_reason TEXT;
    `);

  } catch (error) {
    console.error("Error:", error);
  }
}

addDenialReasonColumn();

