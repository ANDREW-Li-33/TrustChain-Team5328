import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  FormHelperText
} from "@chakra-ui/react";
import { CheckIcon, CloseIcon, ArrowBackIcon } from "@chakra-ui/icons";

type PendingRequest = {
  requestID: number;
  operatorID: number;
  jobID: number;
  status: string;
  requestTimestamp: string;
  verificationTimestamp: string | null;
  denialReason?: string | null;
  verificationNotes?: string | null;
  notes?: string | null;
  operator?: {
    userID: number;
    organizationName: string | null;
    email: string;
  };
};

type Job = {
  jobID: number;
  operatorID: number;
  toolID: number;
  status: string;
  dateCreated: string;
  jobTitle: string;
};

type TelemetryData = {
  entryID: number;
  jobID: number;
  Approved: boolean;
  timeUploaded: string;
  metadata: any;
};

type Operator = {
  userID: number;
  firebaseUID: string;
  email: string;
  organizationName: string | null;
};

export default function VerifierEvidenceReview() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { requestId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen: isApproveOpen, onOpen: onApproveOpen, onClose: onApproveClose } = useDisclosure();
  const { isOpen: isDenyOpen, onOpen: onDenyOpen, onClose: onDenyClose } = useDisclosure();

  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(0);
  const [denialReason, setDenialReason] = useState<string>("");

  useEffect(() => {
    fetchEvidencePackage();
  }, [requestId]);

  const fetchEvidencePackage = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch the request
      const requestResponse = await fetch(`${API}/pendingrequests/${requestId}`);
      if (!requestResponse.ok) throw new Error("Failed to fetch request");
      const requestData = await requestResponse.json();
      setRequest(requestData);

      // 2. Fetch job details
      const jobResponse = await fetch(`${API}/jobs/${requestData.jobID}`);
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData);
      }

      // 3. Fetch operator details
      const operatorResponse = await fetch(`${API}/users/${requestData.operatorID}`);
      if (operatorResponse.ok) {
        const operatorData = await operatorResponse.json();
        setOperator(operatorData);
      }

      // 4. Fetch telemetry data
      const telemetryResponse = await fetch(`${API}/telemetrydata/job/${requestData.jobID}`);
      if (telemetryResponse.ok) {
        const telemetryDataResponse = await telemetryResponse.json();
        setTelemetryData(telemetryDataResponse);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load evidence package");
      console.error("Error loading evidence:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;

    setActionLoading(true);
    try {
      // Update request status
      const updateResponse = await fetch(`${API}/pendingrequests/${request.requestID}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Approved",
          verificationTimestamp: new Date().toISOString(),
          quality: quality,
        }),
      });

      if (!updateResponse.ok) throw new Error("Failed to approve request");

      // Approve all telemetry data
      // for (const telemetry of telemetryData) {
      //   await fetch(`${API}/telemetrydata/${telemetry.entryID}/approve`, {
      //     method: "PUT",
      //   });
      // }

      toast({
        title: "Request Approved",
        description: "The evidence package has been verified and the job has been minted.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Navigate back to dashboard
      setTimeout(() => navigate("/verifier"), 1500);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to approve request",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
      onApproveClose();
    }
  };

  const handleDeny = async () => {
    if (!request) return;

    if (!denialReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for denying this request.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setActionLoading(true);
    try {
        const response = await fetch(`${API}/pendingrequests/${request.requestID}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: "Denied",
                verificationTimestamp: new Date().toISOString(),
                denialReason: denialReason.trim(),
            }),
        });

      if (!response.ok) throw new Error("Failed to deny request");

      toast({
        title: "Request Denied",
        description: "The evidence package has been rejected.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });

      setTimeout(() => navigate("/verifier"), 1500);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to deny request",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
      setDenialReason(""); // Reset comment
      onDenyClose();
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading evidence package...</Text>
        </VStack>
      </Container>
    );
  }

  if (error || !request) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          {error || "Request not found"}
        </Alert>
        <Button mt={4} leftIcon={<ArrowBackIcon />} onClick={() => navigate("/verifier")}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const canApprove = request.status === "Pending" || request.status === "On Hold";

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="ghost"
              onClick={() => navigate("/verifier")}
            >
              Back to Dashboard
            </Button>
            <Heading size="lg">Evidence Package Review</Heading>
          </HStack>
          <Badge
            fontSize="lg"
            px={4}
            py={2}
            colorScheme={
              request.status === "Pending"
                ? "orange"
                : request.status === "Approved"
                ? "green"
                : request.status === "Denied"
                ? "red"
                : "yellow"
            }
          >
            {request.status}
          </Badge>
        </HStack>

        {/* Summary Stats */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Request ID</StatLabel>
                <StatNumber>#{request.requestID}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Job ID</StatLabel>
                <StatNumber>#{request.jobID}</StatNumber>
                <StatHelpText>{job?.jobTitle}</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Telemetry Records</StatLabel>
                <StatNumber>{telemetryData.length}</StatNumber>
                <StatHelpText>Data points</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Submitted</StatLabel>
                <StatNumber fontSize="md">
                  {new Date(request.requestTimestamp).toLocaleDateString()}
                </StatNumber>
                <StatHelpText>
                  {new Date(request.requestTimestamp).toLocaleTimeString()}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Request Information */}
        <Card>
          <CardHeader>
            <Heading size="md">Request Information</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={3}>
              <HStack>
                <Text fontWeight="bold" minW="150px">
                  Status:
                </Text>
                <Badge
                  colorScheme={
                    request.status === "Pending"
                      ? "orange"
                      : request.status === "Approved"
                      ? "green"
                      : request.status === "Denied"
                      ? "red"
                      : "yellow"
                  }
                >
                  {request.status}
                </Badge>
              </HStack>
              <HStack>
                <Text fontWeight="bold" minW="150px">
                  Operator:
                </Text>
                <Text>
                  {operator?.organizationName || `Operator #${request.operatorID}`}
                </Text>
              </HStack>
              <HStack>
                <Text fontWeight="bold" minW="150px">
                  Email:
                </Text>
                <Text>{operator?.email}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="bold" minW="150px">
                  Request Timestamp:
                </Text>
                <Text>{new Date(request.requestTimestamp).toLocaleString()}</Text>
              </HStack>
              {request.verificationTimestamp && (
                <HStack>
                  <Text fontWeight="bold" minW="150px">
                    Verified Date:
                  </Text>
                  <Text>{new Date(request.verificationTimestamp).toLocaleString()}</Text>
                </HStack>
              )}
              {request.status === "Denied" && (request.denialReason || request.verificationNotes || request.notes) && (
                <VStack align="start" spacing={2} width="100%">
                  <Text fontWeight="bold" minW="150px">
                    Denial Reason:
                  </Text>
                  <Alert status="error" width="100%" borderRadius="md">
                    <AlertIcon />
                    <Text whiteSpace="pre-wrap">
                      {request.denialReason || request.verificationNotes || request.notes}
                    </Text>
                  </Alert>
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Job Details */}
        {job && (
          <Card>
            <CardHeader>
              <Heading size="md">Job Details</Heading>
            </CardHeader>
            <CardBody>
              <VStack align="start" spacing={3}>
                <HStack>
                  <Text fontWeight="bold" minW="150px">
                    Job Title:
                  </Text>
                  <Text>{job.jobTitle}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="150px">
                    Tool ID:
                  </Text>
                  <Text>{job.toolID}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="150px">
                    Job Status:
                  </Text>
                  <Badge>{job.status}</Badge>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="150px">
                    Created:
                  </Text>
                  <Text>{new Date(job.dateCreated).toLocaleString()}</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Telemetry Evidence */}
        <Card>
          <CardHeader>
            <Heading size="md">Telemetry Evidence ({telemetryData.length} records)</Heading>
            <Text fontSize="sm" color="gray.600" mt={2}>
              Review each telemetry data entry below. Expand to see raw metadata.
            </Text>
          </CardHeader>
          <CardBody>
            {telemetryData.length === 0 ? (
              <Alert status="warning">
                <AlertIcon />
                No telemetry data found for this job
              </Alert>
            ) : (
              <Accordion allowMultiple>
                {telemetryData.map((data, index) => (
                  <AccordionItem key={data.entryID}>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left">
                          <HStack>
                            <Badge colorScheme="blue">Entry #{data.entryID}</Badge>
                            <Text fontWeight="bold">
                              Record {index + 1} of {telemetryData.length}
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

        {/* Already Complete Notice */}
        {!canApprove && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text>
              This request has already been {request.status.toLowerCase()} and cannot be modified.
            </Text>
          </Alert>
        )}

        {/* Action Buttons */}
        <HStack justify="flex-end" spacing={4}>

          {canApprove && (
            <>
              <Button
                colorScheme="red"
                leftIcon={<CloseIcon />}
                onClick={onDenyOpen}
                isDisabled={actionLoading}
              >
                Deny Request
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<CheckIcon />}
                onClick={onApproveOpen}
                isDisabled={actionLoading}
                size="lg"
              >
                Approve and Mark Ready for Minting
              </Button>
            </>
          )}
        </HStack>
      </VStack>

      {/* Approve Confirmation Modal */}
      <Modal isOpen={isApproveOpen} onClose={onApproveClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Approval</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="start" spacing={3}>
              <Text>
                Are you sure you want to approve this evidence package?
              </Text>
              <Alert status="warning">
                <AlertIcon />
                <Text fontSize="sm">
                Review all telemetry evidence carefully before approving. Approval will:
              </Text>


              </Alert>
              <Box as="ul" pl={20} fontSize="sm">
                <li>Mark this job as "Ready for Minting"</li>
                <li>Create a carbon credit token</li>
                <li>Approve all telemetry data</li>
                <li>Record this verification permanently</li>
              </Box>

              <FormControl mt={4} isRequired>
                <FormLabel>Quality Score</FormLabel>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  placeholder="Enter quality score (0–100)"
                />
                <FormHelperText>
                  Assign a quality score for the verified credits.
                </FormHelperText>
              </FormControl>

            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onApproveClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleApprove}
              isLoading={actionLoading}
            >
              Confirm Approval
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Deny Confirmation Modal */}
      <Modal isOpen={isDenyOpen} onClose={onDenyClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Denial</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="start" spacing={4}>
              <Text>
                Are you sure you want to deny this evidence package? This action cannot be undone.
              </Text>
              <Alert status="warning">
                <AlertIcon />
                <Text fontSize="sm">
                  Please provide a reason for denial. This will be visible to the operator.
                </Text>
              </Alert>
              <FormControl isRequired>
                <FormLabel>Reason for Denial</FormLabel>
                <Textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  placeholder="Enter the reason for denying this request (e.g., insufficient evidence, data quality issues, missing documentation...)"
                  rows={4}
                  resize="vertical"
                />
                <FormHelperText>
                  Provide a clear explanation that will help the operator understand why the request was denied.
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { setDenialReason(""); onDenyClose(); }}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeny}
              isLoading={actionLoading}
              isDisabled={!denialReason.trim()}
            >
              Confirm Denial
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}