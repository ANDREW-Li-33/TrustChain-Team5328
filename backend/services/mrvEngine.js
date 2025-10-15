import crypto from 'crypto';

class MRVEngine {
    constructor() {
        this.baselineEnergy = {
            'ABC': 150, // kWh/day
            'DEF': 200,
            'GHI': 100
        };
        this.emissionFactor = 0.00025; // tCO2e per kWh
        this.flareToCO2eFactor = 0.001; // tCO2e per m3 flared
    }

    // Calculate CO2 avoided for a single tool
    calculateCO2Avoided(tool, actualKwh, baselineKwh) {
        const energySaved = Math.max(0, baselineKwh - actualKwh);
        return energySaved * this.emissionFactor;
    }

    // Calculate CO2 avoided from flaring reduction
    calculateFlaringCO2Avoided(baselineFlare, actualFlare) {
        const flareReduction = Math.max(0, baselineFlare - actualFlare);
        return flareReduction * this.flareToCO2eFactor;
    }

    // Process telemetry data and calculate MRV metrics
    processTelemetryData(telemetryData) {
        const toolSummaries = [];
        const tools = [...new Set(telemetryData.map(t => t.tool))];

        for (const tool of tools) {
            const toolData = telemetryData.filter(t => t.tool === tool);
            if (toolData.length === 0) continue;

            // Calculate total energy consumption
            const totalKwh = toolData.reduce((sum, t) => {
                return sum + (t.measurements.power_kw * t.measurements.runtime_sec / 3600);
            }, 0);

            // Calculate total flaring
            const totalFlaring = toolData.reduce((sum, t) => sum + t.measurements.flaring_m3, 0);

            // Get baseline values
            const baselineKwh = this.baselineEnergy[tool] || 0;
            const baselineFlaring = 50; // m3/day baseline

            // Calculate CO2 avoided
            const energyCO2Avoided = this.calculateCO2Avoided(tool, totalKwh, baselineKwh);
            const flaringCO2Avoided = this.calculateFlaringCO2Avoided(baselineFlaring, totalFlaring);
            const totalCO2Avoided = energyCO2Avoided + flaringCO2Avoided;

            toolSummaries.push({
                tool: tool,
                energy_saved_kwh: Math.max(0, baselineKwh - totalKwh),
                flaring_reduction_m3: Math.max(0, baselineFlaring - totalFlaring),
                co2e_avoided_t: Math.round(totalCO2Avoided * 1000) / 1000,
                energy_consumption_kwh: Math.round(totalKwh * 100) / 100,
                flaring_m3: Math.round(totalFlaring * 100) / 100
            });
        }

        return toolSummaries;
    }

    // Generate daily aggregate MRV package
    generateDailyAggregate(jobId, periodStart, periodEnd, telemetryData) {
        const toolSummaries = this.processTelemetryData(telemetryData);
        
        // Calculate total CO2 avoided
        const totalCO2Avoided = toolSummaries.reduce((sum, tool) => sum + tool.co2e_avoided_t, 0);

        // Generate evidence hash
        const rawLogHash = crypto.createHash('sha256')
            .update(JSON.stringify(telemetryData))
            .digest('hex');

        // Generate aggregate hash
        const aggregateHash = crypto.createHash('sha256')
            .update(JSON.stringify(toolSummaries))
            .digest('hex');

        const aggregate = {
            job_id: jobId,
            period_start: periodStart,
            period_end: periodEnd,
            tool_summaries: toolSummaries,
            total_co2e_avoided_t: Math.round(totalCO2Avoided * 1000) / 1000,
            raw_log_hash: rawLogHash,
            aggregate_hash: aggregateHash,
            created_at: new Date().toISOString()
        };

        return aggregate;
    }

    // Verify telemetry data integrity
    verifyTelemetryIntegrity(telemetryData) {
        const issues = [];

        for (const record of telemetryData) {
            // Check for required fields
            if (!record.device_id || !record.tool || !record.job_id || !record.timestamp) {
                issues.push(`Missing required fields in record: ${JSON.stringify(record)}`);
            }

            // Check for valid tool
            if (!['ABC', 'DEF', 'GHI'].includes(record.tool)) {
                issues.push(`Invalid tool: ${record.tool}`);
            }

            // Check for reasonable power values
            if (record.measurements.power_kw < 0 || record.measurements.power_kw > 1000) {
                issues.push(`Unrealistic power value: ${record.measurements.power_kw} kW`);
            }

            // Check for reasonable runtime
            if (record.measurements.runtime_sec < 0 || record.measurements.runtime_sec > 86400) {
                issues.push(`Unrealistic runtime: ${record.measurements.runtime_sec} seconds`);
            }

            // Check for reasonable flaring values
            if (record.measurements.flaring_m3 < 0 || record.measurements.flaring_m3 > 1000) {
                issues.push(`Unrealistic flaring value: ${record.measurements.flaring_m3} m3`);
            }
        }

        // Check for monotonic timestamps
        const sortedData = telemetryData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        for (let i = 1; i < sortedData.length; i++) {
            const prevTime = new Date(sortedData[i-1].timestamp);
            const currTime = new Date(sortedData[i].timestamp);
            if (currTime < prevTime) {
                issues.push(`Non-monotonic timestamps detected`);
                break;
            }
        }

        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }

    // Detect anomalies in telemetry data
    detectAnomalies(telemetryData) {
        const anomalies = [];

        // Group by tool
        const toolGroups = {};
        telemetryData.forEach(record => {
            if (!toolGroups[record.tool]) {
                toolGroups[record.tool] = [];
            }
            toolGroups[record.tool].push(record);
        });

        for (const [tool, records] of Object.entries(toolGroups)) {
            const powerValues = records.map(r => r.measurements.power_kw);
            const baseline = this.baselineEnergy[tool];

            // Check for sudden drops (potential tampering)
            for (let i = 1; i < powerValues.length; i++) {
                const drop = powerValues[i-1] - powerValues[i];
                if (drop > baseline * 0.5) { // More than 50% drop
                    anomalies.push({
                        type: 'sudden_power_drop',
                        tool: tool,
                        timestamp: records[i].timestamp,
                        drop_percentage: Math.round((drop / powerValues[i-1]) * 100)
                    });
                }
            }

            // Check for unrealistic values
            const avgPower = powerValues.reduce((sum, p) => sum + p, 0) / powerValues.length;
            if (avgPower < baseline * 0.1) { // Less than 10% of baseline
                anomalies.push({
                    type: 'unrealistic_low_power',
                    tool: tool,
                    average_power: Math.round(avgPower * 100) / 100,
                    baseline: baseline
                });
            }
        }

        return anomalies;
    }
}

export default MRVEngine;


