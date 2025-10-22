import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../context/authContext";
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  HStack,
  VStack,
  Input,
  Select,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Badge,
  useDisclosure,
  useToast,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
} from "@chakra-ui/react";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../firebase/firebase";

type PendingRequest = {
  requestID: number;
  operatorID: number;
  jobID: number;
  status: string;
  requestTimestamp: string;
  verificationTimestamp: string | null;
  operator?: {
    userID: number;
    organizationName: string | null;
    email: string;
  };
  currJob: {
    jobID: number;
    jobTitle: string;
  };
};

type Job = {
  jobID: number;
  operatorID: number;
  toolID: number;
  status: string;
  dateCreated: string;
};

type Operator = {
  userID: number;
  firebaseUID: string;
  email: string;
  organizationName: string | null;
};

type TelemetryData = {
  entryID: number;
  jobID: number;
  Approved: boolean;
  timeUploaded: string;
  metadata: any;
};

export default function VerifierDashboard() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();
  const auth = getAuth(app);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(
    null
  );
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [operatorDetails, setOperatorDetails] = useState<Operator | null>(null);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log("User signed out successfully.");
        navigate("/login");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
        toast({
          title: "Sign Out Error",
          description: "Failed to sign out. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchRequests();
  }, [API, user]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API}/pendingrequests`);
      if (!response.ok)
        throw new Error(`Failed to fetch requests (${response.status})`);
      const data = await response.json();
      setRequests(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = async (request: PendingRequest) => {
    setSelectedRequest(request);
    setModalLoading(true);
    onOpen();

    try {
      // get job details
      const jobResponse = await fetch(`${API}/jobs/${request.jobID}`);
      if (jobResponse.ok) {
        const job = await jobResponse.json();
        setJobDetails(job);
      }

      const operatorResponse = await fetch(
        `${API}/users/${request.operatorID}`
      );
      if (operatorResponse.ok) {
        const operator = await operatorResponse.json();
        setOperatorDetails(operator);
      }

      // get telemetry data
      const telemetryResponse = await fetch(
        `${API}/telemetrydata/job/${request.jobID}`
      );
      if (telemetryResponse.ok) {
        const telemetry = await telemetryResponse.json();
        setTelemetryData(telemetry);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: "Failed to load request details",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const updateResponse = await fetch(
        `${API}/pendingrequests/${selectedRequest.requestID}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Approved", // Change #1: Was "Complete"
            verificationTimestamp: new Date().toISOString(),
          }),
        }
      );

      if (!updateResponse.ok)
        throw new Error("Failed to update request status");

      for (const telemetry of telemetryData) {
        await fetch(`${API}/telemetrydata/${telemetry.entryID}/approve`, {
          method: "PUT",
        });
      }

      toast({
        title: "Request Approved",
        description: "The request has been verified and marked as Approved", // Change #3
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onClose();
      await fetchRequests();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to approve request",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDenyRequest = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${API}/pendingrequests/${selectedRequest.requestID}/status`,
        {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "Denied",
      
          verificationTimestamp: new Date().toISOString(),
            }),
        }
      );

      if (!response.ok) throw new Error("Failed to update request status");

      toast({
        title: "Request Denied",
        description: "The request has been rejected and marked as complete",
        status: "info",
        duration: 3000,
        isClosable: true,
      });

      onClose();
      await fetchRequests();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to deny request",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      String(req.requestID).includes(searchQuery) ||
      String(req.jobID).includes(searchQuery) ||
      String(req.operatorID).includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const onHoldCount = requests.filter((r) => r.status === "On Hold").length;
    const approvedCount = requests.filter((r) => r.status === "Approved").length;
  const deniedCount = requests.filter((r) => r.status === "Denied").length;

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Spinner size="xl" />
      </Container>
    );
  }

  if (err) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          {err}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading size="lg">Verifier Dashboard</Heading>
          <Button
            colorScheme="red"
            variant="outline"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </HStack>

        {/* summary */}
        <SimpleGrid columns={{ base: 1, md: 5 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Requests</StatLabel>
                <StatNumber>{requests.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Pending Review</StatLabel>
                <StatNumber color="orange.500">{pendingCount}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>On Hold</StatLabel>
                <StatNumber color="yellow.500">{onHoldCount}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Approved</StatLabel>
                <StatNumber color="green.500">{approvedCount}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Denied</StatLabel>
                <StatNumber color="red.500">{deniedCount}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* filters */}
        <HStack spacing={4} flexWrap="wrap">
          <Input
            placeholder="Search by Request ID, Job ID, or Operator ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxW="400px"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            maxW="200px"
          >
            <option value="all">All Statuses</option>
            <option value="Pending review">Pending</option>
            <option value="On Hold">On Hold</option>
            <option value="Approved">Approved</option>
            <option value="Denied">Denied</option>
          </Select>
          <Button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("Pending");
            }}
          >
            Reset Filters
          </Button>
        </HStack>

        {/* cards */}
        {filteredRequests.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            No requests found matching your filters
          </Alert>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {filteredRequests.map((request) => (
              <Card
                key={request.requestID}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  transform: "translateY(-4px)",
                  boxShadow: "lg",
                }}
                onClick={() =>
                  navigate(`/verifier/request/${request.requestID}`)
                }
              >
                <CardHeader>
                  <HStack justify="space-between">
                    <Heading size="md">
                      Request from{" "}
                      {request.operator?.organizationName ??
                        `Operator #${request.operatorID}`}
                    </Heading>
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
                </CardHeader>
                <CardBody pt={0}>
                  <VStack align="start" spacing={2}>
                    <Text fontSize={18}>
                      <strong>Job Title:</strong> {request.currJob.jobTitle}
                    </Text>
                    <Text>
                      <strong>Job ID:</strong> {request.jobID}
                    </Text>
                    <Text>
                      <strong>Operator ID:</strong> {request.operatorID}
                    </Text>
                    <Text>
                      <strong>Submitted:</strong>{" "}
                      {new Date(request.requestTimestamp).toLocaleString()}
                    </Text>
                    {request.verificationTimestamp && (
                      <Text fontSize="sm" color="gray.600">
                        <strong>Verified:</strong>{" "}
                        {new Date(
                          request.verificationTimestamp
                        ).toLocaleString()}
                      </Text>
                    )}
                  </VStack>
                </CardBody>
                <CardFooter pt={0}>
                  <Button
                    colorScheme="blue"
                    size="sm"
                    width="full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/verifier/request/${request.requestID}`);
                    }}
                  >
                    Review Evidence Package
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </VStack>

      {/* details modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Request #{selectedRequest?.requestID} - Evidence Package
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {modalLoading ? (
              <Spinner />
            ) : (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Heading size="sm" mb={2}>
                    Request Information
                  </Heading>
                  <VStack align="start" spacing={1}>
                    <Text>
                      <strong>Status:</strong>{" "}
                      <Badge
                        colorScheme={
                          selectedRequest?.status === "Pending"
                            ? "orange"
                            : selectedRequest?.status === "Approved"
                            ? "green"
                            : selectedRequest?.status === "Denied"
                            ? "red"
                            : "yellow"
                        }
                      >
                        {selectedRequest?.status}
                      </Badge>
                    </Text>
                    <Text>
                      <strong>Submitted:</strong>{" "}
                      {selectedRequest?.requestTimestamp &&
                        new Date(
                          selectedRequest.requestTimestamp
                        ).toLocaleString()}
                    </Text>
                    {selectedRequest?.verificationTimestamp && (
                      <Text>
                        <strong>Verified:</strong>{" "}
                        {new Date(
                          selectedRequest.verificationTimestamp
                        ).toLocaleString()}
                      </Text>
                    )}
                    <Text>
                      <strong>Job ID:</strong> {selectedRequest?.jobID}
                    </Text>
                    <Text>
                      <strong>Operator ID:</strong>{" "}
                      {selectedRequest?.operatorID}
                    </Text>
                  </VStack>
                </Box>

                <Divider />

                {/* job details */}
                {jobDetails && (
                  <Box>
                    <Heading size="sm" mb={2}>
                      Job Details
                    </Heading>
                    <VStack align="start" spacing={1}>
                      <Text>
                        <strong>Tool ID:</strong> {jobDetails.toolID}
                      </Text>
                      <Text>
                        <strong>Job Status:</strong>{" "}
                        <Badge>{jobDetails.status}</Badge>
                      </Text>
                      <Text>
                        <strong>Created:</strong>{" "}
                        {new Date(jobDetails.dateCreated).toLocaleString()}
                      </Text>
                    </VStack>
                  </Box>
                )}

                <Divider />

                {/* telemetry */}
                <Box>
                  <Heading size="sm" mb={2}>
                    Telemetry Evidence ({telemetryData.length} records)
                  </Heading>
                  {telemetryData.length > 0 ? (
                    <VStack
                      align="start"
                      spacing={2}
                      maxH="200px"
                      overflowY="auto"
                    >
                      {telemetryData.map((data) => (
                        <Box
                          key={data.entryID}
                          p={2}
                          borderWidth="1px"
                          borderRadius="md"
                          w="full"
                        >
                          <Text fontSize="sm">
                            <strong>Entry #{data.entryID}</strong>
                          </Text>
                          <Text fontSize="sm">
                            Uploaded:{" "}
                            {new Date(data.timeUploaded).toLocaleString()}
                          </Text>
                          <Text fontSize="sm">
                            Approved: {data.Approved ? "Yes" : "No"}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.500">No telemetry data available</Text>
                  )}
                </Box>

                {selectedRequest?.status !== "Approved" && selectedRequest?.status !== "Denied" && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Review all evidence carefully before approving. This action will approve the request and set the job as 'Ready for Minting'
                    </Text>
                  </Alert>
                )}

                {(selectedRequest?.status === "Approved" || selectedRequest?.status === "Denied") && (
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      This request has already been completed and cannot be
                      modified.
                    </Text>
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              {selectedRequest?.status !== "Complete" && (
                <>
                  <Button
                    colorScheme="red"
                    leftIcon={<CloseIcon />}
                    onClick={handleDenyRequest}
                    isLoading={actionLoading}
                    isDisabled={modalLoading}
                  >
                    Deny
                  </Button>
                  <Button
                    colorScheme="green"
                    leftIcon={<CheckIcon />}
                    onClick={handleApproveRequest}
                    isLoading={actionLoading}
                    isDisabled={modalLoading}
                  >
                    Approve
                  </Button>
                </>
              )}
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
