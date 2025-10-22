-- TrustChain CO2 Database Schema
-- Based on the project requirements for telemetry data tracking and tokenization

-- Users table (extends Firebase auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('operator', 'slb_admin', 'verifier')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT UNIQUE NOT NULL,
    operator_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'Ready for Minting', 'Denied', 'Minted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telemetry table (raw sensor data)
CREATE TABLE IF NOT EXISTS telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    job_id TEXT NOT NULL REFERENCES jobs(job_id),
    tool TEXT NOT NULL CHECK (tool IN ('ABC', 'DEF', 'GHI')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    payload_json JSONB NOT NULL,
    signature TEXT NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggregates table (daily MRV packages)
CREATE TABLE IF NOT EXISTS aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL REFERENCES jobs(job_id),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    aggregate_json JSONB NOT NULL,
    evidence_hash TEXT NOT NULL,
    anchored_tx TEXT,
    attested BOOLEAN DEFAULT FALSE,
    attestation_meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tokens table (minted CO2 tokens)
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id BIGINT UNIQUE,
    owner_user_id UUID REFERENCES users(id),
    job_id TEXT NOT NULL REFERENCES jobs(job_id),
    tool TEXT NOT NULL,
    tonnes DECIMAL(10,3) NOT NULL,
    evidence_hash TEXT NOT NULL,
    minted_tx TEXT,
    retired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id BIGINT NOT NULL REFERENCES tokens(token_id),
    seller_user_id UUID NOT NULL REFERENCES users(id),
    price_per_tonne DECIMAL(10,2) NOT NULL,
    total_tonnes DECIMAL(10,3) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification requests (needs to be verified table)
CREATE TABLE IF NOT EXISTS verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL REFERENCES jobs(job_id),
    aggregate_id UUID NOT NULL REFERENCES aggregates(id),
    evidence_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending review' CHECK (status IN ('Pending review', 'On Hold', 'Approved', 'Denied')),    verifier_user_id UUID REFERENCES users(id),
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemetry_job_id ON telemetry(job_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_tool ON telemetry(tool);
CREATE INDEX IF NOT EXISTS idx_aggregates_job_id ON aggregates(job_id);
CREATE INDEX IF NOT EXISTS idx_aggregates_period ON aggregates(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_tokens_owner ON tokens(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_job_id ON tokens(job_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);


