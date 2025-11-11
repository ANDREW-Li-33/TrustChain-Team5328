import { useEffect, useMemo, useState, useContext } from "react";
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
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
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  StatHelpText,
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

export default function CreditPortfolioPage() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const toast = useToast();
  const [groupedTokens, setGroupedTokens] = useState<GroupedToken[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [myOperatorID, setMyOperatorID] = useState<number | null>(null);

  // Listing modal state
  const { 
    isOpen: isListingOpen, 
    onOpen: onListingOpen, 
    onClose: onListingClose 
  } = useDisclosure();
  const [selectedGroupedToken, setSelectedGroupedToken] = useState<GroupedToken | null>(null);
  const [listingPrice, setListingPrice] = useState<string>("");
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [fetchingTokens, setFetchingTokens] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);

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

  // Track which job IDs have tokens on marketplace
  const [jobsWithTokensOnMarketplace, setJobsWithTokensOnMarketplace] = useState<Set<number>>(new Set());

  // Fetch tokens and determine which jobs have tokens on marketplace
  const checkTokensOnMarketplace = async (operatorID: number) => {
    try {
      const tokensRes = await fetch(`${API}/tokens/owner/${operatorID}`);
      if (!tokensRes.ok) return;
      
      const allTokens: Token[] = await tokensRes.json();
      
      // Find job IDs that have tokens with "On The Marketplace" status
      const jobIDsOnMarketplace = new Set<number>();
      allTokens.forEach(token => {
        if (token.status === "On The Marketplace") {
          jobIDsOnMarketplace.add(token.jobID);
        }
      });
      
      setJobsWithTokensOnMarketplace(jobIDsOnMarketplace);
    } catch (error) {
      console.error("Error checking marketplace tokens:", error);
    }
  };

  // Fetch grouped tokens and users
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

      // Find current user
      const me =
        allUsers.find((u) => String(u.firebaseUID) === String(user.uid)) ||
        allUsers.find(
          (u) => u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()
        );

      if (!me) throw new Error("No matching user in the DB");

      const operatorID = me.userID;
      setMyOperatorID(operatorID);

      // Fetch grouped tokens
      const endpoint = `${API}/tokens/grouped/${operatorID}`;
      console.log("Fetching grouped tokens:", endpoint);
      const res = await fetch(endpoint);

      if (!res.ok) throw new Error(`Grouped tokens fetch failed (${res.status})`);

      const groupedData = await res.json();
      console.log("Grouped tokens received:", groupedData);

      setGroupedTokens(groupedData);
      
      // Check which jobs have tokens on marketplace
      await checkTokensOnMarketplace(operatorID);
    } catch (e: any) {
      setErr(e.message || "Failed to load grouped tokens");
      toast({
        title: "Error",
        description: e.message || "Failed to load grouped tokens",
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
  const getOperatorName = (ownerID: number | null) => {
    if (!ownerID) return "Unassigned";
    const operator = users.find((u) => u.userID === ownerID);
    return operator?.organizationName || `Operator ${ownerID}`;
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

  // Calculate stats by summing token counts (totalCredits)
  const stats = useMemo(() => {
    const total = groupedTokens.reduce((sum, g) => sum + (g.totalCredits || 0), 0);
    const minted = groupedTokens
      .filter((g) => g.status === "Minted")
      .reduce((sum, g) => sum + (g.totalCredits || 0), 0);
    const marketplace = groupedTokens
      .filter((g) => g.status === "On The Marketplace")
      .reduce((sum, g) => sum + (g.totalCredits || 0), 0);
    const retired = groupedTokens
      .filter((g) => g.status === "Retired")
      .reduce((sum, g) => sum + (g.totalCredits || 0), 0);

    return { total, minted, marketplace, retired };
  }, [groupedTokens]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Minted":
        return "purple";
      case "On The Marketplace":
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

  // Handle opening detail drawer
  const handleViewDetails = async (e: React.MouseEvent, groupedToken: GroupedToken) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoadingDetails(true);
    onDetailOpen();
    
    try {
      // Fetch job details
      const jobRes = await fetch(`${API}/jobs/${groupedToken.jobID}`);
      if (!jobRes.ok) throw new Error("Failed to fetch job details");
      const jobData: Job = await jobRes.json();
      setSelectedJob(jobData);

      // Fetch all tokens for this job
      const tokensRes = await fetch(`${API}/tokens/owner/${myOperatorID}`);
      if (!tokensRes.ok) throw new Error("Failed to fetch tokens");
      const allTokens: Token[] = await tokensRes.json();
      const filteredTokens = allTokens.filter(t => t.jobID === groupedToken.jobID);
      setJobTokens(filteredTokens);

      // Fetch telemetry data for this job
      const telemetryRes = await fetch(`${API}/telemetrydata/job/${groupedToken.jobID}`);
      if (telemetryRes.ok) {
        const telemetryDataResponse: TelemetryData[] = await telemetryRes.json();
        setTelemetryData(telemetryDataResponse);
      } else {
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

  // Handle opening the listing modal and fetching tokens for the job
  const handleListForSale = async (e: React.MouseEvent, groupedToken: GroupedToken) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    
    setSelectedGroupedToken(groupedToken);
    setListingPrice("");
    setAvailableTokens([]);
    onListingOpen();
    
    // Fetch tokens for this operator and filter for this job
    setFetchingTokens(true);
    try {
      const tokensRes = await fetch(`${API}/tokens/owner/${myOperatorID}`);
      if (!tokensRes.ok) {
        throw new Error("Failed to fetch tokens");
      }
      
      const allTokens: Token[] = await tokensRes.json();
      
      // Filter tokens for this specific job that are available (Minted status)
      const jobTokens = allTokens.filter(
        token => token.jobID === groupedToken.jobID && token.status === "Minted"
      );
      
      setAvailableTokens(jobTokens);
      
      if (jobTokens.length === 0) {
        toast({
          title: "No Tokens Available",
          description: "There are no minted tokens available for this job. Please ensure tokens have been minted first.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tokens",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      console.error("Error fetching tokens:", error);
    } finally {
      setFetchingTokens(false);
    }
  };

  // Handle creating a listing
  const handleCreateListing = async () => {
    const priceValue = parseFloat(listingPrice);
    
    if (!selectedGroupedToken || !listingPrice || isNaN(priceValue) || priceValue <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid price",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (availableTokens.length === 0) {
      toast({
        title: "No Tokens",
        description: "No tokens available to list",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsCreatingListing(true);

    try {
      // Extract token IDs from available tokens
      const tokenIDs = availableTokens.map(token => token.tokenID);
      
      // Create the listing using the existing backend API
      const listingRes = await fetch(`${API}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenIDs: tokenIDs,
          sellerID: myOperatorID,
          Price: priceValue,
          Status: "Active",
          createdAt: new Date().toISOString(),
        }),
      });

      if (!listingRes.ok) {
        const errorData = await listingRes.json();
        throw new Error(errorData.error || "Failed to create listing");
      }

      const listing = await listingRes.json();

      toast({
        title: "Success",
        description: `Listing created successfully with ${tokenIDs.length} token(s)`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Reset and close
      setSelectedGroupedToken(null);
      setListingPrice("");
      setAvailableTokens([]);
      onListingClose();
      
      // Refresh grouped tokens to reflect any status changes
      await fetchGroupedTokens();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create listing",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error("Error creating listing:", error);
    } finally {
      setIsCreatingListing(false);
    }
  };

  if (loading) {
    return (
      <Box p={6}>
        <Heading size="lg" mb={4}>Credit Portfolio</Heading>
        <Text>Loading tokens...</Text>
      </Box>
    );
  }

  if (err) {
    return (
      <Box p={6}>
        <Heading size="lg" mb={4}>Credit Portfolio</Heading>
        <Text color="red.500">Error: {err}</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">Credit Portfolio</Heading>
      </HStack>

      {/* Stats Summary */}
      <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Tokens</StatLabel>
              <StatNumber>{stats.total}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Minted</StatLabel>
              <StatNumber color="yellow.500">{stats.minted}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>On Marketplace</StatLabel>
              <StatNumber color="green.500">{stats.marketplace}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Retired</StatLabel>
              <StatNumber color="gray.500">{stats.retired}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Search and filter */}
      <HStack gap={4} mb={4} align="center" flexWrap="wrap">
        <Input
          placeholder="Search by Token ID, Job ID, Blockchain Hash..."
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
          <option value="Ready for Minting">Ready for Minting</option>
          <option value="Minted">Minted</option>
          <option value="On The Marketplace">On The Marketplace</option>
        </Select>
        <Button
          onClick={() => {
            setQ("");
            setStatus("all");
          }}
        >
          Reset
        </Button>
      </HStack>

      {/* Token cards with List for Sale button */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {filtered.map((g) => (
          <Card
            key={`${g.jobID}-${g.status}`}
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              transform: "translateY(-4px)",
              boxShadow: "lg",
            }}
            onClick={(e) => handleViewDetails(e, g)}
          >
            <CardHeader>
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Heading size="md">Job #{g.jobID}</Heading>
                  <Text fontSize="sm" color="gray.600">
                    {g.totalCredits} Credits
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

                {g.mintedAt && (
                  <Text fontSize="sm">
                    <strong>Minted:</strong>{" "}
                    {new Date(g.mintedAt).toLocaleDateString()}
                  </Text>
                )}

                {g.retiredAt && (
                  <Text fontSize="sm" color="gray.600">
                    <strong>Retired:</strong>{" "}
                    {new Date(g.retiredAt).toLocaleDateString()}
                  </Text>
                )}

                {/* Show marketplace status or List for Sale button */}
                {g.status === "Minted" && (
                  <>
                    {jobsWithTokensOnMarketplace.has(g.jobID) ? (
                      <Badge 
                        colorScheme="blue" 
                        fontSize="md" 
                        px={3} 
                        py={2}
                        mt={2}
                        width="full"
                        textAlign="center"
                      >
                        On The Marketplace
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={(e) => handleListForSale(e, g)}
                        mt={2}
                        width="full"
                      >
                        List for Sale
                      </Button>
                    )}
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {!groupedTokens.length && (
        <Box textAlign="center" mt={10}>
          <Text fontSize="lg" color="gray.600">
            No grouped tokens found.
          </Text>
          <Text fontSize="md" color="gray.500" mt={2}>
            Complete jobs to earn carbon credit tokens.
          </Text>
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
                <Text fontSize="md" color="gray.600">Job Title: {selectedJob.jobTitle}</Text>
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
                    <Heading size="md" mb={3}>Job Information</Heading>
                    <Card>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <HStack justify="space-between">
                            <Text fontWeight="bold">Status:</Text>
                            <Badge colorScheme={getStatusColor(selectedJob.status)}>
                              {selectedJob.status}
                            </Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontWeight="bold">Operator:</Text>
                            <Text>{getOperatorName(selectedJob.operatorID)}</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontWeight="bold">Created:</Text>
                            <Text>{new Date(selectedJob.dateCreated).toLocaleDateString()}</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontWeight="bold">Tool ID:</Text>
                            <Text>{selectedJob.toolID}</Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </Box>
                )}

                {/* Token Statistics */}
                <Box>
                  <Heading size="md" mb={3}>Token Information</Heading>
                  <SimpleGrid columns={2} spacing={4}>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Total Tokens</StatLabel>
                          <StatNumber>{jobTokens.length}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Avg Quality</StatLabel>
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
                          <StatLabel>Minted Tokens</StatLabel>
                          <StatNumber>
                            {jobTokens.filter(t => t.status === "Minted" || t.status === "On The Marketplace" || t.status === "Retired").length}
                          </StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </Box>

                {/* Token Quality */}
                {jobTokens.length > 0 && (
                  <Box>
                    <Heading size="md" mb={3}>Token Quality</Heading>
                    <Card>
                      <CardBody>
                        <Text fontSize="2xl" fontWeight="bold">
                          {jobTokens[0].quality}%
                        </Text>
                      </CardBody>
                    </Card>
                  </Box>
                )}

                {/* Telemetry Data */}
                <Box>
                  <Heading size="md" mb={3}>Telemetry Data</Heading>
                  {telemetryData.length === 0 ? (
                    <Card>
                      <CardBody>
                        <Alert status="info">
                          <AlertIcon />
                          No telemetry data available for this job.
                        </Alert>
                      </CardBody>
                    </Card>
                  ) : (
                    <VStack align="stretch" spacing={3}>
  
                      <Card>
                        <CardBody>
                          <Heading size="sm" mb={3}>Recent Telemetry Uploads</Heading>
                          <TableContainer>
                            <Table size="sm">
                              <Thead>
                                <Tr>
                                  <Th>Upload Time</Th>
                                  <Th>Status</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {telemetryData.slice(0, 5).map((data) => (
                                  <Tr key={data.telemetryID}>
                                    <Td>{new Date(data.timeUploaded).toLocaleString()}</Td>
                                    <Td>
                                      <Badge colorScheme={data.Approved ? "green" : "yellow"}>
                                        {data.Approved ? "Approved" : "Pending"}
                                      </Badge>
                                    </Td>
                                  </Tr>
                                ))}
                              </Tbody>
                            </Table>
                          </TableContainer>
                          {telemetryData.length > 5 && (
                            <Text fontSize="sm" color="gray.500" mt={2}>
                              Showing 5 of {telemetryData.length} uploads
                            </Text>
                          )}
                        </CardBody>
                      </Card>
                    </VStack>
                  )}
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
                              <Th>Quality</Th>
                              <Th>Credits</Th>
                              <Th>Status</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {jobTokens.map((token) => (
                              <Tr key={token.tokenID}>
                                <Td>#{token.tokenID}</Td>
                                <Td>
                                  <Badge colorScheme={getQualityColor(token.quality)}>
                                    {token.quality}%
                                  </Badge>
                                </Td>
                                <Td>{token.creditProportion.toFixed(2)}</Td>
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
                    </CardBody>
                  </Card>
                </Box>
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

      {/* Create listing modal */}
      <Modal isOpen={isListingOpen} onClose={onListingClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>List Credits for Sale</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {selectedGroupedToken && (
                <>
                  <FormControl>
                    <FormLabel>Job</FormLabel>
                    <Input value={`Job #${selectedGroupedToken.jobID} (${selectedGroupedToken.totalCredits} credits)`} isReadOnly />
                  </FormControl>

                  {fetchingTokens ? (
                    <Box textAlign="center" py={4} width="full">
                      <Spinner size="lg" />
                      <Text mt={2}>Fetching available tokens...</Text>
                    </Box>
                  ) : (
                    <>
                      {availableTokens.length > 0 ? (
                        <Alert status="info">
                          <AlertIcon />
                          <Box>
                            <Text fontWeight="semibold">
                              {availableTokens.length} token(s) available
                            </Text>
                            <Text fontSize="sm">
                              Total credit proportion: {availableTokens.reduce((sum, t) => sum + t.creditProportion, 0).toFixed(2)} tCO2e
                            </Text>
                          </Box>
                        </Alert>
                      ) : (
                        <Alert status="warning">
                          <AlertIcon />
                          No minted tokens available for this job. Please mint tokens first.
                        </Alert>
                      )}

                      <FormControl isRequired isDisabled={availableTokens.length === 0}>
                        <FormLabel>Total Price ($)</FormLabel>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={listingPrice}
                          onChange={(e) => setListingPrice(e.target.value)}
                          min="0.01"
                          step="0.01"
                        />
                        {listingPrice && parseFloat(listingPrice) > 0 && availableTokens.length > 0 && (
                          <Text fontSize="sm" color="gray.600" mt={1}>
                            Price per token: ${(parseFloat(listingPrice) / availableTokens.length).toFixed(2)}
                          </Text>
                        )}
                      </FormControl>
                    </>
                  )}
                </>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onListingClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleCreateListing}
              isLoading={isCreatingListing}
              loadingText="Creating Listing..."
              isDisabled={!selectedGroupedToken || availableTokens.length === 0 || fetchingTokens}
            >
              Create Listing
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}