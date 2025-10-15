#!/usr/bin/env node

import TelemetrySimulator from './telemetrySimulator.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const scenario = args.find(arg => arg.startsWith('--scenario'))?.split('=')[1] || 'normal';
const jobId = args.find(arg => arg.startsWith('--job'))?.split('=')[1] || 'JOB-2025-001';
const duration = args.find(arg => arg.startsWith('--duration'))?.split('=')[1] || '1'; // hours
const interval = args.find(arg => arg.startsWith('--interval'))?.split('=')[1] || '60'; // seconds
const save = args.includes('--save');
const replay = args.find(arg => arg.startsWith('--replay'))?.split('=')[1];

console.log('🚀 TrustChain Telemetry Simulator');
console.log(`📊 Scenario: ${scenario}`);
console.log(`🔧 Job ID: ${jobId}`);
console.log(`⏱️  Duration: ${duration} hours`);
console.log(`📡 Interval: ${interval} seconds`);

const simulator = new TelemetrySimulator();

async function runSimulation() {
    try {
        let telemetryData;

        if (replay) {
            console.log(`📁 Replaying data from: ${replay}`);
            telemetryData = simulator.loadTelemetryData(replay);
        } else {
            console.log('🔄 Generating new telemetry data...');
            const startTime = new Date();
            const endTime = new Date(startTime.getTime() + (parseInt(duration) * 60 * 60 * 1000));
            
            telemetryData = simulator.generateTelemetryData(
                jobId,
                startTime,
                endTime,
                scenario,
                parseInt(interval)
            );
        }

        console.log(`📈 Generated ${telemetryData.length} telemetry messages`);

        // Generate daily aggregate
        const today = new Date();
        const aggregate = simulator.generateDailyAggregate(jobId, today, telemetryData);
        
        console.log('📊 Daily Aggregate MRV Package:');
        console.log(JSON.stringify(aggregate, null, 2));

        // Calculate total CO2 avoided
        const totalCO2Avoided = aggregate.tool_summaries.reduce((sum, tool) => sum + tool.co2e_avoided_t, 0);
        console.log(`🌱 Total CO2 Avoided: ${totalCO2Avoided.toFixed(3)} tCO2e`);

        if (save) {
            const filename = `telemetry_${jobId}_${scenario}_${Date.now()}.json`;
            simulator.saveTelemetryData(telemetryData, filename);
        }

        // Send to API if available
        if (process.env.API_URL) {
            console.log('📤 Sending telemetry data to API...');
            await sendToAPI(telemetryData);
        }

    } catch (error) {
        console.error('❌ Simulation failed:', error.message);
        process.exit(1);
    }
}

async function sendToAPI(telemetryData) {
    try {
        const response = await fetch(`${process.env.API_URL}/api/telemetry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(telemetryData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Telemetry data sent successfully:', result);
        } else {
            console.log('⚠️  API not available, data generated locally');
        }
    } catch (error) {
        console.log('⚠️  API not available, data generated locally');
    }
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node start.js [options]

Options:
  --scenario=<name>     Simulation scenario (normal|energyReduced|tamper) [default: normal]
  --job=<id>           Job ID for telemetry data [default: JOB-2025-001]
  --duration=<hours>    Duration in hours [default: 1]
  --interval=<seconds> Telemetry interval in seconds [default: 60]
  --save                Save generated data to file
  --replay=<file>       Replay data from saved file
  --help, -h            Show this help message

Examples:
  node start.js --scenario=normal --job=JOB-001 --save
  node start.js --scenario=energyReduced --duration=2 --interval=30
  node start.js --replay=telemetry_JOB-001_normal_1234567890.json
    `);
    process.exit(0);
}

runSimulation();



