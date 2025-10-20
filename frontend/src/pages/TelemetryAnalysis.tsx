import React, { useState, useEffect, useContext } from 'react';
import { Context } from '../context/authContext';
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
  Input,
  Badge,
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

type UserRow = {
  userID: number;
  firebaseUID: string;
  email?: string | null;
};

type JobStatus = 'Active' | 'Completed' | 'Paused' | 'Minted';

export default function TelemetryAnalysis() {
  const [aggregateData, setAggregateData] = useState<AggregateData | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [jobName, setJobName] = useState<string>(''); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>('Active');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const { user } = useContext<any>(Context);

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5050';

  useEffect(() => {
    const jid = (params as any)?.jobId;
    if (jid) setSelectedJob(String(jid));
  }, [params]);

  useEffect(() => {
    if (selectedJob) {
      fetchTelemetryData();
      checkPendingRequests();
    }
  }, [selectedJob]);

  const fetchTelemetryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const telemetryResponse = await fetch(`${API_BASE}/telemetrydata/job/${selectedJob}`);
      const jobResponse = await fetch(`${API_BASE}/jobs/${selectedJob}`);
      
      if (!jobResponse.ok) {
        throw new Error('Failed to fetch job details, error 1 in TelemetryAnalysis');
      }
      
      const job = await jobResponse.json();
      setJobName(job.jobTitle || "Error fetching Job Title");
      setJobStatus(job.status || "Error fetching Job Status");
      
      if (telemetryResponse.ok) {
        const rows = await telemetryResponse.json();
        const mapped = (rows || []).map((r: any) => ({
          timestamp: r.metadata?.timestamp || r.timeUploaded,
          payload_json: r.metadata?.measurements,
          // Flatten the measurements for easier access
          power_kw: r.metadata?.measurements?.power_kw,
          runtime_sec: r.metadata?.measurements?.runtime_sec,
          flaring_m3: r.metadata?.measurements?.flaring_m3,
          methane_ppm: r.metadata?.measurements?.methane_ppm,
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

  const handleResumeJob = async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${selectedJob}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({
        title: "Job resumed",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setJobStatus("Active");
    } catch (err) {
      console.error("Resume job error:", err);
      toast({
        title: "Error resuming job",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCompleteJob = async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${selectedJob}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      if (!res.ok) throw new Error("Failed to mark job complete");
      toast({
        title: "Job marked as completed",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setJobStatus("Completed");
      setIsConfirmOpen(false);
    } catch (err) {
      console.error("Complete job error:", err);
      toast({
        title: "Error completing job",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const requestCarbonCredits = async () => {
    try {
      console.log('Requesting carbon credits for job:', selectedJob);
    } catch (err) {
      console.error('Error requesting carbon credits:', err);
    }
  };

  const checkPendingRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/pendingrequests/job/${selectedJob}`);
      if (!res.ok) {
        setHasPendingRequest(false);
        return;
      }
      const requests = await res.json();
      setHasPendingRequest(requests.length > 0);
    } catch (err) {
      console.log('Error checking pending requests:', err);
      setHasPendingRequest(true);
    }
  }

  const handleVerificationRequest = async () => {
    try {
      if (!user) {
        toast({
          title: "Not logged in",
          description: "Please log in to request verification.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      if (jobStatus === 'Minted') {
        toast({
          title: "Already minted",
          description: "This job has already been verified and minted as a carbon credit.",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      const uRes = await fetch(`${API_BASE}/users`);
      const users: UserRow[] = await uRes.json();
      const me = users.find((u) => String(u.firebaseUID) === String(user.uid)) ||
        users.find(
          (u) =>
            u.email &&
            user.email &&
            u.email.toLowerCase() === user.email.toLowerCase()
        );
      if (!me) throw new Error("No matching user in the DB");
      const operatorID = me.userID;

      const res = await fetch(`${API_BASE}/pendingrequests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorID,
          jobID: Number(selectedJob),
          status: "Pending"
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      toast({
        title: "Verification requested",
        description: "Your request has been submitted for verification.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setHasPendingRequest(true);
      setIsVerifyOpen(false);
    } catch (err: any) {
      console.error('Error requesting verification:', err);
      toast({
        title: "Request failed",
        description: err.message || "Unable to submit verification request.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  }

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

    if (jobStatus === 'Minted') {
      toast({
        title: "Upload not allowed",
        description: "Cannot upload data to a minted job. The job has already been verified and minted as a carbon credit.",
        status: "error",
        duration: 5000,
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
        const errorData = await res.json();
        throw new Error(errorData.error || `Upload failed (${res.status})`);
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
      await fetchTelemetryData();
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
      power_kw: record.power_kw ?? 0,
      flaring_m3: record.flaring_m3 ?? 0,
      runtime_sec: record.runtime_sec ?? 0,
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
          <HStack justify="space-between" mb={2}>
            <Heading mb={4}>Telemetry Analysis Dashboard</Heading>
            {jobStatus === 'Minted' && (
              <Badge colorScheme="purple" fontSize="lg" px={4} py={2}>
                ✓ Minted as Carbon Credit
              </Badge>
            )}
          </HStack>
          <Text color="gray.600">
            Real-time monitoring of CO2 emissions and energy consumption
            {jobName && ` for ${jobName}`}
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

        {/* Final Statistics from Last Measurement */}
        {telemetryData.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>Final Measurement Statistics</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              <Stat p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <StatLabel>Final Power Consumption</StatLabel>
                <StatNumber color="blue.500">
                  {telemetryData[telemetryData.length - 1]?.power_kw?.toFixed(1) || 'N/A'} kW
                </StatNumber>
                <StatHelpText>Latest measurement</StatHelpText>
              </Stat>

              <Stat p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <StatLabel>Final Flaring Volume</StatLabel>
                <StatNumber color="red.500">
                  {telemetryData[telemetryData.length - 1]?.flaring_m3?.toFixed(2) || 'N/A'} m³
                </StatNumber>
                <StatHelpText>Latest measurement</StatHelpText>
              </Stat>

              <Stat p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <StatLabel>Final Runtime</StatLabel>
                <StatNumber color="green.500">
                  {telemetryData[telemetryData.length - 1]?.runtime_sec?.toFixed(0) || 'N/A'} sec
                </StatNumber>
                <StatHelpText>Latest measurement</StatHelpText>
              </Stat>
            </SimpleGrid>
          </Box>
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
            <Heading size="md" mb={4}>
              Real-time Telemetry Data {jobName ? `for ${jobName}` : `for Job ${selectedJob}`}
            </Heading>
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
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

              {/* Runtime Chart */}
              <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <Text fontWeight="bold" mb={4}>Runtime (seconds)</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="runtime_sec" stroke="#38a169" strokeWidth={2} />
                  </LineChart>
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

        {/* Action Buttons */}
        <HStack justify="center" spacing={4} flexWrap="wrap">
          <Button onClick={fetchTelemetryData} colorScheme="blue">
            Refresh Data
          </Button>

          {/* Show minted status */}
          {jobStatus === "Minted" && (
            <Alert status="success" variant="subtle" borderRadius="md" maxW="400px">
              <AlertIcon />
              This job has been verified and minted as a carbon credit
            </Alert>
          )}

          {/* Show verification options for completed jobs */}
          {jobStatus === "Completed" && !hasPendingRequest && (
            <Button colorScheme="green" size="lg" onClick={() => setIsVerifyOpen(true)}>
              Request Verification
            </Button>
          )}

          {jobStatus === "Completed" && hasPendingRequest && (
            <Button colorScheme="gray" size="lg" isDisabled>
              Request Currently Pending
            </Button>
          )}

          {/* Upload button only for active jobs */}
          {jobStatus === "Active" && (
            <Button colorScheme="green" onClick={onOpen}>
              Upload Data
            </Button>
          )}

          {/* Resume button for paused jobs */}
          {jobStatus === "Paused" && (
            <Button colorScheme="yellow" onClick={handleResumeJob}>
              Resume Job
            </Button>
          )}

          {/* Complete button for active/paused jobs */}
          {(jobStatus === "Active" || jobStatus === "Paused") && (
            <Button colorScheme="red" onClick={() => setIsConfirmOpen(true)}>
              Mark Job as Complete
            </Button>
          )}
        </HStack>

        {/* Upload Modal */}
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
              {jobStatus === 'Minted' && (
                <Alert status="error" mt={4}>
                  <AlertIcon />
                  Cannot upload to a minted job
                </Alert>
              )}
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
                isDisabled={jobStatus === 'Minted'}
              >
                Upload
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Confirm Complete Modal */}
        <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Confirm Completion</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text>
                This action cannot be undone, and Telemetry data cannot be uploaded to a completed job.
                Continue?
              </Text>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => setIsConfirmOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleCompleteJob}>
                Continue
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Verify Modal */}
        <Modal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Request Verification</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text mb={4}>
                To begin the process of turning this data into a carbon credit, it must first
                be verified by our internal system.
              </Text>
              <Text>
                To begin the process of verification, press the button below. You will be
                notified when verification is complete.
              </Text>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => setIsVerifyOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="green" onClick={handleVerificationRequest}>
                Begin Verification
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
}