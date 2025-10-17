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
  Center,
  useDisclosure,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input
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
  const [jobName, setJobName] = useState<string>(''); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const [selectedJob, setSelectedJob] = useState<string>('1');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

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

      const telemetryResponse = await fetch(`${API_BASE}/telemetrydata/job/${selectedJob}`);
      if (telemetryResponse.ok) {
        const rows = await telemetryResponse.json();
        // Map backend rows -> UI shape

        if (rows.length > 0 && rows[0].Jobs?.jobTitle) {
          setJobName(rows[0].Jobs.jobTitle);
        }
        const mapped = (rows || []).map((r: any) => ({
          timestamp: r.metadata?.timestamp || r.timeUploaded,
          payload_json: r.metadata?.measurements,
        }));
        setTelemetryData(mapped);
      }

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

  const handleUpload = async () => {
  if (!file) {
    toast({
      title: "No file selected",
      description: "Please select a JSON file to upload.",
      status: "warning",
      duration: 3000,
      isClosable: true,
    });
    return;
  }

  setUploading(true);

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const res = await fetch(`${API_BASE}/telemetrydata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobID: Number(selectedJob),
        Approved: false,
        metadata: parsed,
      }),
    });

    if (!res.ok) {
      throw new Error(`Upload failed (${res.status})`);
    }

    toast({
      title: "Telemetry data added",
      description: "The file was uploaded successfully.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    setFile(null);
    onClose();
    await fetchTelemetryData(); // refresh chart
  } catch (err: any) {
    console.error("Upload error:", err);
    toast({
      title: "Upload failed",
      description: err.message || "Unable to add telemetry data.",
      status: "error",
      duration: 4000,
      isClosable: true,
    });
  } finally {
    setUploading(false);
  }
};


  const processChartData = () => {
    if (!telemetryData.length) return [];

    const sorted = [...telemetryData].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sorted.map((record) => ({
      timestamp: new Date(record.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      power_kw: record.payload_json?.power_kw ?? 0,
      flaring_m3: record.payload_json?.flaring_m3 ?? 0,
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
            <Heading size="md" mb={4}>Real-time Telemetry Data {jobName ? `for ${jobName}` : `for Job ${selectedJob}`} </Heading>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {/* Power Consumption Chart */}
              <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <Text fontWeight="bold" mb={4}>Power Consumption (kW)</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
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
                    <XAxis dataKey="timestamp" />
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
          <Button colorScheme="green" onClick={onOpen}>
            Add Data
          </Button>
        </HStack>
        <Modal isOpen={isOpen} onClose={onClose} size="md">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Upload Telemetry JSON</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl>
                <FormLabel>Select JSON File</FormLabel>
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="green"
                onClick={handleUpload}
                isLoading={uploading}
                loadingText="Uploading..."
              >
                Upload
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

      </VStack>
    </Container>
  );
}



