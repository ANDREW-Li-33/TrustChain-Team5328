-- Migration: Add denial reason column to PendingRequests table
-- This migration adds a column to store the reason when a verification request is denied

-- Add verification_notes column if it doesn't exist (for storing denial reasons)
ALTER TABLE "PendingRequests" 
ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT;

-- Also add as verification_notes (snake_case) for compatibility
ALTER TABLE "PendingRequests" 
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add denialReason column as well for explicit naming
ALTER TABLE "PendingRequests" 
ADD COLUMN IF NOT EXISTS "denialReason" TEXT;

-- Add denial_reason (snake_case) for compatibility
ALTER TABLE "PendingRequests" 
ADD COLUMN IF NOT EXISTS denial_reason TEXT;

-- Note: Supabase PostgREST may use either camelCase or snake_case depending on configuration
-- Adding both ensures compatibility

