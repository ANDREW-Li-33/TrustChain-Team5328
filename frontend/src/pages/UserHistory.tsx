import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
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
  useColorModeValue,
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

type UserHistory = {
  userID: number;
  role: string;
  tokensMinted?: number;
  tokensBought: number;
  tokensSold: number;
  tokensRetired: number;
  currentTokensOwned: number;
  jobsCreated?: number;
  totalCO2Saved?: number;
  jobs?: Array<{
    jobID: number;
    jobTitle: string;
    status: string;
    dateCreated: string;
  }>;
  events: TokenEvent[];
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
  
  if (!hash) return <Text color="black">N/A</Text>;
  
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

export default function UserHistoryPage() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const navigate = useNavigate();
  const { user } = useContext<any>(Context);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch users for displaying names
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        
        // Find current user
        const me = data.find(
          (u: UserRow) =>
            String(u.firebaseUID) === String(user?.uid) ||
            (u.email && user?.email && u.email.toLowerCase() === user.email.toLowerCase())
        );
        setCurrentUser(me || null);
        return me;
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    }
    return null;
  };

  // Fetch user history
  const fetchUserHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const me = await fetchUsers();
      if (!me) {
        setError("User not found");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API}/tokenevents/user/${me.userID}`);
      if (!res.ok) {
        throw new Error("Failed to fetch user history");
      }

      const historyData: UserHistory = await res.json();
      setHistory(historyData);
    } catch (e: any) {
      setError(e.message || "Failed to load user history");
      console.error("Error fetching user history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserHistory();
    }
  }, [user]);

  const getUserName = (userID: number | null): string => {
    if (!userID) return "N/A";
    const user = users.find((u) => u.userID === userID);
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Active":
        return "blue";
      case "Completed":
        return "green";
      case "Minted":
        return "purple";
      case "Denied":
        return "red";
      case "Paused":
        return "yellow";
      default:
        return "gray";
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading user history...</Text>
      </Box>
    );
  }

  if (error || !history || !currentUser) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          {error || "User history not found"}
        </Alert>
        <Button mt={4} leftIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  const isOperator = history.role === "Operator" || history.role === "operator";
  const isBuyer = history.role === "buyer" || history.role === "Buyer";

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
            User History - {currentUser.organizationName || currentUser.email || `User #${currentUser.userID}`}
          </Heading>
          <HStack spacing={2}>
            <Badge colorScheme={isOperator ? "blue" : isBuyer ? "green" : "purple"} fontSize="md">
              {history.role}
            </Badge>
            <Text color="gray.600" fontSize="sm">
              User ID: #{history.userID}
            </Text>
          </HStack>
        </Box>

        {/* Summary Statistics */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: isOperator ? 5 : 4 }} spacing={4}>
          {isOperator && (
            <>
              <Card bg={bgColor} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Jobs Created</StatLabel>
                    <StatNumber>{history.jobsCreated || 0}</StatNumber>
                    <StatHelpText>Total jobs</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              <Card bg={bgColor} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel color="green.700">Total CO₂ Saved</StatLabel>
                    <StatNumber color="green.600">
                      {(history.totalCO2Saved || 0).toFixed(2)}
                    </StatNumber>
                    <StatHelpText>tCO₂e</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              <Card bg="green.50" borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel color="green.700">Credits Minted</StatLabel>
                    <StatNumber color="green.600">
                      {(history.tokensMinted || 0).toFixed(2)}
                    </StatNumber>
                    <StatHelpText>tCO₂e</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </>
          )}
          <Card bg="blue.50" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel color="blue.700">Credits Bought</StatLabel>
                <StatNumber color="blue.600">
                  {history.tokensBought.toFixed(2)}
                </StatNumber>
                <StatHelpText>tCO₂e</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card bg="orange.50" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel color="orange.700">Credits Sold</StatLabel>
                <StatNumber color="orange.600">
                  {history.tokensSold.toFixed(2)}
                </StatNumber>
                <StatHelpText>tCO₂e</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card bg="gray.100" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel color="gray.700">Credits Retired</StatLabel>
                <StatNumber color="gray.600">
                  {history.tokensRetired.toFixed(2)}
                </StatNumber>
                <StatHelpText>tCO₂e</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card bg="purple.50" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel color="purple.700">Currently Owned</StatLabel>
                <StatNumber color="purple.600">
                  {history.currentTokensOwned.toFixed(2)}
                </StatNumber>
                <StatHelpText>tCO₂e</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Jobs List (Operators only) */}
        {isOperator && history.jobs && history.jobs.length > 0 && (
          <Card bg={bgColor} borderWidth="1px" borderColor={borderColor}>
            <CardHeader>
              <Heading size="md">Jobs History</Heading>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Job ID</Th>
                      <Th>Title</Th>
                      <Th>Status</Th>
                      <Th>Created</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {history.jobs.map((job) => (
                      <Tr key={job.jobID}>
                        <Td>#{job.jobID}</Td>
                        <Td>{job.jobTitle}</Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </Td>
                        <Td>{new Date(job.dateCreated).toLocaleDateString()}</Td>
                        <Td>
                          <Button
                            size="sm"
                            variant="link"
                            onClick={() => navigate(`/telemetry/${job.jobID}`)}
                          >
                            View Details
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        )}

        {/* Token History */}
        <Card bg={bgColor} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <HStack>
              <Icon as={TimeIcon} />
              <Heading size="md">Token History</Heading>
              <Badge colorScheme="gray">{history.events.length} events</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            {history.events.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No token history found.
              </Alert>
            ) : (
              <>
                <Alert status="info" mb={4} borderRadius="md">
                  <AlertIcon />
                  <VStack align="start" spacing={2}>
                    <Text fontWeight="bold">About Transaction Hash Receipts</Text>
                    <Text fontSize="sm">
                      Each transaction is recorded on the Ethereum blockchain (Sepolia testnet) for transparency and immutability. 
                      The transaction hash receipt is a unique identifier that proves your carbon credit transaction occurred. 
                      You can click the external link icon to view the transaction details on Etherscan, or copy the hash for your records. 
                      Blockchain ensures that all token transfers, minting, and retirements are permanently recorded and cannot be altered, 
                      providing trust and verification for carbon credit trading.
                    </Text>
                  </VStack>
                </Alert>
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Type</Th>
                        <Th>From</Th>
                        <Th>To</Th>
                        <Th>Token ID</Th>
                        <Th>Listing ID</Th>
                        <Th>Transaction Hash Receipt</Th>
                      </Tr>
                    </Thead>
                  <Tbody>
                    {history.events.map((event) => (
                      <Tr key={event.eventID}>
                        <Td>{new Date(event.createdAt).toLocaleString()}</Td>
                        <Td>
                          <HStack>
                            <Text>{getEventIcon(event.eventType)}</Text>
                            <Badge colorScheme={getEventColor(event.eventType)}>
                              {event.eventType}
                            </Badge>
                          </HStack>
                        </Td>
                        <Td>{getUserName(event.firstOwner)}</Td>
                        <Td>{getUserName(event.newOwner)}</Td>
                        <Td>
                          <Code fontSize="xs">#{event.tokenID}</Code>
                        </Td>
                        <Td>
                          {event.listingID ? (
                            <Badge colorScheme="purple">#{event.listingID}</Badge>
                          ) : (
                            <Text color="black">N/A</Text>
                          )}
                        </Td>
                        <Td>
                          <HashDisplay hash={event.hashInformationConfirmation} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
              </>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}

