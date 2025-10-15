#!/usr/bin/env node

import TelemetrySimulator from '../simulator/telemetrySimulator.js';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function generateTestData() {
  console.log('🧪 Generating test telemetry data...');
  
  const simulator = new TelemetrySimulator();
  
  // Generate data for different scenarios
  const scenarios = [
    { name: 'normal', jobId: 'JOB-2025-001' },
    { name: 'energyReduced', jobId: 'JOB-2025-002' },
    { name: 'tamper', jobId: 'JOB-2025-003' }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📊 Generating ${scenario.name} scenario for ${scenario.jobId}...`);
    
    // Generate 2 hours of data with 1-minute intervals
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours
    
    const telemetryData = simulator.generateTelemetryData(
      scenario.jobId,
      startTime,
      endTime,
      scenario.name,
      60 // 1-minute intervals
    );

    console.log(`Generated ${telemetryData.length} telemetry records`);

    // Save to file
    const filename = `test_${scenario.name}_${scenario.jobId}_${Date.now()}.json`;
    simulator.saveTelemetryData(telemetryData, filename);

    // Send to API if available
    try {
      console.log(`📤 Sending ${scenario.name} data to API...`);
      const response = await fetch(`${API_URL}/api/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telemetryData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${scenario.name} data sent successfully:`, result);
      } else {
        console.log(`⚠️  API not available for ${scenario.name} scenario`);
      }
    } catch (error) {
      console.log(`⚠️  API not available for ${scenario.name} scenario`);
    }

    // Generate and display aggregate
    const aggregate = simulator.generateDailyAggregate(scenario.jobId, startTime, telemetryData);
    console.log(`📈 ${scenario.name} aggregate:`, {
      job_id: aggregate.job_id,
      total_co2e_avoided_t: aggregate.total_co2e_avoided_t,
      tool_count: aggregate.tool_summaries.length
    });
  }

  console.log('\n🎉 Test data generation complete!');
  console.log('\nNext steps:');
  console.log('1. Start the backend server: npm run dev');
  console.log('2. Start the frontend: npm run dev');
  console.log('3. Visit http://localhost:3000/telemetry to view the analysis');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTestData().catch(console.error);
}

export default generateTestData;



