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
  Flex,
} from "@chakra-ui/react";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../firebase/firebase";
import { MdOutlinePendingActions } from "react-icons/md";
import { RxCross1 } from "react-icons/rx";
import { FaCheckCircle } from "react-icons/fa";

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

export default function VerifierDashboard() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const toast = useToast();
  const navigate = useNavigate();
  const auth = getAuth(app);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");

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
          <Button colorScheme="red" variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </HStack>

        {/* top summary */}
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
                transition="all 0.2s"
                _hover={{
                  transform: "translateY(-4px)",
                  boxShadow: "lg",
                }}
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
                      <Flex alignItems="center">
                        <Box pr="0.5"> {request.status}</Box>
                        {request.status === "Pending" ? (
                          <MdOutlinePendingActions />
                        ) : null}
                        {request.status === "Denied" ? <RxCross1 /> : null}
                        {request.status === "Approved" ? (
                          <FaCheckCircle />
                        ) : null}
                      </Flex>
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
    </Container>
  );
}
