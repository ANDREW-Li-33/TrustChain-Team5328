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
  Link,
  Tooltip,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Flex,
  IconButton,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon, TimeIcon, ExternalLinkIcon, CopyIcon, CheckIcon } from "@chakra-ui/icons";

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
  mintingHash: string | null;
  tokenHash: string | null;
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

type UserRow = {
  userID: number;
  firebaseUID: string;
  email?: string | null;
  role: string;
  organizationName?: string | null;
};

// Component for displaying and copying hashes
function HashDisplay({ hash, label }: { hash: string | null; label?: string }) {
  const toast = useToast();
  const { hasCopied, onCopy } = useClipboard(hash || "");
  
  if (!hash) return <Text color="gray.500">N/A</Text>;
  
  const truncatedHash = hash.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : hash;
  const etherscanUrl = `https://sepolia.etherscan.io/tx/${hash}`;
  
  const handleCopy = () => {
    onCopy();
    toast({
      title: "Hash copied!",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };
  
  return (
    <HStack spacing={2}>
      <Tooltip label={hash} placement="top">
        <Code fontSize="sm" px={2} py={1} borderRadius="md">
          {truncatedHash}
        </Code>
      </Tooltip>
      <Tooltip label="Copy hash">
        <IconButton
          aria-label="Copy hash"
          icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
          size="xs"
          variant="ghost"
          onClick={handleCopy}
        />
      </Tooltip>
      <Tooltip label="View on Etherscan (Sepolia)">
        <IconButton
          aria-label="View on Etherscan"
          icon={<ExternalLinkIcon />}
          size="xs"
          variant="ghost"
          as={Link}
          href={etherscanUrl}
          isExternal
        />
      </Tooltip>
    </HStack>
  );
}

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
        return "💰";
      case "Retirement":
        return "📦";
      default:
        return "📋";
    }
  };

  // Calculate statistics
  const mintingEvents = events.filter(e => e.eventType === "Minting");
  const transferEvents = events.filter(e => e.eventType === "Transfer");
  const retirementEvents = events.filter(e => e.eventType === "Retirement");
  const totalCredits = tokens.reduce((sum, t) => sum + t.creditProportion, 0);

  // Group events by token for detailed view
  const eventsByToken = tokens.map(token => ({
    token,
    events: events.filter(e => e.tokenID === token.tokenID).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
  }));

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
          <Card bg="green.50">
            <CardBody>
              <Stat>
                <StatLabel color="green.700">Minted</StatLabel>
                <StatNumber color="green.600">{mintingEvents.length}</StatNumber>
                <StatHelpText>Tokens created on-chain</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card bg="blue.50">
            <CardBody>
              <Stat>
                <StatLabel color="blue.700">Sold/Transferred</StatLabel>
                <StatNumber color="blue.600">{transferEvents.length}</StatNumber>
                <StatHelpText>Ownership transfers</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card bg="gray.100">
            <CardBody>
              <Stat>
                <StatLabel color="gray.700">Retired</StatLabel>
                <StatNumber color="gray.600">{retirementEvents.length}</StatNumber>
                <StatHelpText>Credits permanently claimed</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Individual Token Details with Full History */}
        <Card>
          <CardHeader>
            <Heading size="md">Token Details & Transaction History</Heading>
          </CardHeader>
          <CardBody>
            {tokens.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No tokens found.
              </Alert>
            ) : (
              <Accordion allowMultiple defaultIndex={tokens.length === 1 ? [0] : []}>
                {eventsByToken.map(({ token, events: tokenEvents }) => {
                  const mintEvent = tokenEvents.find(e => e.eventType === "Minting");
                  const transfers = tokenEvents.filter(e => e.eventType === "Transfer");
                  const retireEvent = tokenEvents.find(e => e.eventType === "Retirement");
                  
                  return (
                    <AccordionItem key={token.tokenID}>
                      <AccordionButton>
                        <HStack flex="1" justify="space-between" pr={4}>
                          <HStack>
                            <Text fontWeight="bold">Token #{token.tokenID}</Text>
                            <Badge colorScheme={
                              token.status === "Minted" ? "green" :
                              token.status === "On The Marketplace" ? "blue" :
                              token.status === "Retired" ? "gray" : "yellow"
                            }>
                              {token.status}
                            </Badge>
                          </HStack>
                          <HStack spacing={4}>
                            <Text fontSize="sm" color="gray.600">
                              {token.creditProportion.toFixed(2)} tCO2e
                            </Text>
                            <Badge colorScheme={token.quality >= 70 ? "green" : token.quality >= 50 ? "yellow" : "red"}>
                              {token.quality}% Quality
                            </Badge>
                          </HStack>
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel pb={4}>
                        <VStack align="stretch" spacing={4}>
                          {/* Minting Information */}
                          <Card variant="outline" bg="green.50">
                            <CardHeader py={3}>
                              <HStack>
                                <Text fontSize="xl">🪙</Text>
                                <Heading size="sm" color="green.700">Minting Details</Heading>
                              </HStack>
                            </CardHeader>
                            <CardBody pt={0}>
                              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                <Box>
                                  <Text fontSize="sm" color="gray.600" mb={1}>Minted To</Text>
                                  <Text fontWeight="medium">
                                    {mintEvent ? getUserName(mintEvent.firstOwner) : getUserName(token.ownerID)}
                                  </Text>
                                </Box>
                                <Box>
                                  <Text fontSize="sm" color="gray.600" mb={1}>Minted Date</Text>
                                  <Text fontWeight="medium">
                                    {token.mintedAt 
                                      ? new Date(token.mintedAt).toLocaleString()
                                      : mintEvent 
                                        ? new Date(mintEvent.createdAt).toLocaleString()
                                        : "N/A"}
                                  </Text>
                                </Box>
                                <Box>
                                  <Text fontSize="sm" color="gray.600" mb={1}>Minting Transaction Hash</Text>
                                  <HashDisplay hash={token.mintingHash || mintEvent?.hashInformationConfirmation || null} />
                                </Box>
                                <Box>
                                  <Text fontSize="sm" color="gray.600" mb={1}>Token Hash</Text>
                                  <HashDisplay hash={token.tokenHash} />
                                </Box>
                              </SimpleGrid>
                            </CardBody>
                          </Card>

                          {/* Transfer/Sale History */}
                          {transfers.length > 0 && (
                            <Card variant="outline" bg="blue.50">
                              <CardHeader py={3}>
                                <HStack>
                                  <Text fontSize="xl">💰</Text>
                                  <Heading size="sm" color="blue.700">
                                    Sale/Transfer History ({transfers.length} transaction{transfers.length !== 1 ? 's' : ''})
                                  </Heading>
                                </HStack>
                              </CardHeader>
                              <CardBody pt={0}>
                                <TableContainer>
                                  <Table size="sm" variant="simple">
                                    <Thead>
                                      <Tr>
                                        <Th>Date</Th>
                                        <Th>From</Th>
                                        <Th>To</Th>
                                        <Th>Listing ID</Th>
                                        <Th>Transaction Hash</Th>
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      {transfers.map((transfer, idx) => (
                                        <Tr key={idx}>
                                          <Td>{new Date(transfer.createdAt).toLocaleString()}</Td>
                                          <Td>{getUserName(transfer.firstOwner)}</Td>
                                          <Td>{getUserName(transfer.newOwner)}</Td>
                                          <Td>
                                            {transfer.listingID ? (
                                              <Badge colorScheme="purple">#{transfer.listingID}</Badge>
                                            ) : "-"}
                                          </Td>
                                          <Td>
                                            <HashDisplay hash={transfer.hashInformationConfirmation} />
                                          </Td>
                                        </Tr>
                                      ))}
                                    </Tbody>
                                  </Table>
                                </TableContainer>
                              </CardBody>
                            </Card>
                          )}

                          {/* No transfers message */}
                          {transfers.length === 0 && (
                            <Card variant="outline" bg="gray.50">
                              <CardBody>
                                <HStack>
                                  <Text fontSize="xl">💰</Text>
                                  <Text color="gray.600">No sales or transfers recorded for this token.</Text>
                                </HStack>
                              </CardBody>
                            </Card>
                          )}

                          {/* Retirement Information */}
                          {retireEvent ? (
                            <Card variant="outline" bg="gray.100">
                              <CardHeader py={3}>
                                <HStack>
                                  <Text fontSize="xl">📦</Text>
                                  <Heading size="sm" color="gray.700">Retirement Details</Heading>
                                </HStack>
                              </CardHeader>
                              <CardBody pt={0}>
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                  <Box>
                                    <Text fontSize="sm" color="gray.600" mb={1}>Retired By</Text>
                                    <Text fontWeight="medium">{getUserName(retireEvent.firstOwner)}</Text>
                                  </Box>
                                  <Box>
                                    <Text fontSize="sm" color="gray.600" mb={1}>Retirement Date</Text>
                                    <Text fontWeight="medium">
                                      {token.retiredAt 
                                        ? new Date(token.retiredAt).toLocaleString()
                                        : new Date(retireEvent.createdAt).toLocaleString()}
                                    </Text>
                                  </Box>
                                  <Box gridColumn={{ md: "span 2" }}>
                                    <Text fontSize="sm" color="gray.600" mb={1}>Retirement Transaction Hash</Text>
                                    <HashDisplay hash={retireEvent.hashInformationConfirmation} />
                                  </Box>
                                </SimpleGrid>
                              </CardBody>
                            </Card>
                          ) : (
                            <Card variant="outline" bg="gray.50">
                              <CardBody>
                                <HStack>
                                  <Text fontSize="xl">📦</Text>
                                  <Text color="gray.600">This token has not been retired.</Text>
                                </HStack>
                              </CardBody>
                            </Card>
                          )}

                          {/* Current Owner */}
                          <Card variant="outline">
                            <CardBody>
                              <HStack justify="space-between">
                                <Box>
                                  <Text fontSize="sm" color="gray.600">Current Owner</Text>
                                  <Text fontWeight="bold" fontSize="lg">{getUserName(token.ownerID)}</Text>
                                </Box>
                                <Box textAlign="right">
                                  <Text fontSize="sm" color="gray.600">Credit Value</Text>
                                  <Text fontWeight="bold" fontSize="lg" color="green.600">
                                    {token.creditProportion.toFixed(2)} tCO2e
                                  </Text>
                                </Box>
                              </HStack>
                            </CardBody>
                          </Card>
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardBody>
        </Card>

        {/* Complete Event Timeline */}
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={TimeIcon} />
              <Heading size="md">Complete Event Timeline</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            {events.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No events recorded for these tokens yet.
              </Alert>
            ) : (
              <VStack align="stretch" spacing={0}>
                {events.map((event, index) => (
                  <Box key={event.eventID || index} position="relative">
                    {/* Timeline connector */}
                    {index < events.length - 1 && (
                      <Box
                        position="absolute"
                        left="19px"
                        top="40px"
                        bottom="-20px"
                        width="2px"
                        bg="gray.200"
                      />
                    )}
                    
                    <HStack spacing={4} align="start" py={4}>
                      {/* Event icon circle */}
                      <Flex
                        minW="40px"
                        h="40px"
                        borderRadius="full"
                        bg={`${getEventColor(event.eventType)}.100`}
                        border="2px solid"
                        borderColor={`${getEventColor(event.eventType)}.400`}
                        align="center"
                        justify="center"
                        fontSize="lg"
                        zIndex={1}
                      >
                        {getEventIcon(event.eventType)}
                      </Flex>
                      
                      {/* Event details */}
                      <Box flex={1}>
                        <HStack mb={2} flexWrap="wrap" spacing={2}>
                          <Badge 
                            colorScheme={getEventColor(event.eventType)} 
                            fontSize="sm"
                            px={2}
                            py={1}
                          >
                            {event.eventType}
                          </Badge>
                          <Text fontSize="sm" color="gray.500">
                            {new Date(event.createdAt).toLocaleString()}
                          </Text>
                          <Badge variant="outline">Token #{event.tokenID}</Badge>
                        </HStack>
                        
                        {/* Event specific details */}
                        <Box bg="gray.50" p={3} borderRadius="md">
                          {event.eventType === "Minting" && (
                            <VStack align="start" spacing={1}>
                              <Text>
                                <Text as="span" fontWeight="medium">Minted to: </Text>
                                {getUserName(event.firstOwner)}
                              </Text>
                            </VStack>
                          )}
                          
                          {event.eventType === "Transfer" && (
                            <VStack align="start" spacing={1}>
                              <HStack>
                                <Text>
                                  <Text as="span" fontWeight="medium">From: </Text>
                                  {getUserName(event.firstOwner)}
                                </Text>
                                <Text color="gray.400">→</Text>
                                <Text>
                                  <Text as="span" fontWeight="medium">To: </Text>
                                  {getUserName(event.newOwner)}
                                </Text>
                              </HStack>
                              {event.listingID && (
                                <Text fontSize="sm" color="gray.600">
                                  Listing ID: #{event.listingID}
                                </Text>
                              )}
                            </VStack>
                          )}
                          
                          {event.eventType === "Retirement" && (
                            <Text>
                              <Text as="span" fontWeight="medium">Retired by: </Text>
                              {getUserName(event.firstOwner)}
                            </Text>
                          )}
                          
                          {/* Transaction Hash */}
                          {event.hashInformationConfirmation && (
                            <HStack mt={2}>
                              <Text fontSize="sm" color="gray.600">Transaction:</Text>
                              <HashDisplay hash={event.hashInformationConfirmation} />
                            </HStack>
                          )}
                        </Box>
                      </Box>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* All Transactions Table */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">All Transactions</Heading>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date & Time</Th>
                      <Th>Type</Th>
                      <Th>Token</Th>
                      <Th>From</Th>
                      <Th>To</Th>
                      <Th>Listing</Th>
                      <Th>Transaction Hash</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {events.map((event) => (
                      <Tr key={event.eventID}>
                        <Td whiteSpace="nowrap">{new Date(event.createdAt).toLocaleString()}</Td>
                        <Td>
                          <Badge colorScheme={getEventColor(event.eventType)}>
                            {event.eventType}
                          </Badge>
                        </Td>
                        <Td fontWeight="medium">#{event.tokenID}</Td>
                        <Td>{getUserName(event.firstOwner)}</Td>
                        <Td>{event.newOwner ? getUserName(event.newOwner) : "-"}</Td>
                        <Td>{event.listingID ? `#${event.listingID}` : "-"}</Td>
                        <Td>
                          <HashDisplay hash={event.hashInformationConfirmation} />
                        </Td>
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