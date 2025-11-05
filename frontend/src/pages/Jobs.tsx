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
  useToast,
  VStack,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Wrap,
  WrapItem,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { MdSell } from "react-icons/md";

type Job = {
  jobID: number;
  operatorID: number | null;
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

type Token = {
  tokenID: number;
  ownerID: number;
  jobID: number;
  quality: number;
  status: string;
  mintedAt?: string | null;
  retiredAt?: string | null;
  metadata: any;
  blockchainHash?: number | null;
  creditProportion: number;
  tokenHash: string;
};

export default function JobsPage() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isListingOpen, 
    onOpen: onListingOpen, 
    onClose: onListingClose 
  } = useDisclosure();
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [myOperatorID, setMyOperatorID] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Listing modal state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [listingPrice, setListingPrice] = useState<string>("");
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [fetchingTokens, setFetchingTokens] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);

  // New admin filter states
  const [recencyFilter, setRecencyFilter] = useState("all");
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");

  const [newJobToolID, setNewJobToolID] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobStatus, setNewJobStatus] = useState<"Active" | "Completed" | "Paused">("Active");
  const [creating, setCreating] = useState(false);

  // Determine if date filters are active
  const isDateFilterActive = dateAfter !== "" || dateBefore !== "";
  
  // Determine if recency filter is active
  const isRecencyFilterActive = recencyFilter !== "all";

  // Fetch jobs and users
  const fetchJobs = async () => {
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
      const userRole = me.role?.toLowerCase();

      setMyOperatorID(operatorID);
      setIsAdmin(userRole === "slb admin");

      // Get jobs
      const endpoint = userRole === "slb admin" 
        ? `${API}/jobs`
        : `${API}/jobs/operator/${operatorID}`;

      const jRes = await fetch(endpoint);
      if (!jRes.ok) throw new Error(`jobs fetch failed (${jRes.status})`);

      setJobs(await jRes.json());
    } catch (e: any) {
      setErr(e.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [API, user]);

  // Get operator name from users array
  const getOperatorName = (operatorID: number | null) => {
    if (!operatorID) return "Unassigned";
    const operator = users.find((u) => u.userID === operatorID);
    return operator?.organizationName || `User ${operatorID}`;
  };

  // Get unique company names for filter dropdown
  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    jobs.forEach((job) => {
      const companyName = getOperatorName(job.operatorID);
      if (companyName !== "Unassigned") {
        companies.add(companyName);
      }
    });
    return Array.from(companies).sort();
  }, [jobs, users]);

  // Helper function to check if a date is within a recency period
  const isWithinRecency = (dateString: string, recency: string): boolean => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch (recency) {
      case "today":
        return diffDays < 1;
      case "3days":
        return diffDays <= 3;
      case "week":
        return diffDays <= 7;
      case "month":
        return diffDays <= 30;
      case "quarter":
        return diffDays <= 90;
      case "year":
        return diffDays <= 365;
      case "all":
      default:
        return true;
    }
  };

  // Helper function to check if a date is within a date range
  const isWithinDateRange = (dateString: string, after: string, before: string): boolean => {
    if (!after && !before) return true;
    
    const date = new Date(dateString);
    
    if (after) {
      const afterDate = new Date(after);
      afterDate.setHours(0, 0, 0, 0);
      if (date < afterDate) return false;
    }
    
    if (before) {
      const beforeDate = new Date(before);
      beforeDate.setHours(23, 59, 59, 999);
      if (date > beforeDate) return false;
    }
    
    return true;
  };

  // Enhanced filtering logic
  const filtered = useMemo(
    () =>
      jobs.filter((j) => {
        // Status filter
        const matchesStatus = status === "all" || j.status === status;
        
        // Company filter (admin only)
        const operatorName = getOperatorName(j.operatorID);
        const matchesCompany = !isAdmin || companyFilter === "all" || operatorName === companyFilter;
        
        // Recency filter
        const matchesRecency = isDateFilterActive || recencyFilter === "all" || isWithinRecency(j.dateCreated, recencyFilter);
        
        // Date range filter
        const matchesDateRange = isRecencyFilterActive || isWithinDateRange(j.dateCreated, dateAfter, dateBefore);
        
        // Search query filter
        const matchesQ =
          !q ||
          String(j.jobID).includes(q) ||
          j.jobTitle.toLowerCase().includes(q.toLowerCase()) ||
          operatorName.toLowerCase().includes(q.toLowerCase()) ||
          String(j.operatorID ?? "").includes(q) ||
          String(j.toolID).includes(q);
        
        return matchesStatus && matchesCompany && matchesRecency && matchesDateRange && matchesQ;
      }),
    [jobs, q, status, recencyFilter, dateAfter, dateBefore, companyFilter, users, isAdmin, isDateFilterActive, isRecencyFilterActive]
  );

  const handleCreateJob = async () => {
    if (!newJobToolID || !newJobTitle || !myOperatorID) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`${API}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorID: myOperatorID,
          toolID: parseInt(newJobToolID),
          status: newJobStatus,
          jobTitle: newJobTitle,
        }),
      });

      if (!response.ok) throw new Error("Failed to create job");

      toast({
        title: "Success",
        description: "Job created successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setNewJobToolID("");
      setNewJobTitle("");
      setNewJobStatus("Active");
      onClose();
      await fetchJobs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create job",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setCreating(false);
    }
  };

  // Handle opening the listing modal and fetching tokens for the job
  const handleListForSale = async (e: React.MouseEvent, job: Job) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    
    setSelectedJob(job);
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
        token => token.jobID === job.jobID && token.status === "Minted"
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
    
    if (!selectedJob || !listingPrice || isNaN(priceValue) || priceValue <= 0) {
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
      setSelectedJob(null);
      setListingPrice("");
      setAvailableTokens([]);
      onListingClose();
      
      // Refresh jobs to reflect any status changes
      await fetchJobs();
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

  const handleResetFilters = () => {
    setQ("");
    setStatus("all");
    setRecencyFilter("all");
    setDateAfter("");
    setDateBefore("");
    setCompanyFilter("all");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "green";
      case "Paused":
        return "yellow";
      case "Ready for Minting":
      case "Minted":
        return "purple";
      case "Denied":
        return "red";
      case "Active":
      default:
        return "blue";
    }
  };

  // Helper function to get display text for recency filter
  const getRecencyDisplayText = (recency: string): string => {
    switch (recency) {
      case "today": return "Today";
      case "3days": return "Last 3 days";
      case "week": return "Last 7 days";
      case "month": return "Last 30 days";
      case "quarter": return "Last 90 days";
      case "year": return "Last year";
      default: return "";
    }
  };

  // Navigate to telemetry page
  const handleCardClick = (jobID: number) => {
    window.location.href = `/telemetry/${jobID}`;
  };

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">Jobs</Heading>
        {isAdmin && (
          <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
            Admin View
          </Badge>
        )}
        {!isAdmin && (
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onOpen}>
            Create New Job
          </Button>
        )}
      </HStack>

      {/* Search and filter section */}
      <VStack align="stretch" spacing={4} mb={6}>
        {/* Basic filters row */}
        <Wrap spacing={3} align="center">
          <WrapItem>
            <Input
              placeholder="Search by Job ID, Title, Operator, Tool ID..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              minW="300px"
              maxW="400px"
            />
          </WrapItem>
          
          <WrapItem>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              w="220px"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Paused">Paused</option>
              <option value="Ready for Minting">Ready for Minting</option>
              <option value="Denied">Denied</option>
            </Select>
          </WrapItem>
          
          <WrapItem>
            <Button onClick={handleResetFilters} variant="outline">
              Reset All Filters
            </Button>
          </WrapItem>
        </Wrap>

        {/* Admin-only advanced filters */}
        {isAdmin && (
          <>
            <Divider />
            <Text fontWeight="semibold" color="gray.600">
              Admin Filters
            </Text>
            
            <Wrap spacing={3} align="center">
              {!isDateFilterActive && (
                <WrapItem>
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>Recency</FormLabel>
                    <Select
                      value={recencyFilter}
                      onChange={(e) => setRecencyFilter(e.target.value)}
                      w="180px"
                    >
                      <option value="all">All time</option>
                      <option value="today">Today</option>
                      <option value="3days">Last 3 days</option>
                      <option value="week">Last 7 days</option>
                      <option value="month">Last 30 days</option>
                      <option value="quarter">Last 90 days</option>
                      <option value="year">Last year</option>
                    </Select>
                  </FormControl>
                </WrapItem>
              )}

              {!isRecencyFilterActive && (
                <>
                  <WrapItem>
                    <FormControl>
                      <FormLabel fontSize="sm" mb={1}>Created After Date</FormLabel>
                      <Input
                        type="date"
                        value={dateAfter}
                        onChange={(e) => setDateAfter(e.target.value)}
                        w="200px"
                      />
                    </FormControl>
                  </WrapItem>

                  <WrapItem>
                    <FormControl>
                      <FormLabel fontSize="sm" mb={1}>Created Before Date</FormLabel>
                      <Input
                        type="date"
                        value={dateBefore}
                        onChange={(e) => setDateBefore(e.target.value)}
                        w="200px"
                      />
                    </FormControl>
                  </WrapItem>
                </>
              )}

              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>Company</FormLabel>
                  <Select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    w="220px"
                  >
                    <option value="all">All companies</option>
                    {uniqueCompanies.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </WrapItem>
            </Wrap>
          </>
        )}
      </VStack>

      {/* Active filters summary */}
      {isAdmin && (
        <HStack mb={4} flexWrap="wrap" spacing={2}>
          {isRecencyFilterActive && (
            <Badge colorScheme="blue" px={2} py={1}>
              {getRecencyDisplayText(recencyFilter)}
            </Badge>
          )}
          {dateAfter && (
            <Badge colorScheme="green" px={2} py={1}>
              After: {new Date(dateAfter).toLocaleDateString()}
            </Badge>
          )}
          {dateBefore && (
            <Badge colorScheme="green" px={2} py={1}>
              Before: {new Date(dateBefore).toLocaleDateString()}
            </Badge>
          )}
          {companyFilter !== "all" && (
            <Badge colorScheme="orange" px={2} py={1}>
              Company: {companyFilter}
            </Badge>
          )}
        </HStack>
      )}

      {/* Job cards with List for Sale button */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {filtered.map((j) => (
          <Card
            key={j.jobID}
            cursor="pointer"
            onClick={() => handleCardClick(j.jobID)}
            transition="all 0.2s"
            _hover={{
              transform: "translateY(-4px)",
              boxShadow: "lg",
            }}
          >
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">
                  {j.jobTitle}
                </Heading>
                <Badge colorScheme={getStatusColor(j.status)}>
                  {j.status}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              <VStack align="start" spacing={2}>
                <Text>
                  <strong>Job ID:</strong> {j.jobID}
                </Text>
                {isAdmin && (
                  <Text>
                    <strong>Company:</strong> {getOperatorName(j.operatorID)}
                  </Text>
                )}
                <Text>
                  <strong>Operator ID:</strong> {j.operatorID ?? "Unassigned"}
                </Text>
                <Text>
                  <strong>Tool ID:</strong> {j.toolID}
                </Text>
                <Text>
                  <strong>Created:</strong> {new Date(j.dateCreated).toLocaleString()}
                </Text>
                
                {/* List for Sale button - only shown for Minted status and non-admin users */}
                {!isAdmin && j.status === "Minted" && j.operatorID === myOperatorID && (
                  <Button
                    size="sm"
                    colorScheme="green"
                    leftIcon={<MdSell />}
                    onClick={(e) => handleListForSale(e, j)}
                    mt={2}
                    width="full"
                  >
                    List for Sale
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {!filtered.length && (
        <Box textAlign="center" py={10}>
          <Text fontSize="lg" color="gray.500">
            No jobs match your filters.
          </Text>
        </Box>
      )}

      {/* Create job modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Job</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Job Title</FormLabel>
                <Input
                  type="text"
                  placeholder="Enter Job Title"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Tool ID</FormLabel>
                <Input
                  type="number"
                  placeholder="Enter Tool ID"
                  value={newJobToolID}
                  onChange={(e) => setNewJobToolID(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Initial Status</FormLabel>
                <Select
                  value={newJobStatus}
                  onChange={(e) =>
                    setNewJobStatus(
                      e.target.value as "Active" | "Completed" | "Paused"
                    )
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateJob}
              isLoading={creating}
              loadingText="Creating..."
            >
              Create Job
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create listing modal */}
      <Modal isOpen={isListingOpen} onClose={onListingClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>List Job for Sale</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {selectedJob && (
                <>
                  <FormControl>
                    <FormLabel>Job</FormLabel>
                    <Input value={`${selectedJob.jobTitle} (ID: ${selectedJob.jobID})`} isReadOnly />
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
                              Total credit proportion: {availableTokens.reduce((sum, t) => sum + t.creditProportion, 0)}
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
              isDisabled={!selectedJob || availableTokens.length === 0 || fetchingTokens}
            >
              Create Listing
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}