import { useEffect, useState, useContext } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Context } from "../context/authContext";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
} from "@chakra-ui/react";
import { ArrowBackIcon, TimeIcon } from "@chakra-ui/icons";

type TokenEvent = {
  eventID: number;
  createdAt: string;
  eventType: string;
  firstOwner: number;
  newOwner: number | null;
  tokenID: number;
  listingID: number | null;
  hashInformationConfirmation: string;
};

type Token = {
  tokenID: number;
  ownerID: number;
  jobID: number;
  quality: number;
  status: string;
  mintedAt: string | null;
  retiredAt: string | null;
  creditProportion: number;
};

type Job = {
  jobID: number;
  operatorID: number;
  toolID: number;
  status: string;
  dateCreated: string;
  jobTitle: string;
};

type UserRow = {
  userID: number;
  firebaseUID: string;
  email?: string | null;
  role: string;
  organizationName?: string | null;
};

export default function TokenHistoryPage() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const tokenIdParam = searchParams.get("tokenId");
  const navigate = useNavigate();
  const { user } = useContext<any>(Context);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [events, setEvents] = useState<TokenEvent[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  // Fetch users for displaying names
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    }
  };

  // Fetch job details
  const fetchJob = async (jid: string) => {
    try {
      const res = await fetch(`${API}/jobs/${jid}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
      }
    } catch (e) {
      console.error("Error fetching job:", e);
    }
  };

  // Fetch tokens and their events
  const fetchTokenHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetchUsers();

      let tokenIDs: number[] = [];

      if (jobId) {
        // Fetch by job ID
        await fetchJob(jobId);
        
        // Get all tokens for this job
        const tokensRes = await fetch(`${API}/tokens`);
        if (tokensRes.ok) {
          const allTokens: Token[] = await tokensRes.json();
          const jobTokens = allTokens.filter(t => t.jobID === parseInt(jobId));
          setTokens(jobTokens);
          tokenIDs = jobTokens.map(t => t.tokenID);
        }
      } else if (tokenIdParam) {
        // Fetch by token ID
        const tokenRes = await fetch(`${API}/tokens/${tokenIdParam}`);
        if (tokenRes.ok) {
          const token: Token = await tokenRes.json();
          setTokens([token]);
          tokenIDs = [token.tokenID];
          
          // Also fetch the job
          if (token.jobID) {
            await fetchJob(String(token.jobID));
          }
        }
      }

      // Fetch events for all tokens
      const allEvents: TokenEvent[] = [];
      for (const tokenID of tokenIDs) {
        try {
          const eventsRes = await fetch(`${API}/tokenevents/token/${tokenID}`);
          if (eventsRes.ok) {
            const tokenEvents: TokenEvent[] = await eventsRes.json();
            allEvents.push(...tokenEvents);
          }
        } catch (e) {
          console.error(`Error fetching events for token ${tokenID}:`, e);
        }
      }

      // Sort events by date (newest first)
      allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEvents(allEvents);

    } catch (e: any) {
      setError(e.message || "Failed to load token history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId || tokenIdParam) {
      fetchTokenHistory();
    } else {
      setError("No job ID or token ID provided");
      setLoading(false);
    }
  }, [jobId, tokenIdParam]);

  const getUserName = (userID: number | null): string => {
    if (!userID) return "N/A";
    const user = users.find(u => u.userID === userID);
    return user?.organizationName || user?.email || `User ${userID}`;
  };

  const getEventColor = (eventType: string): string => {
    switch (eventType) {
      case "Minting":
        return "green";
      case "Transfer":
        return "blue";
      case "Retirement":
        return "gray";
      default:
        return "purple";
    }
  };

  const getEventIcon = (eventType: string): string => {
    switch (eventType) {
      case "Minting":
        return "🪙";
      case "Transfer":
        return "🔄";
      case "Retirement":
        return "📦";
      default:
        return "📋";
    }
  };

  const getEventDescription = (event: TokenEvent): string => {
    switch (event.eventType) {
      case "Minting":
        return `Token #${event.tokenID} was minted to ${getUserName(event.firstOwner)}`;
      case "Transfer":
        return `Token #${event.tokenID} transferred from ${getUserName(event.firstOwner)} to ${getUserName(event.newOwner)}`;
      case "Retirement":
        return `Token #${event.tokenID} was retired by ${getUserName(event.firstOwner)}`;
      default:
        return `Event on Token #${event.tokenID}`;
    }
  };

  // Calculate statistics
  const mintingEvents = events.filter(e => e.eventType === "Minting");
  const transferEvents = events.filter(e => e.eventType === "Transfer");
  const retirementEvents = events.filter(e => e.eventType === "Retirement");
  const totalCredits = tokens.reduce((sum, t) => sum + t.creditProportion, 0);

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading token history...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
        <Button mt={4} leftIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <HStack mb={6}>
        <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </HStack>

      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            Token History {job && `- Job #${job.jobID}`}
          </Heading>
          {job && (
            <Text color="gray.600" fontSize="lg">
              {job.jobTitle}
            </Text>
          )}
        </Box>

        {/* Summary Statistics */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Tokens</StatLabel>
                <StatNumber>{tokens.length}</StatNumber>
                <StatHelpText>{totalCredits.toFixed(2)} tCO2e</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Minting Events</StatLabel>
                <StatNumber color="green.500">{mintingEvents.length}</StatNumber>
                <StatHelpText>Tokens created</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Transfer Events</StatLabel>
                <StatNumber color="blue.500">{transferEvents.length}</StatNumber>
                <StatHelpText>Ownership changes</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Retirement Events</StatLabel>
                <StatNumber color="gray.500">{retirementEvents.length}</StatNumber>
                <StatHelpText>Credits retired</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Tokens Overview */}
        <Card>
          <CardHeader>
            <Heading size="md">Tokens in This Job</Heading>
          </CardHeader>
          <CardBody>
            {tokens.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No tokens found for this job.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Token ID</Th>
                      <Th>Quality</Th>
                      <Th>Credits</Th>
                      <Th>Status</Th>
                      <Th>Current Owner</Th>
                      <Th>Minted</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {tokens.map((token) => (
                      <Tr key={token.tokenID}>
                        <Td fontWeight="bold">#{token.tokenID}</Td>
                        <Td>
                          <Badge colorScheme={token.quality >= 70 ? "green" : token.quality >= 50 ? "yellow" : "red"}>
                            {token.quality}%
                          </Badge>
                        </Td>
                        <Td>{token.creditProportion.toFixed(2)} tCO2e</Td>
                        <Td>
                          <Badge colorScheme={
                            token.status === "Minted" ? "green" :
                            token.status === "On The Marketplace" ? "blue" :
                            token.status === "Retired" ? "gray" : "yellow"
                          }>
                            {token.status}
                          </Badge>
                        </Td>
                        <Td>{getUserName(token.ownerID)}</Td>
                        <Td>
                          {token.mintedAt 
                            ? new Date(token.mintedAt).toLocaleDateString() 
                            : "N/A"}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>

        {/* Event Timeline */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={TimeIcon} />
              <Heading size="md">Event Timeline</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            {events.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No events recorded for these tokens yet.
              </Alert>
            ) : (
              <VStack align="stretch" spacing={4}>
                {events.map((event, index) => (
                  <Box key={event.eventID || index}>
                    <HStack spacing={4} align="start">
                      <Box 
                        fontSize="2xl" 
                        minW="40px" 
                        textAlign="center"
                      >
                        {getEventIcon(event.eventType)}
                      </Box>
                      <Box flex={1}>
                        <HStack mb={1}>
                          <Badge colorScheme={getEventColor(event.eventType)} fontSize="sm">
                            {event.eventType}
                          </Badge>
                          <Text fontSize="sm" color="gray.500">
                            {new Date(event.createdAt).toLocaleString()}
                          </Text>
                        </HStack>
                        <Text fontWeight="medium">
                          {getEventDescription(event)}
                        </Text>
                        {event.listingID && (
                          <Text fontSize="sm" color="gray.600">
                            Listing ID: #{event.listingID}
                          </Text>
                        )}
                        {event.hashInformationConfirmation && (
                          <Text fontSize="xs" color="gray.500" isTruncated maxW="400px">
                            Hash: {event.hashInformationConfirmation}
                          </Text>
                        )}
                      </Box>
                    </HStack>
                    {index < events.length - 1 && <Divider mt={4} />}
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Detailed Events Table */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Detailed Event Log</Heading>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Event Type</Th>
                      <Th>Token ID</Th>
                      <Th>From</Th>
                      <Th>To</Th>
                      <Th>Listing ID</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {events.map((event) => (
                      <Tr key={event.eventID}>
                        <Td>{new Date(event.createdAt).toLocaleString()}</Td>
                        <Td>
                          <Badge colorScheme={getEventColor(event.eventType)}>
                            {event.eventType}
                          </Badge>
                        </Td>
                        <Td>#{event.tokenID}</Td>
                        <Td>{getUserName(event.firstOwner)}</Td>
                        <Td>{event.newOwner ? getUserName(event.newOwner) : "-"}</Td>
                        <Td>{event.listingID ? `#${event.listingID}` : "-"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
}