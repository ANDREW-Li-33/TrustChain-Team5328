import { useEffect, useMemo, useState, useContext } from "react";
import { Context } from "../context/authContext";
import { useNavigate } from "react-router-dom";
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
  ownerID?: number; // Add ownerID for admin view
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
  const navigate = useNavigate();
  const [groupedTokens, setGroupedTokens] = useState<GroupedToken[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [myOperatorID, setMyOperatorID] = useState<number | null>(null);
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState("all");
  
  // Track which jobs have tokens on marketplace
  const [jobsWithTokensOnMarketplace, setJobsWithTokensOnMarketplace] = useState<Set<number>>(new Set());

  // Detail drawer state
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [selectedGroupedToken, setSelectedGroupedToken] = useState<GroupedToken | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobTokens, setJobTokens] = useState<Token[]>([]);
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Listing modal state
  const { isOpen: isListingOpen, onOpen: onListingOpen, onClose: onListingClose } = useDisclosure();
  const [listingPrice, setListingPrice] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [fetchingTokens, setFetchingTokens] = useState(false);

  // Retire modal state
  const { isOpen: isRetireOpen, onOpen: onRetireOpen, onClose: onRetireClose } = useDisclosure();
  const [retireConfirmText, setRetireConfirmText] = useState("");
  const [isRetiringTokens, setIsRetiringTokens] = useState(false);
  const [tokensToRetire, setTokensToRetire] = useState<Token[]>([]);
  const [fetchingRetireTokens, setFetchingRetireTokens] = useState(false);

  // Get unique operators for dropdown
  const uniqueOperators = useMemo(() => {
    if (!isAdmin) return [];
    
    const operatorMap = new Map<number, string>();
    groupedTokens.forEach(g => {
      if (g.ownerID) {
        const user = users.find(u => u.userID === g.ownerID);
        operatorMap.set(g.ownerID, user?.organizationName || user?.email || `Operator ${g.ownerID}`);
      }
    });
    
    return Array.from(operatorMap.entries()).map(([id, name]) => ({ id, name }));
  }, [groupedTokens, users, isAdmin]);

  // Fetch grouped tokens
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
          (u) =>
            u.email &&
            user.email &&
            u.email.toLowerCase() === user.email.toLowerCase()
        );

      if (!me) {
        setErr("User not found");
        setLoading(false);
        return;
      }

      const userRole = me.role?.toLowerCase();
      const userIsAdmin = userRole === "slb admin" || userRole === "slb_admin";
      setIsAdmin(userIsAdmin);
      setMyOperatorID(me.userID);

      // Fetch grouped tokens
      let groupedData: GroupedToken[] = [];
      
      if (userIsAdmin) {
        // Admin sees all tokens grouped by owner
        const allTokensRes = await fetch(`${API}/tokens`);
        const allTokens: Token[] = await allTokensRes.json();
        
        // Group by jobID AND ownerID for admin
        const grouped = new Map<string, GroupedToken>();
        allTokens.forEach(token => {
          const key = `${token.jobID}-${token.ownerID}`;
          if (!grouped.has(key)) {
            grouped.set(key, {
              jobID: token.jobID,
              status: token.status,
              totalCredits: 0,
              quality: token.quality,
              mintedAt: token.mintedAt,
              retiredAt: token.retiredAt,
              ownerID: token.ownerID,
            });
          }
          const g = grouped.get(key)!;
          g.totalCredits += token.creditProportion;
        });
        
        groupedData = Array.from(grouped.values());
      } else {
        // Regular user sees only their tokens
        const res = await fetch(`${API}/tokens/grouped/${me.userID}`);
        if (res.ok) {
          groupedData = await res.json();
        }
      }

      setGroupedTokens(groupedData);
      
      // Check which jobs have tokens on marketplace
      await checkMarketplaceStatus(groupedData);
      
    } catch (e: any) {
      setErr(e.message || "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  // Check marketplace status for jobs
  const checkMarketplaceStatus = async (tokens: GroupedToken[]) => {
    try {
      const listingsRes = await fetch(`${API}/listings/active`);
      if (listingsRes.ok) {
        const listings = await listingsRes.json();
        const jobsOnMarket = new Set<number>();
        
        // Get all token IDs that are on marketplace
        for (const listing of listings) {
          if (listing.tokens && listing.tokens.length > 0) {
            // For each listing, find which jobs those tokens belong to
            for (const tokenID of listing.tokens) {
              const tokenRes = await fetch(`${API}/tokens/${tokenID}`);
              if (tokenRes.ok) {
                const token = await tokenRes.json();
                if (token && token.jobID) {
                  jobsOnMarket.add(token.jobID);
                }
              }
            }
          }
        }
        
        setJobsWithTokensOnMarketplace(jobsOnMarket);
      }
    } catch (e) {
      console.error("Error checking marketplace status:", e);
    }
  };

  useEffect(() => {
    fetchGroupedTokens();
  }, [API, user]);

  // Filtering
  const filtered = useMemo(
    () =>
      groupedTokens.filter((g) => {
        const matchesQ =
          !q ||
          String(g.jobID).includes(q) ||
          String(g.totalCredits).includes(q);
        const matchesStatus = status === "all" || g.status === status;
        const matchesOperator = 
          !isAdmin || 
          selectedOperatorFilter === "all" || 
          String(g.ownerID) === selectedOperatorFilter;
        return matchesQ && matchesStatus && matchesOperator;
      }),
    [groupedTokens, q, status, isAdmin, selectedOperatorFilter]
  );

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Ready for Minting":
        return "yellow";
      case "Minted":
        return "green";
      case "On The Marketplace":
        return "blue";
      case "Retired":
        return "gray";
      default:
        return "gray";
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return "green";
    if (quality >= 70) return "blue";
    if (quality >= 50) return "yellow";
    return "red";
  };

  const getOperatorName = (ownerID: number) => {
    const user = users.find(u => u.userID === ownerID);
    return user?.organizationName || user?.email || `Operator ${ownerID}`;
  };

  // Handle viewing details
  const handleViewDetails = async (e: React.MouseEvent, g: GroupedToken) => {
    e.stopPropagation();
    setSelectedGroupedToken(g);
    setLoadingDetails(true);
    onDetailOpen();

    try {
      // Fetch job details
      const jobRes = await fetch(`${API}/jobs/${g.jobID}`);
      if (jobRes.ok) {
        const job = await jobRes.json();
        setSelectedJob(job);
      }

      // Fetch tokens for this job
      const tokensRes = await fetch(`${API}/tokens`);
      if (tokensRes.ok) {
        const allTokens: Token[] = await tokensRes.json();
        const jobTokensFiltered = allTokens.filter(t => t.jobID === g.jobID);
        // If admin, filter by owner too
        if (isAdmin && g.ownerID) {
          setJobTokens(jobTokensFiltered.filter(t => t.ownerID === g.ownerID));
        } else {
          setJobTokens(jobTokensFiltered.filter(t => t.ownerID === myOperatorID));
        }
      }

      // Fetch telemetry data
      const telemetryRes = await fetch(`${API}/telemetrydata/job/${g.jobID}`);
      if (telemetryRes.ok) {
        const telemetry = await telemetryRes.json();
        setTelemetryData(telemetry);
      }
    } catch (e) {
      console.error("Error fetching details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle listing for sale
  const handleListForSale = async (e: React.MouseEvent, g: GroupedToken) => {
    e.stopPropagation();
    setSelectedGroupedToken(g);
    setListingPrice("");
    setConfirmText("");
    setFetchingTokens(true);
    onListingOpen();

    try {
      // Fetch available tokens for this job
      const tokensRes = await fetch(`${API}/tokens`);
      if (tokensRes.ok) {
        const allTokens: Token[] = await tokensRes.json();
        const mintedTokens = allTokens.filter(
          t => t.jobID === g.jobID && 
               t.ownerID === myOperatorID && 
               t.status === "Minted"
        );
        setAvailableTokens(mintedTokens);
      }
    } catch (e) {
      console.error("Error fetching tokens:", e);
      setAvailableTokens([]);
    } finally {
      setFetchingTokens(false);
    }
  };

  // Handle retire tokens
  const handleRetireTokens = async (e: React.MouseEvent, g: GroupedToken) => {
    e.stopPropagation();
    setSelectedGroupedToken(g);
    setRetireConfirmText("");
    setFetchingRetireTokens(true);
    onRetireOpen();

    try {
      // Fetch available tokens for this job that can be retired
      const tokensRes = await fetch(`${API}/tokens`);
      if (tokensRes.ok) {
        const allTokens: Token[] = await tokensRes.json();
        const retirableTokens = allTokens.filter(
          t => t.jobID === g.jobID && 
               t.ownerID === myOperatorID && 
               t.status === "Minted"
        );
        setTokensToRetire(retirableTokens);
      }
    } catch (e) {
      console.error("Error fetching tokens:", e);
      setTokensToRetire([]);
    } finally {
      setFetchingRetireTokens(false);
    }
  };

  // Navigate to token history page
  const handleViewTokenHistory = () => {
    if (selectedGroupedToken) {
      navigate(`/token-history/${selectedGroupedToken.jobID}`);
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

    if (confirmText !== "CONFIRM") {
      toast({
        title: "Confirmation Required",
        description: "Please type CONFIRM in the text box to proceed.",
        status: "warning",
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
      setConfirmText("");
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

  // Handle confirming token retirement
  const handleConfirmRetire = async () => {
    if (retireConfirmText !== "CONFIRM") {
      toast({
        title: "Confirmation Required",
        description: "Please type CONFIRM in the text box to proceed.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (tokensToRetire.length === 0) {
      toast({
        title: "No Tokens",
        description: "No tokens available to retire",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsRetiringTokens(true);

    try {
      const tokenIDs = tokensToRetire.map(token => token.tokenID);

      const retireRes = await fetch(`${API}/tokens/retire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenIDs: tokenIDs,
          ownerID: myOperatorID,
        }),
      });

      if (!retireRes.ok) {
        const errorData = await retireRes.json();
        throw new Error(errorData.error || "Failed to retire tokens");
      }

      const result = await retireRes.json();

      toast({
        title: "Tokens Retired",
        description: result.message || `Successfully retired ${tokenIDs.length} token(s)`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Reset and close
      setSelectedGroupedToken(null);
      setRetireConfirmText("");
      setTokensToRetire([]);
      onRetireClose();

      // Refresh grouped tokens to reflect status changes
      await fetchGroupedTokens();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to retire tokens",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error("Error retiring tokens:", error);
    } finally {
      setIsRetiringTokens(false);
    }
  };

  if (loading) {
    return (
      <Box p={6}>
        <Text>Loading tokens...</Text>
      </Box>
    );
  }

  if (err) {
    return (
      <Box p={6}>
        <Heading size="lg" mb={4}>Credit Portfolio {isAdmin && "(Admin View)"}</Heading>
        <Text color="red.500">Error: {err}</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">
          Credit Portfolio {isAdmin && (
            <Badge colorScheme="purple" fontSize="md" ml={2}>Admin View</Badge>
          )}
        </Heading>
      </HStack>


      {/* Search and filter */}
      <HStack gap={4} mb={4} align="center" flexWrap="wrap">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          maxW="220px"
        >
          <option value="all">All statuses</option>
          <option value="Ready for Minting">Ready for Minting</option>
          <option value="Minted">Minted</option>
          <option value="On The Marketplace">On The Marketplace</option>
          <option value="Retired">Retired</option>
        </Select>
        {isAdmin && (
          <Select
            value={selectedOperatorFilter}
            onChange={(e) => setSelectedOperatorFilter(e.target.value)}
            maxW="250px"
          >
            <option value="all">All Operators</option>
            {uniqueOperators.map(op => (
              <option key={op.id} value={String(op.id)}>
                {op.name}
              </option>
            ))}
          </Select>
        )}
        <Button
          onClick={() => {
            setQ("");
            setStatus("all");
            setSelectedOperatorFilter("all");
          }}
        >
          Reset
        </Button>
      </HStack>

      {/* Token cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {filtered.map((g, index) => (
          <Card
            key={`${g.jobID}-${g.status}-${g.ownerID || index}`}
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
                  {isAdmin && g.ownerID && (
                    <Text fontSize="xs" color="blue.600" fontWeight="semibold">
                      {getOperatorName(g.ownerID)}
                    </Text>
                  )}
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

                {/* Show marketplace status or action buttons - only for non-admin users */}
                {!isAdmin && g.status === "Minted" && (
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
                      <HStack spacing={2} width="full" mt={2}>
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={(e) => handleListForSale(e, g)}
                          flex={1}
                        >
                          List for Sale
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={(e) => handleRetireTokens(e, g)}
                          flex={1}
                        >
                          Retire
                        </Button>
                      </HStack>
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
            {isAdmin 
              ? "No tokens have been created in the system yet." 
              : "Complete jobs to earn carbon credit tokens."}
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
                {isAdmin && (
                  <Badge colorScheme="purple">Admin View</Badge>
                )}
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
                              {isAdmin && <Th>Owner</Th>}
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
                                {isAdmin && (
                                  <Td fontSize="xs">
                                    {getOperatorName(token.ownerID)}
                                  </Td>
                                )}
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
            <Button 
              colorScheme="blue" 
              mr={3} 
              onClick={handleViewTokenHistory}
              isDisabled={!selectedGroupedToken}
            >
              View History of These Tokens
            </Button>
            <Button variant="outline" onClick={onDetailClose}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Create listing modal (only for non-admin users) */}
      {!isAdmin && (
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
                        <FormControl isRequired isDisabled={availableTokens.length === 0}>
                          <FormLabel>Confirmation</FormLabel>
                          <Input
                            placeholder='Type "CONFIRM" to put listing on marketplace'
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            borderColor={confirmText === "CONFIRM" ? "green.500" : "gray.200"}
                            _focus={{ borderColor: confirmText === "CONFIRM" ? "green.500" : "blue.500" }}
                          />
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
      )}

      {/* Retire tokens modal (only for non-admin users) */}
      {!isAdmin && (
        <Modal isOpen={isRetireOpen} onClose={onRetireClose} size="md">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader color="red.600">Retire Carbon Credits</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                {selectedGroupedToken && (
                  <>
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">Warning: This action cannot be undone!</Text>
                        <Text fontSize="sm" mt={1}>
                          Retiring tokens permanently removes them from circulation. 
                          They cannot be sold, transferred, or recovered after retirement.
                        </Text>
                      </Box>
                    </Alert>

                    <FormControl>
                      <FormLabel>Job</FormLabel>
                      <Input value={`Job #${selectedGroupedToken.jobID}`} isReadOnly />
                    </FormControl>

                    {fetchingRetireTokens ? (
                      <Box textAlign="center" py={4} width="full">
                        <Spinner size="lg" />
                        <Text mt={2}>Fetching tokens...</Text>
                      </Box>
                    ) : (
                      <>
                        {tokensToRetire.length > 0 ? (
                          <Alert status="info" borderRadius="md">
                            <AlertIcon />
                            <Box>
                              <Text fontWeight="semibold">
                                {tokensToRetire.length} token(s) will be retired
                              </Text>
                              <Text fontSize="sm">
                                Total credits: {tokensToRetire.reduce((sum, t) => sum + t.creditProportion, 0).toFixed(2)} tCO2e
                              </Text>
                            </Box>
                          </Alert>
                        ) : (
                          <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            No tokens available to retire for this job.
                          </Alert>
                        )}

                        <FormControl isRequired isDisabled={tokensToRetire.length === 0}>
                          <FormLabel>Confirmation</FormLabel>
                          <Input
                            placeholder='Type "CONFIRM" to retire these tokens'
                            value={retireConfirmText}
                            onChange={(e) => setRetireConfirmText(e.target.value)}
                            borderColor={retireConfirmText === "CONFIRM" ? "red.500" : "gray.200"}
                            _focus={{ borderColor: retireConfirmText === "CONFIRM" ? "red.500" : "blue.500" }}
                          />
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            Type CONFIRM (all caps) to proceed with retirement
                          </Text>
                        </FormControl>
                      </>
                    )}
                  </>
                )}
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onRetireClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleConfirmRetire}
                isLoading={isRetiringTokens}
                loadingText="Retiring Tokens..."
                isDisabled={!selectedGroupedToken || tokensToRetire.length === 0 || fetchingRetireTokens || retireConfirmText !== "CONFIRM"}
              >
                Retire Tokens
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
}