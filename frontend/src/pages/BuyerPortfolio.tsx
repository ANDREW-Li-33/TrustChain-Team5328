import { useEffect, useMemo, useState, useContext, useRef, useCallback } from "react";
import { Context } from "../context/authContext";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  HStack,
  Input,
  Select,
  Button,
  useToast,
  VStack,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  StatHelpText,
  Center,
} from "@chakra-ui/react";

type Token = {
  tokenID: number;
  ownerID: number;
  jobID: number;
  quality: number;
  status: string;
  mintedAt: string | null;
  retiredAt: string | null;
  metadata: object;
  blockchainHash: string;
  creditProportion: number;
  tokenHash: string;
  purchasedAt?: string;
  purchasePrice?: number;
};

type UserRow = {
  userID: number;
  firebaseUID: string;
  email?: string | null;
  role: string;
  organizationName?: string | null;
};

type GroupedToken = {
  jobID: number;
  status: string;
  totalCredits: number;
  quality: number;
  mintedAt: string | null;
  retiredAt: string | null;
  purchasedAt?: string | null;
  averagePurchasePrice?: number;
  sellerName?: string;
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
  telemetryID: number;
  jobID: number;
  Approved: boolean;
  timeUploaded: string;
  metadata: any;
};

export default function BuyerPortfolioPage() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const toast = useToast();
  
  // Core state
  const [groupedTokens, setGroupedTokens] = useState<GroupedToken[]>([]);
  const [displayedTokens, setDisplayedTokens] = useState<GroupedToken[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [myBuyerID, setMyBuyerID] = useState<number | null>(null);

  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const itemsPerPage = 12;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCardRef = useRef<HTMLDivElement | null>(null);

  // Detail drawer state
  const { 
    isOpen: isDetailOpen, 
    onOpen: onDetailOpen, 
    onClose: onDetailClose 
  } = useDisclosure();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobTokens, setJobTokens] = useState<Token[]>([]);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch grouped tokens for buyer
  const fetchGroupedTokens = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get all users
      const uRes = await fetch(`${API}/users`);
      const allUsers: UserRow[] = await uRes.json();
      setUsers(allUsers);

      // Find current user (buyer)
      const me =
        allUsers.find((u) => String(u.firebaseUID) === String(user.uid)) ||
        allUsers.find(
          (u) => u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()
        );

      if (!me) throw new Error("No matching user in the DB");

      const buyerID = me.userID;
      setMyBuyerID(buyerID);

      // Fetch tokens owned by this buyer
      const endpoint = `${API}/tokens/owner/${buyerID}`;
      console.log("Fetching buyer's tokens:", endpoint);
      const res = await fetch(endpoint);

      if (!res.ok) throw new Error(`Tokens fetch failed (${res.status})`);

      const tokensData: Token[] = await res.json();
      
      // Group tokens by jobID
      const grouped = tokensData.reduce((acc: { [key: number]: GroupedToken }, token) => {
        if (!acc[token.jobID]) {
          acc[token.jobID] = {
            jobID: token.jobID,
            status: token.status,
            totalCredits: 0,
            quality: token.quality,
            mintedAt: token.mintedAt,
            retiredAt: token.retiredAt,
            purchasedAt: null,
            averagePurchasePrice: 0,
            sellerName: undefined,
          };
        }
        
        acc[token.jobID].totalCredits += token.creditProportion;
        
        // Calculate average quality (simplified - you might want weighted average)
        if (acc[token.jobID].quality !== token.quality) {
          acc[token.jobID].quality = Math.round((acc[token.jobID].quality + token.quality) / 2);
        }
        
        // Update status priority (Retired > Active > etc)
        if (token.status === "Retired" || acc[token.jobID].status !== "Retired") {
          acc[token.jobID].status = token.status;
        }
        
        return acc;
      }, {});

      const groupedArray = Object.values(grouped);
      console.log("Grouped tokens for buyer:", groupedArray);

      setGroupedTokens(groupedArray);
      
      // Initialize displayed tokens with first page
      const initialTokens = groupedArray.slice(0, itemsPerPage);
      setDisplayedTokens(initialTokens);
      setHasMore(groupedArray.length > itemsPerPage);
    } catch (e: any) {
      setErr(e.message || "Failed to load tokens");
      toast({
        title: "Error",
        description: e.message || "Failed to load tokens",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupedTokens();
  }, [API, user]);

  // Get operator name from users array
  const getOperatorName = (operatorID: number | null) => {
    if (!operatorID) return "Unknown";
    const operator = users.find((u) => u.userID === operatorID);
    return operator?.organizationName || `Operator ${operatorID}`;
  };

  // Filtering
  const filtered = useMemo(() => {
    const result = groupedTokens.filter((g) => {
      const matchesStatus = status === "all" || g.status === status;
      const matchesQ =
        !q ||
        String(g.jobID).includes(q) ||
        String(g.totalCredits).includes(q) ||
        String(g.quality).includes(q) ||
        g.status.toLowerCase().includes(q.toLowerCase());

      return matchesStatus && matchesQ;
    });

    console.log("Filtered grouped tokens:", result.length);
    return result;
  }, [groupedTokens, q, status]);

  // Update displayed tokens when filters change
  useEffect(() => {
    setPage(1);
    const initialTokens = filtered.slice(0, itemsPerPage);
    setDisplayedTokens(initialTokens);
    setHasMore(filtered.length > itemsPerPage);
  }, [filtered]);

  // Load more items for infinite scroll
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = page * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const newTokens = filtered.slice(startIndex, endIndex);
      
      if (newTokens.length > 0) {
        setDisplayedTokens(prev => [...prev, ...newTokens]);
        setPage(nextPage);
        setHasMore(endIndex < filtered.length);
      } else {
        setHasMore(false);
      }
      
      setLoadingMore(false);
    }, 300); // Small delay for smooth scrolling experience
  }, [page, filtered, hasMore, loadingMore]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (lastCardRef.current) {
      observerRef.current.observe(lastCardRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loadingMore]);

  // Calculate stats
  const stats = useMemo(() => {
    const active = groupedTokens
      .filter((g) => g.status === "Active" || g.status === "Minted")
      .reduce((sum, g) => sum + (g.totalCredits || 0), 0);
    const retired = groupedTokens
      .filter((g) => g.status === "Retired")
      .reduce((sum, g) => sum + (g.totalCredits || 0), 0);
    const total = active + retired;

    return { total, active, retired };
  }, [groupedTokens]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
      case "Minted":
        return "green";
      case "Retired":
        return "gray";
      default:
        return "yellow";
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return "green";
    if (quality >= 70) return "blue";
    if (quality >= 50) return "yellow";
    return "red";
  };

  // Handle viewing job details
  const handleViewDetails = async (groupedToken: GroupedToken) => {
    setLoadingDetails(true);
    onDetailOpen();
    
    try {
      // Fetch job details
      const jobRes = await fetch(`${API}/jobs/${groupedToken.jobID}`);
      if (!jobRes.ok) throw new Error("Failed to fetch job details");
      const jobData: Job = await jobRes.json();
      setSelectedJob(jobData);

      // Fetch all tokens for this job owned by buyer
      const tokensRes = await fetch(`${API}/tokens/owner/${myBuyerID}`);
      if (!tokensRes.ok) throw new Error("Failed to fetch tokens");
      const allTokens: Token[] = await tokensRes.json();
      const filteredTokens = allTokens.filter(t => t.jobID === groupedToken.jobID);
      setJobTokens(filteredTokens);

      // Fetch telemetry data for this job (optional - buyer may not have access)
      try {
        const telemetryRes = await fetch(`${API}/telemetrydata/job/${groupedToken.jobID}`);
        if (telemetryRes.ok) {
          const telemetryDataResponse: TelemetryData[] = await telemetryRes.json();
          setTelemetryData(telemetryDataResponse);
        } else {
          setTelemetryData([]);
        }
      } catch {
        setTelemetryData([]);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load details",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      console.error("Error loading details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <Box p={6}>
        <Heading size="lg" mb={4}>My Carbon Credits</Heading>
        <Center h="200px">
          <Spinner size="xl" />
        </Center>
      </Box>
    );
  }

  if (err) {
    return (
      <Box p={6}>
        <Heading size="lg" mb={4}>My Carbon Credits</Heading>
        <Alert status="error">
          <AlertIcon />
          {err}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">My Carbon Credits</Heading>
        <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
          Buyer Dashboard
        </Badge>
      </HStack>

      {/* Stats Summary */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Credits Owned</StatLabel>
              <StatNumber>{stats.total.toFixed(2)}</StatNumber>
              <StatHelpText>tCO2e</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Active Credits</StatLabel>
              <StatNumber color="green.500">{stats.active.toFixed(2)}</StatNumber>
              <StatHelpText>Available for retirement</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Retired Credits</StatLabel>
              <StatNumber color="gray.500">{stats.retired.toFixed(2)}</StatNumber>
              <StatHelpText>Already offset</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Search and filter */}
      <HStack gap={4} mb={6} align="center" flexWrap="wrap">
        <Input
          placeholder="Search by Job ID, Credits, Quality..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxW="400px"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          maxW="220px"
        >
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Minted">Minted</option>
          <option value="Retired">Retired</option>
        </Select>
        <Button
          onClick={() => {
            setQ("");
            setStatus("all");
          }}
        >
          Reset Filters
        </Button>
      </HStack>

      {/* Credits Grid with Infinite Scroll */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {displayedTokens.map((g, index) => (
          <Card
            key={`${g.jobID}-${g.status}-${index}`}
            ref={index === displayedTokens.length - 1 ? lastCardRef : null}
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              transform: "translateY(-4px)",
              boxShadow: "lg",
            }}
            onClick={() => handleViewDetails(g)}
          >
            <CardHeader>
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Heading size="md">Job #{g.jobID}</Heading>
                  <Text fontSize="sm" color="gray.600">
                    {g.totalCredits.toFixed(2)} Credits
                  </Text>
                </VStack>
                <Badge colorScheme={getStatusColor(g.status)} size="lg">
                  {g.status}
                </Badge>
              </HStack>
            </CardHeader>

            <CardBody pt={0}>
              <VStack align="start" spacing={3}>
                <Box width="100%">
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="bold">
                      Quality Score
                    </Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {g.quality}%
                    </Text>
                  </HStack>
                  <Progress
                    value={g.quality}
                    size="sm"
                    colorScheme={getQualityColor(g.quality)}
                    borderRadius="md"
                  />
                </Box>

                {g.purchasedAt && (
                  <Text fontSize="sm">
                    <strong>Purchased:</strong>{" "}
                    {new Date(g.purchasedAt).toLocaleDateString()}
                  </Text>
                )}

                {g.retiredAt && (
                  <Text fontSize="sm" color="gray.600">
                    <strong>Retired:</strong>{" "}
                    {new Date(g.retiredAt).toLocaleDateString()}
                  </Text>
                )}

                {g.sellerName && (
                  <Text fontSize="sm" color="gray.600">
                    <strong>Seller:</strong> {g.sellerName}
                  </Text>
                )}

                {/* Retire Button for Active Credits */}
                {(g.status === "Active" || g.status === "Minted") && (
                  <Button
                    size="sm"
                    colorScheme="purple"
                    width="full"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add retirement functionality here
                      toast({
                        title: "Feature Coming Soon",
                        description: "Credit retirement will be available in the next update",
                        status: "info",
                        duration: 3000,
                        isClosable: true,
                      });
                    }}
                  >
                    Retire Credits
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Loading More Indicator */}
      {loadingMore && (
        <Center mt={6}>
          <Spinner size="lg" />
          <Text ml={3}>Loading more credits...</Text>
        </Center>
      )}


      {/* Empty State */}
      {!groupedTokens.length && (
        <Box textAlign="center" mt={10}>
          <Text fontSize="lg" color="gray.600">
            No carbon credits found.
          </Text>
          <Text fontSize="md" color="gray.500" mt={2}>
            Visit the marketplace to purchase carbon credits.
          </Text>
          <Button
            mt={4}
            colorScheme="green"
            onClick={() => {
              // Navigate to marketplace
              window.location.href = "/marketplace";
            }}
          >
            Browse Marketplace
          </Button>
        </Box>
      )}

      {/* Detail Drawer */}
      <Drawer
        isOpen={isDetailOpen}
        placement="right"
        onClose={onDetailClose}
        size="lg"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {selectedJob && (
              <VStack align="start" spacing={1}>
                <Heading size="lg">Job #{selectedJob.jobID}</Heading>
                <Text fontSize="md" color="gray.600">
                  {selectedJob.jobTitle || "Carbon Offset Project"}
                </Text>
                <Badge colorScheme="blue">Purchased Credits</Badge>
              </VStack>
            )}
          </DrawerHeader>

          <DrawerBody>
            {loadingDetails ? (
              <Box textAlign="center" py={10}>
                <Spinner size="xl" />
                <Text mt={4}>Loading details...</Text>
              </Box>
            ) : (
              <VStack align="stretch" spacing={6}>
                {/* Job Information */}
                {selectedJob && (
                  <Box>
                    <Heading size="md" mb={3}>Project Information</Heading>
                    <Card>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <HStack justify="space-between">
                            <Text fontWeight="bold">Project Status:</Text>
                            <Badge colorScheme={getStatusColor(selectedJob.status)}>
                              {selectedJob.status}
                            </Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontWeight="bold">Operator:</Text>
                            <Text>{getOperatorName(selectedJob.operatorID)}</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontWeight="bold">Project Started:</Text>
                            <Text>{new Date(selectedJob.dateCreated).toLocaleDateString()}</Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </Box>
                )}

                {/* Credits Overview */}
                <Box>
                  <Heading size="md" mb={3}>My Credits from This Project</Heading>
                  <SimpleGrid columns={2} spacing={4}>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Total Credits</StatLabel>
                          <StatNumber>
                            {jobTokens.reduce((sum, t) => sum + t.creditProportion, 0).toFixed(2)}
                          </StatNumber>
                          <StatHelpText>tCO2e</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Number of Tokens</StatLabel>
                          <StatNumber>{jobTokens.length}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Average Quality</StatLabel>
                          <StatNumber>
                            {jobTokens.length > 0
                              ? (jobTokens.reduce((sum, t) => sum + t.quality, 0) / jobTokens.length).toFixed(1)
                              : 0}%
                          </StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Retired Credits</StatLabel>
                          <StatNumber>
                            {jobTokens
                              .filter(t => t.status === "Retired")
                              .reduce((sum, t) => sum + t.creditProportion, 0)
                              .toFixed(2)}
                          </StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </Box>

                {/* Impact Information */}
                <Box>
                  <Heading size="md" mb={3}>Environmental Impact</Heading>
                  <Card>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <Text>
                          <strong>CO2 Offset:</strong>{" "}
                          {jobTokens.reduce((sum, t) => sum + t.creditProportion, 0).toFixed(2)} tons
                        </Text>
                        <Text>
                          <strong>Equivalent to:</strong> Planting{" "}
                          {Math.round(jobTokens.reduce((sum, t) => sum + t.creditProportion, 0) * 16)}{" "}
                          trees
                        </Text>
                        <Text>
                          <strong>Or:</strong> Removing{" "}
                          {Math.round(jobTokens.reduce((sum, t) => sum + t.creditProportion, 0) * 0.22)}{" "}
                          cars from the road for a year
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </Box>

                {/* Individual Tokens List */}
                <Box>
                  <Heading size="md" mb={3}>Token Details</Heading>
                  <Card>
                    <CardBody>
                      <TableContainer>
                        <Table size="sm">
                          <Thead>
                            <Tr>
                              <Th>Token ID</Th>
                              <Th>Credits</Th>
                              <Th>Quality</Th>
                              <Th>Status</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {jobTokens.map((token) => (
                              <Tr key={token.tokenID}>
                                <Td>#{token.tokenID}</Td>
                                <Td>{token.creditProportion.toFixed(2)} tCO2e</Td>
                                <Td>
                                  <Badge colorScheme={getQualityColor(token.quality)}>
                                    {token.quality}%
                                  </Badge>
                                </Td>
                                <Td>
                                  <Badge colorScheme={getStatusColor(token.status)} size="sm">
                                    {token.status}
                                  </Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                      
                      {jobTokens.length > 10 && (
                        <Text fontSize="sm" color="gray.500" mt={2}>
                          Showing all {jobTokens.length} tokens
                        </Text>
                      )}
                    </CardBody>
                  </Card>
                </Box>

                {/* Blockchain Verification */}
                {jobTokens.length > 0 && jobTokens[0].blockchainHash && (
                  <Box>
                    <Heading size="md" mb={3}>Blockchain Verification</Heading>
                    <Card>
                      <CardBody>
                        <VStack align="stretch" spacing={2}>
                          <Text fontSize="sm">
                            <strong>Blockchain Hash:</strong>
                          </Text>
                          <Text fontSize="xs" fontFamily="mono" wordBreak="break-all">
                            {jobTokens[0].blockchainHash}
                          </Text>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Open blockchain explorer
                              toast({
                                title: "Blockchain Explorer",
                                description: "Opening blockchain verification...",
                                status: "info",
                                duration: 2000,
                              });
                            }}
                          >
                            Verify on Blockchain
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  </Box>
                )}
              </VStack>
            )}
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onDetailClose}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}