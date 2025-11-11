# Database Migrations

## Adding Denial Reason Column to PendingRequests

To fix the "failed to deny request" error, you need to add a column to store denial reasons in the `PendingRequests` table.

### Option 1: Run SQL in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from `add_denial_reason_to_pending_requests.sql`
4. Click **Run**

### Option 2: Run SQL via psql or Supabase CLI

If you have direct database access:

```bash
psql -h your-db-host -U postgres -d postgres -f add_denial_reason_to_pending_requests.sql
```

### What the Migration Does

The migration adds multiple column name variations to ensure compatibility:
- `verificationNotes` (camelCase)
- `verification_notes` (snake_case)
- `denialReason` (camelCase)
- `denial_reason` (snake_case)

This ensures the code works regardless of how Supabase PostgREST is configured.

### Verification

After running the migration, try denying a request again. The denial reason should now be saved successfully.

