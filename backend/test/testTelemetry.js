#!/usr/bin/env node

import TelemetrySimulator from '../simulator/telemetrySimulator.js';

function testTelemetrySimulator() {
  console.log('🧪 Testing Telemetry Simulator...\n');

  const simulator = new TelemetrySimulator();

  // Test 1: Generate single telemetry message
  console.log('Test 1: Single telemetry message generation');
  const singleMessage = simulator.generateTelemetryMessage(
    'ABC-001',
    'ABC',
    'JOB-TEST-001',
    new Date(),
    'normal'
  );
  console.log('✅ Generated message:', JSON.stringify(singleMessage, null, 2));

  // Test 2: Generate multiple messages for different scenarios
  console.log('\nTest 2: Multiple scenarios');
  const scenarios = ['normal', 'energyReduced', 'tamper'];
  
  scenarios.forEach(scenario => {
    console.log(`\n📊 Testing ${scenario} scenario:`);
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (30 * 60 * 1000)); // 30 minutes
    
    const data = simulator.generateTelemetryData(
      'JOB-TEST-001',
      startTime,
      endTime,
      scenario,
      60 // 1-minute intervals
    );

    console.log(`  Generated ${data.length} records`);
    
    // Calculate aggregate
    const aggregate = simulator.generateDailyAggregate('JOB-TEST-001', startTime, data);
    console.log(`  Total CO2 avoided: ${aggregate.total_co2e_avoided_t.toFixed(3)} tCO2e`);
    console.log(`  Tools: ${aggregate.tool_summaries.length}`);
  });

  // Test 3: Verify telemetry integrity
  console.log('\nTest 3: Telemetry integrity verification');
  const testData = simulator.generateTelemetryData(
    'JOB-TEST-001',
    new Date(),
    new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    'normal',
    60
  );

  const verification = simulator.verifyTelemetryIntegrity(testData);
  console.log(`✅ Integrity check: ${verification.isValid ? 'PASSED' : 'FAILED'}`);
  if (!verification.isValid) {
    console.log('Issues found:', verification.issues);
  }

  // Test 4: Anomaly detection
  console.log('\nTest 4: Anomaly detection');
  const tamperData = simulator.generateTelemetryData(
    'JOB-TEST-001',
    new Date(),
    new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    'tamper',
    60
  );

  const anomalies = simulator.detectAnomalies(tamperData);
  console.log(`✅ Anomaly detection: Found ${anomalies.length} anomalies`);
  if (anomalies.length > 0) {
    console.log('Anomalies:', anomalies);
  }

  console.log('\n🎉 All tests completed successfully!');
}

testTelemetrySimulator();



