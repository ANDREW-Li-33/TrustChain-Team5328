# TrustChain CO2 Telemetry Data System

This document provides setup instructions for the telemetry data functionality in the TrustChain CO2 project.

## 🚀 Quick Start

### 1. Environment Setup

Create environment files for both frontend and backend:

**Backend (.env):**
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration
DATABASE_URL=your_database_url

# JWT Secret for API authentication
JWT_SECRET=your_jwt_secret_key

# Server Configuration
PORT=5000
```

**Frontend (.env):**
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend API URL
VITE_API_URL=http://localhost:5000
```

### 2. Database Setup

Run the database schema to create the required tables:

```bash
# Connect to your Supabase database and run:
psql -h your_host -U your_user -d your_database -f backend/schema.sql
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## 🧪 Testing the Telemetry System

### 1. Test the Telemetry Simulator

```bash
cd backend
npm run test-telemetry
```

This will test:
- Single telemetry message generation
- Multiple scenarios (normal, energyReduced, tamper)
- Telemetry integrity verification
- Anomaly detection

### 2. Generate Test Data

```bash
cd backend
npm run generate-test-data
```

This will:
- Generate telemetry data for 3 different scenarios
- Save data to files for replay
- Send data to the API (if running)

### 3. Run the Telemetry Simulator

```bash
cd backend

# Normal scenario
npm run simulator -- --scenario=normal --job=JOB-001 --duration=1 --save

# Energy reduced scenario
npm run simulator -- --scenario=energyReduced --job=JOB-002 --duration=2 --interval=30

# Tamper scenario
npm run simulator -- --scenario=tamper --job=JOB-003 --duration=1

# Replay saved data
npm run simulator -- --replay=telemetry_JOB-001_normal_1234567890.json
```

## 🚀 Running the Application

### 1. Start the Backend

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:5000`

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

### 3. View Telemetry Analysis

Navigate to `http://localhost:3000/telemetry` to see:
- Real-time telemetry data visualization
- CO2 emissions analysis
- Energy consumption charts
- Carbon credits request functionality

## 📊 API Endpoints

### Telemetry Data

- `POST /api/telemetry` - Ingest telemetry data
- `GET /api/jobs/:jobId/telemetry` - Get telemetry data for a job
- `GET /api/jobs/:jobId/aggregate` - Get aggregated MRV data for a job

### Example Usage

```bash
# Send telemetry data
curl -X POST http://localhost:5000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '[{
    "device_id": "ABC-001",
    "tool": "ABC",
    "job_id": "JOB-001",
    "timestamp": "2025-01-01T12:00:00Z",
    "measurements": {
      "power_kw": 120.5,
      "runtime_sec": 3600,
      "flaring_m3": 0.0
    },
    "signature": "0x..."
  }]'

# Get telemetry data
curl http://localhost:5000/api/jobs/JOB-001/telemetry

# Get aggregated data
curl http://localhost:5000/api/jobs/JOB-001/aggregate
```

## 🔧 Telemetry Simulator Features

### Scenarios

1. **Normal** - Baseline energy usage with normal variations
2. **Energy Reduced** - Shows CO2 savings (20-50% reduction)
3. **Tamper** - Suspicious data patterns for testing anomaly detection

### Configuration

The simulator supports various parameters:
- `--scenario` - Simulation scenario (normal|energyReduced|tamper)
- `--job` - Job ID for telemetry data
- `--duration` - Duration in hours
- `--interval` - Telemetry interval in seconds
- `--save` - Save generated data to file
- `--replay` - Replay data from saved file

### Data Structure

Each telemetry message includes:
```json
{
  "device_id": "ABC-001",
  "tool": "ABC",
  "job_id": "JOB-2025-001",
  "timestamp": "2025-01-01T12:00:00Z",
  "measurements": {
    "power_kw": 120.5,
    "runtime_sec": 3600,
    "flaring_m3": 0.0
  },
  "signature": "0x..."
}
```

## 📈 MRV Engine

The MRV (Measurement, Reporting, Verification) engine calculates:

- **CO2 Avoided**: `max(0, (baseline_kwh - actual_kwh) * emission_factor)`
- **Energy Savings**: Baseline vs actual energy consumption
- **Flaring Reduction**: Baseline vs actual flaring volumes
- **Tool Performance**: Individual tool contributions to CO2 avoidance

### Baseline Values

- **ABC Tool**: 150 kWh/day baseline
- **DEF Tool**: 200 kWh/day baseline  
- **GHI Tool**: 100 kWh/day baseline
- **Emission Factor**: 0.00025 tCO2e per kWh
- **Flare Factor**: 0.001 tCO2e per m3

## 🛡️ Security Features

- **ECDSA Signatures**: All telemetry messages are cryptographically signed
- **Integrity Verification**: Validates message structure and signatures
- **Anomaly Detection**: Detects suspicious data patterns
- **Multi-party Verification**: Requires verifier attestation before tokenization

## 🧪 Testing

### Unit Tests

```bash
cd backend
npm run test-telemetry
```

### Integration Tests

```bash
# Generate test data and verify API endpoints
npm run generate-test-data
```

### Manual Testing

1. Start the backend server
2. Run the telemetry simulator
3. Check the telemetry analysis page
4. Verify data visualization and calculations

## 📝 Next Steps

Based on your Jira board, the remaining tasks are:

1. **TPS-34**: Telemetry analysis page with graphs ✅ (Completed)
2. **TPS-35**: Request button for carbon credits ✅ (Completed)
3. **TPS-36**: Verification system for telemetry packages
4. **TPS-37**: Verifier dashboard for viewing packages
5. **TPS-38**: Verifier completion functionality

## 🔍 Troubleshooting

### Common Issues

1. **Firebase Import Error**: Make sure the Firebase configuration file exists
2. **Database Connection**: Verify Supabase credentials in .env
3. **API Not Available**: Ensure backend server is running on port 5000
4. **Chart Not Loading**: Check if recharts dependency is installed

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=trustchain:*
```

## 📞 Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Check database connectivity



