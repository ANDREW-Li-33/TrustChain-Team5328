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
  IconButton,
  Tooltip as ChakraToolTip,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface TelemetryData {
  timestamp: string;
  payload_json?: {
    power_kw?: number;
    runtime_sec?: number;
    flaring_m3?: number;
    TotalCO2Saved?: number;
  };
  // Flattened optional properties for easier access in UI and processing
  power_kw?: number;
  runtime_sec?: number;
  flaring_m3?: number;
  TotalCO2Saved?: number;
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
  role: string;
  organizationName?: string | null;
};

type JobStatus = 'Active' | 'Completed' | 'Paused' | 'Minted' | 'Denied';

type TelemetryDataRow = {
  entryID: number;
  jobID: number;
  Approved: boolean;
  timeUploaded: string;
  metadata: any;
};

type Job = {
  jobID: number;
  operatorID: number;
  toolID: number;
  status: string;
  dateCreated: string;
  jobTitle: string;
};

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
  const [pendingRequestData, setPendingRequestData] = useState<any>(null);
  const { user } = useContext<any>(Context);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin verifier view data
  const [job, setJob] = useState<Job | null>(null);
  const [operator, setOperator] = useState<UserRow | null>(null);
  const [telemetryRawData, setTelemetryRawData] = useState<TelemetryDataRow[]>([]);

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

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
  
      try {
        const res = await fetch(`${API_BASE}/users`);
        const users: UserRow[] = await res.json();
  
        const me =
          users.find((u) => String(u.firebaseUID) === String(user.uid)) ||
          users.find(
            (u) => u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()
          );
  
        if (me) {
          const userRole = me.role?.toLowerCase();
          setIsAdmin(userRole === "slb_admin" || userRole === "slb admin");
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        setIsAdmin(false);
      }
    };
  
    checkAdminStatus();
  }, [user, API_BASE]);

  const fetchTelemetryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch job details
      const jobResponse = await fetch(`${API_BASE}/jobs/${selectedJob}`);
      if (!jobResponse.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      const jobData = await jobResponse.json();
      setJob(jobData);
      setJobName(jobData.jobTitle || "Error fetching Job Title");
      setJobStatus(jobData.status || "Error fetching Job Status");

      // Fetch operator details if admin
      if (isAdmin && jobData.operatorID) {
        const operatorResponse = await fetch(`${API_BASE}/users/${jobData.operatorID}`);
        if (operatorResponse.ok) {
          const operatorData = await operatorResponse.json();
          setOperator(operatorData);
        }
      }

      // Fetch telemetry data
      const telemetryResponse = await fetch(`${API_BASE}/telemetrydata/job/${selectedJob}`);
      if (telemetryResponse.ok) {
        const rows = await telemetryResponse.json();
        
        // Store raw data for verifier view
        setTelemetryRawData(rows);

        // Map for chart display
        const mapped = (rows || []).map((r: any) => ({
          timestamp: r.metadata?.timestamp || r.timeUploaded,
          payload_json: r.metadata?.measurements,
          power_kw: r.metadata?.measurements?.power_kw,
          runtime_sec: r.metadata?.measurements?.runtime_sec,
          flaring_m3: r.metadata?.measurements?.flaring_m3,
          TotalCO2Saved: r.metadata?.measurements?.TotalCO2Saved,
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

  const checkPendingRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/pendingrequests/job/${selectedJob}`);
      if (!res.ok) {
        setHasPendingRequest(false);
        setPendingRequestData(null);
        return;
      }
      const requests = await res.json();
      const hasPending = requests.length > 0;
      setHasPendingRequest(hasPending);
      // Store the most recent request
      if (hasPending && requests.length > 0) {
        // Sort by requestID descending to get the most recent
        const sortedRequests = requests.sort((a: any, b: any) => b.requestID - a.requestID);
        setPendingRequestData(sortedRequests[0]);
      } else {
        setPendingRequestData(null);
      }
    } catch (err) {
      console.log('Error checking pending requests:', err);
      setHasPendingRequest(true);
      setPendingRequestData(null);
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
          description: "This job is already ready for minting or has been minted.",
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
        description: "Cannot upload data to a job that is ready for minting or already minted.",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return { bg: "green.100", color: "green.800" };
      case "Paused":
        return { bg: "yellow.100", color: "yellow.800" };
      case "Ready for Minting":
      case "Minted":
        return { bg: "purple.100", color: "purple.800" };
      case "Denied":
        return { bg: "red.100", color: "red.800" };
      case "Active":
      default:
        return { bg: "blue.100", color: "blue.800" };
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
      TotalCO2Saved: record.TotalCO2Saved ?? 0,
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
            {isAdmin && (
              <Badge colorScheme="purple" fontSize="lg" px={4} py={2}>
                Admin View
              </Badge>
            )}

            <Badge
              fontSize="lg"
              px={4}
              py={2}
              bg={getStatusColor(jobStatus).bg}
              color={getStatusColor(jobStatus).color}
            >
              {jobStatus}
            </Badge>
          </HStack>
          <Text color="gray.600">
            Real-time monitoring of CO2 emissions and energy consumption
            {jobName && ` for ${jobName}`}
          </Text>
        </Box>

        {/* Regular telemetry content (charts, stats, etc.) - keeping existing code */}
        {aggregateData && (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Stat p={6} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <StatLabel>Total CO2 Avoided</StatLabel>
              <StatNumber color="green.500">
                {aggregateData.total_co2e_avoided_t.toFixed(3)} tCO2e
              </StatNumber>
              <StatHelpText>This period</StatHelpText>
            </Stat>
            {/* ... rest of your existing aggregate stats ... */}
          </SimpleGrid>
        )}

        {/* Final Statistics */}
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
                <StatLabel>Final Tons of CO2 Saved</StatLabel>
                <StatNumber color="green.500">
                  {telemetryData[telemetryData.length - 1]?.TotalCO2Saved?.toFixed(1) || 'N/A'} Tons
                </StatNumber>
                <StatHelpText>Latest measurement</StatHelpText>
              </Stat>
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

              <Box p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                <Text fontWeight="bold" mb={4}>Tons of CO2 Saved</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="TotalCO2Saved" stroke="#38a169" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </SimpleGrid>
          </Box>
        )}

        {/* ADMIN ONLY: Verifier Evidence View */}
        {isAdmin && (
          <>
            
            <Box>
              <Heading size="lg" mb={4} color="purple.600">
                Verifier Evidence Package
              </Heading>
            </Box>

            {/* Job Details */}
            {job && (
              <Card bg={bgColor} borderColor="purple.200" borderWidth="2px">
                <CardHeader>
                  <Heading size="md">Job Details</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="start" spacing={3}>
                    <HStack>
                      <Text fontWeight="bold" minW="150px">Job Title:</Text>
                      <Text>{job.jobTitle}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="150px">Job ID:</Text>
                      <Text>{job.jobID}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="150px">Operator:</Text>
                      <Text>{operator?.organizationName || `Operator #${job.operatorID}`}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="150px">Operator Email:</Text>
                      <Text>{operator?.email || 'N/A'}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="150px">Tool ID:</Text>
                      <Text>{job.toolID}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="150px">Job Status:</Text>
                      <Badge>{job.status}</Badge>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="150px">Created:</Text>
                      <Text>{new Date(job.dateCreated).toLocaleString()}</Text>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* Telemetry Evidence */}
            <Card bg={bgColor} borderColor="purple.200" borderWidth="2px">
              <CardHeader>
                <Heading size="md">Telemetry Evidence ({telemetryRawData.length} records)</Heading>
                <Text fontSize="sm" color="gray.600" mt={2}>
                  Raw telemetry data entries that a verifier would review
                </Text>
              </CardHeader>
              <CardBody>
                {telemetryRawData.length === 0 ? (
                  <Alert status="warning">
                    <AlertIcon />
                    No telemetry data found for this job
                  </Alert>
                ) : (
                  <Accordion allowMultiple>
                    {telemetryRawData.map((data, index) => (
                      <AccordionItem key={data.entryID}>
                        <h2>
                          <AccordionButton>
                            <Box flex="1" textAlign="left">
                              <HStack>
                                <Badge colorScheme="blue">Entry #{data.entryID}</Badge>
                                <Text fontWeight="bold">
                                  Record {index + 1} of {telemetryRawData.length}
                                </Text>
                                <Divider orientation="vertical" h="20px" />
                                <Text fontSize="sm" color="gray.600">
                                  Uploaded: {new Date(data.timeUploaded).toLocaleString()}
                                </Text>
                                <Divider orientation="vertical" h="20px" />
                                <Badge colorScheme={data.Approved ? "green" : "yellow"}>
                                  {data.Approved ? "Approved" : "Pending"}
                                </Badge>
                              </HStack>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                        </h2>
                        <AccordionPanel pb={4}>
                          <VStack align="stretch" spacing={4}>
                            {/* Summary Info */}
                            {data.metadata?.measurements && (
                              <Box p={4} bg="blue.50" borderRadius="md">
                                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">
                                      Power Consumption
                                    </Text>
                                    <Text fontSize="lg" fontWeight="bold">
                                      {data.metadata.measurements.power_kw || 0} kW
                                    </Text>
                                  </Box>
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">
                                      Runtime
                                    </Text>
                                    <Text fontSize="lg" fontWeight="bold">
                                      {((data.metadata.measurements.runtime_sec || 0) / 3600).toFixed(2)} hours
                                    </Text>
                                  </Box>
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">
                                      Flaring
                                    </Text>
                                    <Text fontSize="lg" fontWeight="bold">
                                      {data.metadata.measurements.flaring_m3 || 0} m³
                                    </Text>
                                  </Box>
                                </SimpleGrid>
                              </Box>
                            )}

                            {/* Raw Metadata */}
                            <Box>
                              <Text fontWeight="bold" mb={2}>
                                Raw Metadata (JSON):
                              </Text>
                              <Box
                                p={4}
                                bg="gray.900"
                                color="green.300"
                                borderRadius="md"
                                overflowX="auto"
                                fontFamily="mono"
                                fontSize="sm"
                              >
                                <Code
                                  display="block"
                                  whiteSpace="pre"
                                  bg="transparent"
                                  color="green.300"
                                >
                                  {JSON.stringify(data.metadata, null, 2)}
                                </Code>
                              </Box>
                            </Box>
                          </VStack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardBody>
            </Card>
          </>
        )}

        {/* Action Buttons (existing code) */}
        <HStack justify="center" spacing={4} flexWrap="wrap">
          <ChakraToolTip label="Refresh Data" fontSize="md">
            <IconButton onClick={fetchTelemetryData} colorScheme="blue" aria-label='Refresh Data' icon={<RepeatIcon />}/>
          </ChakraToolTip>
          
          {jobStatus === 'Minted' && (
            <Alert status="success" variant="subtle" borderRadius="md" maxW="400px">
              <AlertIcon />
              This job has been verified and marked for ready to mint as a carbon credit
            </Alert>
          )}

          {jobStatus === 'Denied' && (
            <Alert status="error" variant="subtle" borderRadius="md" maxW="600px">
              <AlertIcon />
              <Text fontWeight="bold">
                This job has been denied
              </Text>
            </Alert>
          )}  

          {jobStatus === "Completed" && !hasPendingRequest && !isAdmin && (
            <Button colorScheme="green" size="lg" onClick={() => setIsVerifyOpen(true)}>
              Request Verification
            </Button>
          )}

          {jobStatus === "Completed" && hasPendingRequest && (
            <VStack align="stretch" spacing={2} maxW="600px">
              <Button colorScheme="gray" size="lg" isDisabled>
                Request Currently Pending
              </Button>
            </VStack>
          )}

          {jobStatus === "Active" && !isAdmin && (
            <Button colorScheme="gray" onClick={onOpen}>
              Upload Data
            </Button>
          )}

          {jobStatus === "Paused" && !isAdmin && (
            <Button colorScheme="orange" onClick={handleResumeJob}>
              Resume Job
            </Button>
          )}

          {jobStatus === "Active" && !isAdmin && (
            <Button colorScheme="green" onClick={() => setIsConfirmOpen(true)}>
              Mark as Complete
            </Button>
          )}
        </HStack>
      </VStack>

      {/* Modals (existing code) */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload Telemetry Data</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Select JSON file</FormLabel>
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
              colorScheme="blue"
              onClick={handleUpload}
              isLoading={uploading}
            >
              Upload
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Mark Job as Complete</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Are you sure you want to mark this job as completed?</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleCompleteJob}>
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Verification</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Submit this job for verification? A verifier will review your telemetry data.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsVerifyOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleVerificationRequest}>
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}