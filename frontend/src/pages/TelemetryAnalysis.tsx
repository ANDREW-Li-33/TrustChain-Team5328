import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  VStack,
  HStack,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
  Center
} from '@chakra-ui/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface TelemetryData {
  timestamp: string;
  payload_json?: {
    power_kw: number;
    runtime_sec: number;
    flaring_m3: number;
  };
}

interface ToolSummary {
  tool: string;
  energy_saved_kwh: number;
  co2e_avoided_t: number;
  energy_consumption_kwh: number;
  flaring_m3: number;
}

interface AggregateData {
  job_id: string;
  period_start: string;
  period_end: string;
  tool_summaries: ToolSummary[];
  total_co2e_avoided_t: number;
  raw_log_hash: string;
  aggregate_hash: string;
}

export default function TelemetryAnalysis() {
  const [aggregateData, setAggregateData] = useState<AggregateData | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const [selectedJob, setSelectedJob] = useState<string>('1');

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5050';

  useEffect(() => {
    const jid = (params as any)?.jobId;
    if (jid) setSelectedJob(String(jid));
  }, [params]);

  useEffect(() => {
    fetchTelemetryData();
  }, [selectedJob]);

  const fetchTelemetryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // NOTE: Backend exposes /telemetrydata routes (no /api prefix)
      // 1) Fetch raw telemetry rows for the selected job
      const telemetryResponse = await fetch(`${API_BASE}/telemetrydata/job/${selectedJob}`);
      if (telemetryResponse.ok) {
        const rows = await telemetryResponse.json();
        // Map backend rows -> UI shape
        const mapped = (rows || []).map((r: any) => ({
          timestamp: r.timeUploaded,
          payload_json: r.metadata?.measurements,
        }));
        setTelemetryData(mapped);
      }

      // 2) (Optional) If you later add an aggregate endpoint, set it here.
      // For now, clear aggregate to avoid stale UI.
      setAggregateData(null);

    } catch (err) {
      setError('Failed to fetch telemetry data');
      console.error('Error fetching telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  const requestCarbonCredits = async () => {
    try {
      // This would trigger the carbon credits request process
      console.log('Requesting carbon credits for job:', selectedJob);
      // Implementation would go here
    } catch (err) {
      console.error('Error requesting carbon credits:', err);
    }
  };

  const processChartData = () => {
    if (!telemetryData.length) return [];

    // Group data by hour for better visualization
    const hourlyData = telemetryData.reduce((acc, record) => {
      const hour = new Date(record.timestamp).getHours();
      if (!acc[hour]) {
        acc[hour] = { hour, power_kw: 0, flaring_m3: 0, count: 0 };
      }
      const payload = record.payload_json as any;
      if (payload) {
        acc[hour].power_kw += payload.power_kw || 0;
        acc[hour].flaring_m3 += payload.flaring_m3 || 0;
      }
      acc[hour].count += 1;
      return acc;
    }, {} as any);

    return Object.values(hourlyData).map((data: any) => ({
      hour: `${data.hour}:00`,
      power_kw: Math.round((data.power_kw / data.count) * 100) / 100,
      flaring_m3: Math.round((data.flaring_m3 / data.count) * 100) / 100
    }));
  };

  if (loading) {
    return (
      <Center h="50vh">
        <VStack>
          <Spinner size="xl" />
          <Text>Loading telemetry data...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading mb={4}>Telemetry Analysis Dashboard</Heading>
          <Text color="gray.600">
            Real-time monitoring of CO2 emissions and energy consumption
          </Text>
        </Box>

        {/* Key Metrics */}
        {aggregateData && (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Stat p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <StatLabel>Total CO2 Avoided</StatLabel>
              <StatNumber color="green.500">
                {aggregateData.total_co2e_avoided_t.toFixed(3)} tCO2e
              </StatNumber>
              <StatHelpText>This period</StatHelpText>
            </Stat>

            <Stat p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <StatLabel>Energy Saved</StatLabel>
              <StatNumber color="blue.500">
                {aggregateData.tool_summaries.reduce((sum, tool) => sum + tool.energy_saved_kwh, 0).toFixed(1)} kWh
              </StatNumber>
              <StatHelpText>Total energy savings</StatHelpText>
            </Stat>

            <Stat p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <StatLabel>Active Tools</StatLabel>
              <StatNumber color="purple.500">
                {aggregateData.tool_summaries.length}
              </StatNumber>
              <StatHelpText>Tools contributing to savings</StatHelpText>
            </Stat>
          </SimpleGrid>
        )}

        {/* Tool Performance */}
        {aggregateData && (
          <Box>
            <Heading size="md" mb={4}>Tool Performance</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {aggregateData.tool_summaries.map((tool) => (
                <Box key={tool.tool} p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                  <Text fontWeight="bold" mb={2}>Tool {tool.tool}</Text>
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm">
                      CO2 Avoided: <Text as="span" color="green.500" fontWeight="bold">
                        {tool.co2e_avoided_t.toFixed(3)} tCO2e
                      </Text>
                    </Text>
                    <Text fontSize="sm">
                      Energy Saved: <Text as="span" color="blue.500" fontWeight="bold">
                        {tool.energy_saved_kwh.toFixed(1)} kWh
                      </Text>
                    </Text>
                    <Text fontSize="sm">
                      Flaring: <Text as="span" color="orange.500" fontWeight="bold">
                        {tool.flaring_m3.toFixed(1)} m³
                      </Text>
                    </Text>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Charts */}
        {telemetryData.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>Real-time Telemetry Data</Heading>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {/* Power Consumption Chart */}
              <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <Text fontWeight="bold" mb={4}>Power Consumption (kW)</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="power_kw" stroke="#3182ce" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              {/* Flaring Chart */}
              <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <Text fontWeight="bold" mb={4}>Flaring Volume (m³)</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="flaring_m3" fill="#e53e3e" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </SimpleGrid>
          </Box>
        )}

        {/* Carbon Credits Request */}
        {aggregateData && aggregateData.total_co2e_avoided_t > 0 && (
          <Box p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <VStack spacing={4}>
              <Text fontSize="lg" fontWeight="bold">
                Ready to Convert to Carbon Credits?
              </Text>
              <Text color="gray.600">
                You have {aggregateData.total_co2e_avoided_t.toFixed(3)} tCO2e available for carbon credit conversion.
              </Text>
              <Button
                colorScheme="green"
                size="lg"
                onClick={requestCarbonCredits}
              >
                Request Carbon Credits
              </Button>
            </VStack>
          </Box>
        )}

        {/* Refresh Button */}
        <HStack justify="center">
          <Button onClick={fetchTelemetryData} colorScheme="blue">
            Refresh Data
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}



