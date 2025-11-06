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
  Divider,
  Wrap,
  WrapItem,
  FormControl,
  FormLabel,
  Spinner,
  Alert,
  AlertIcon,
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
  useDisclosure,
} from "@chakra-ui/react";

type Listing = {
  listingID: number;
  sellerID: number;
  Price: number;
  Status: string;
  CreatedAt: string;
  seller?: {
    userID: number;
    email: string;
    organizationName: string | null;
    role: string;
  };
  tokens: number[];
  tokenDetails?: Array<{
    tokenID: number;
    quality: number;
    creditProportion: number;
  }>;
  minQuality: number;
  maxQuality: number;
  avgQuality: number;
};

type UserRow = {
  userID: number;
  firebaseUID: string;
  email?: string | null;
  role: string;
  organizationName?: string | null;
};

export default function MarketplacePage() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const toast = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);

  // Modal state for purchase confirmation
  const { isOpen: isPurchaseOpen, onOpen: onPurchaseOpen, onClose: onPurchaseClose } = useDisclosure();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Filter states
  const [q, setQ] = useState("");
  const [recencyFilter, setRecencyFilter] = useState("all");
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [minQuality, setMinQuality] = useState<string>("");
  const [sellerIDFilter, setSellerIDFilter] = useState<string>("");
  const [tokenIDFilter, setTokenIDFilter] = useState<string>("");

  // Determine if date filters are active
  const isDateFilterActive = dateAfter !== "" || dateBefore !== "";
  const isRecencyFilterActive = recencyFilter !== "all";

  // Fetch listings and users
  const fetchListings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get all users for seller info
      const uRes = await fetch(`${API}/users`);
      const allUsers: UserRow[] = await uRes.json();
      setUsers(allUsers);

      // Find current user to check if admin
      const me =
        allUsers.find((u) => String(u.firebaseUID) === String(user.uid)) ||
        allUsers.find(
          (u) =>
            u.email &&
            user.email &&
            u.email.toLowerCase() === user.email.toLowerCase()
        );

      if (me) {
        setCurrentUser(me);
        const userRole = me.role?.toLowerCase();
        setIsAdmin(userRole === "slb admin" || userRole === "slb_admin");
      }

      // Build filter query params
      const params = new URLSearchParams();
      if (minQuality) params.append("minQuality", minQuality);
      if (sellerIDFilter) params.append("sellerID", sellerIDFilter);
      if (tokenIDFilter) params.append("tokenID", tokenIDFilter);
      if (dateAfter) params.append("dateAfter", dateAfter);
      if (dateBefore) params.append("dateBefore", dateBefore);
      if (companyFilter !== "all") params.append("companyName", companyFilter);

      // Fetch listings - use filtered endpoint for admin (always gets full details), regular for others
      const endpoint = isAdmin
        ? `${API}/listings/active/filtered${params.toString() ? `?${params.toString()}` : ''}`
        : `${API}/listings/active`;

      const lRes = await fetch(endpoint);
      if (!lRes.ok) throw new Error(`Listings fetch failed (${lRes.status})`);

      const listingsData = await lRes.json();
      
      // Ensure all listings have proper structure
      const processedListings = (listingsData || []).map((listing: any) => ({
        ...listing,
        seller: listing.seller || null,
        tokens: listing.tokens || [],
        minQuality: listing.minQuality || 0,
        maxQuality: listing.maxQuality || 0,
        avgQuality: listing.avgQuality || 0,
      }));
      
      setListings(processedListings);
    } catch (e: any) {
      setErr(e.message || "Failed to load listings");
      toast({
        title: "Error",
        description: e.message || "Failed to load listings",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [API, user, minQuality, sellerIDFilter, tokenIDFilter, dateAfter, dateBefore, companyFilter]);

  // Get seller name from users array
  const getSellerName = (sellerID: number | null) => {
    if (!sellerID) return "Unknown";
    const seller = users.find((u) => u.userID === sellerID);
    return seller?.organizationName || seller?.email || `Seller ${sellerID}`;
  };

  // Get unique company names for filter dropdown
  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    listings.forEach((listing) => {
      const companyName = listing.seller?.organizationName || getSellerName(listing.sellerID);
      if (companyName && companyName !== "Unknown") {
        companies.add(companyName);
      }
    });
    return Array.from(companies).sort();
  }, [listings, users]);

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
  const isWithinDateRange = (
    dateString: string,
    after: string,
    before: string
  ): boolean => {
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

  // Enhanced filtering logic (client-side for recency and search)
  const filtered = useMemo(
    () =>
      listings.filter((listing) => {
        // Company filter
        const sellerName = listing.seller?.organizationName || getSellerName(listing.sellerID);
        const matchesCompany =
          !isAdmin || companyFilter === "all" || sellerName === companyFilter;

        // Recency filter (only applied if date filters are not active)
        const matchesRecency =
          isDateFilterActive ||
          recencyFilter === "all" ||
          isWithinRecency(listing.CreatedAt, recencyFilter);

        // Date range filter (only applied if recency filter is not active)
        const matchesDateRange =
          isRecencyFilterActive ||
          isWithinDateRange(listing.CreatedAt, dateAfter, dateBefore);

        // Search query filter
        const matchesQ =
          !q ||
          String(listing.listingID).includes(q) ||
          String(listing.sellerID).includes(q) ||
          sellerName.toLowerCase().includes(q.toLowerCase()) ||
          listing.tokens.some((tokenID) => String(tokenID).includes(q)) ||
          String(listing.Price).includes(q);

        return matchesCompany && matchesRecency && matchesDateRange && matchesQ;
      }),
    [
      listings,
      q,
      recencyFilter,
      dateAfter,
      dateBefore,
      companyFilter,
      users,
      isAdmin,
      isDateFilterActive,
      isRecencyFilterActive,
    ]
  );

  const handleResetFilters = () => {
    setQ("");
    setRecencyFilter("all");
    setDateAfter("");
    setDateBefore("");
    setCompanyFilter("all");
    setMinQuality("");
    setSellerIDFilter("");
    setTokenIDFilter("");
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return "green";
    if (quality >= 70) return "blue";
    if (quality >= 50) return "yellow";
    return "red";
  };

  // Helper function to get display text for recency filter
  const getRecencyDisplayText = (recency: string): string => {
    switch (recency) {
      case "today":
        return "Today";
      case "3days":
        return "Last 3 days";
      case "week":
        return "Last 7 days";
      case "month":
        return "Last 30 days";
      case "quarter":
        return "Last 90 days";
      case "year":
        return "Last year";
      default:
        return "";
    }
  };

  // Check if user can purchase a listing
  const canPurchaseListing = (listing: Listing): boolean => {
    if (!currentUser) return false;
    
    // Cannot purchase if user is the seller
    if (currentUser.userID === listing.sellerID) return false;
    
    // Cannot purchase if user is admin
    if (isAdmin) return false;
    
    // Only Buyers and Operators can purchase
    const userRole = currentUser.role?.toLowerCase();
    return userRole === "buyer" || userRole === "operator";
  };

  // Handle opening the purchase confirmation modal
  const handlePurchaseClick = (listing: Listing) => {
    setSelectedListing(listing);
    onPurchaseOpen();
  };

  // Handle completing the purchase
  const handleCompletePurchase = async () => {
    if (!selectedListing || !currentUser) return;

    setIsPurchasing(true);

    try {
      const response = await fetch(`${API}/listings/complete/${selectedListing.listingID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerID: currentUser.userID,
          oldOwner: selectedListing.sellerID,
          priceSold: selectedListing.Price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to complete purchase");
      }

      const result = await response.json();

      toast({
        title: "Purchase Successful",
        description: `Successfully purchased ${result.tokensUpdated} token(s) for $${selectedListing.Price.toFixed(2)}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Close modal and refresh listings
      onPurchaseClose();
      setSelectedListing(null);
      await fetchListings();

    } catch (error: any) {
      console.error("Purchase error:", error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Unable to complete the purchase. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Box p={6}>
        <Heading size="lg" mb={4}>
          Marketplace
        </Heading>
        <Spinner size="xl" />
        <Text mt={4}>Loading listings...</Text>
      </Box>
    );
  }

  if (err) {
    return (
      <Box p={6}>
        <Heading size="lg" mb={4}>
          Marketplace
        </Heading>
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
        <Heading size="lg">Marketplace</Heading>
        {isAdmin && (
          <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
            Admin View
          </Badge>
        )}
      </HStack>

      {/* Search and filter section */}
      <VStack align="stretch" spacing={4} mb={6}>
        {/* Basic filters row */}
        <Wrap spacing={3} align="center">
          <WrapItem>
            <Input
              placeholder="Search by Listing ID, Seller, Token ID, Price..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              minW="300px"
              maxW="400px"
            />
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
              {/* Recency filter */}
              {!isDateFilterActive && (
                <WrapItem>
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>
                      Recency
                    </FormLabel>
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

              {/* Date range filters */}
              {!isRecencyFilterActive && (
                <>
                  <WrapItem>
                    <FormControl>
                      <FormLabel fontSize="sm" mb={1}>
                        Added After Date
                      </FormLabel>
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
                      <FormLabel fontSize="sm" mb={1}>
                        Added Before Date
                      </FormLabel>
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

              {/* Company name filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Company/Seller
                  </FormLabel>
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

              {/* Minimum Quality filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Min Quality
                  </FormLabel>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={minQuality}
                    onChange={(e) => setMinQuality(e.target.value)}
                    min="0"
                    max="100"
                    w="120px"
                  />
                </FormControl>
              </WrapItem>

              {/* Seller ID filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Seller ID
                  </FormLabel>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={sellerIDFilter}
                    onChange={(e) => setSellerIDFilter(e.target.value)}
                    w="120px"
                  />
                </FormControl>
              </WrapItem>

              {/* Token ID filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Token ID
                  </FormLabel>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={tokenIDFilter}
                    onChange={(e) => setTokenIDFilter(e.target.value)}
                    w="120px"
                  />
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

      {/* Summary stats */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Listings</StatLabel>
              <StatNumber>{filtered.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Companies</StatLabel>
              <StatNumber>{uniqueCompanies.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Avg. Min Quality</StatLabel>
              <StatNumber>
                {filtered.length > 0
                  ? Math.round(
                      filtered.reduce((sum, l) => sum + (l.minQuality || 0), 0) /
                        filtered.length
                    )
                  : 0}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Value</StatLabel>
              <StatNumber>
                $
                {filtered
                  .reduce((sum, l) => sum + (l.Price || 0), 0)
                  .toFixed(2)}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Listing cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {filtered.map((listing) => (
          <Card
            key={listing.listingID}
            transition="all 0.2s"
            _hover={{
              transform: "translateY(-4px)",
              boxShadow: "lg",
            }}
          >
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">
                  {listing.tokens?.length || 0} token{(listing.tokens?.length || 0) !== 1 ? 's' : ''} from {listing.seller?.organizationName || getSellerName(listing.sellerID)}
                </Heading>
                <Badge colorScheme="green">Active</Badge>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              <VStack align="start" spacing={3}>
                <Box width="100%">
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="bold">
                      Seller
                    </Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {listing.seller?.organizationName ||
                        getSellerName(listing.sellerID)}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.600">
                    Seller ID: {listing.sellerID}
                  </Text>
                </Box>

                <Divider />

                <Box width="100%">
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="bold">
                      Quality
                    </Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {listing.minQuality?.toFixed(1) || "N/A"}%
                    </Text>
                  </HStack>
                  <Progress
                    value={listing.minQuality || 0}
                    size="sm"
                    colorScheme={getQualityColor(listing.minQuality || 0)}
                    borderRadius="md"
                  />
                </Box>

                <Divider />

                <Box width="100%">
                  <Text fontSize="sm" fontWeight="bold" mb={1}>
                    Price
                  </Text>
                  <Text fontSize="lg" color="green.600" fontWeight="bold">
                    ${listing.Price?.toFixed(2) || "0.00"}
                  </Text>
                </Box>

                <Box width="100%">
                  <Text fontSize="sm" fontWeight="bold" mb={1}>
                    Tokens ({listing.tokens?.length || 0})
                  </Text>
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {listing.tokens?.join(", ") || "None"}
                  </Text>
                </Box>

                <Box width="100%">
                  <Text fontSize="sm" fontWeight="bold" mb={1}>
                    Added
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {new Date(listing.CreatedAt).toLocaleString()}
                  </Text>
                </Box>

                {/* Purchase Button - Only shown for eligible users */}
                {canPurchaseListing(listing) && (
                  <>
                    <Divider />
                    <Button
                      colorScheme="blue"
                      width="100%"
                      onClick={() => handlePurchaseClick(listing)}
                    >
                      Purchase Listing
                    </Button>
                  </>
                )}

                {!canPurchaseListing(listing) && (
                  <>
                    <Divider />
                    
                    <Box width="100%" textAlign="center">
                      <Badge
                        colorScheme="gray"
                        px={4}
                        py={4}
                      >
                        This listing belongs to you!
                      </Badge>
                    </Box>
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {!filtered.length && (
        <Box textAlign="center" py={10}>
          <Text fontSize="lg" color="gray.500">
            No listings match your filters.
          </Text>
          <Button mt={4} onClick={handleResetFilters} variant="outline">
            Clear Filters
          </Button>
        </Box>
      )}

      {/* Purchase Confirmation Modal */}
      <Modal isOpen={isPurchaseOpen} onClose={onPurchaseClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Purchase</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedListing && (
              <VStack align="start" spacing={3}>
                <Text>
                  Are you sure you want to purchase this listing?
                </Text>
                
                <Box width="100%" p={4} bg="gray.50" borderRadius="md">
                  <VStack align="start" spacing={2}>
                    <HStack justify="space-between" width="100%">
                      <Text fontWeight="bold">Listing ID:</Text>
                      <Text>#{selectedListing.listingID}</Text>
                    </HStack>
                    
                    <HStack justify="space-between" width="100%">
                      <Text fontWeight="bold">Seller:</Text>
                      <Text>
                        {selectedListing.seller?.organizationName ||
                          getSellerName(selectedListing.sellerID)}
                      </Text>
                    </HStack>
                    
                    <HStack justify="space-between" width="100%">
                      <Text fontWeight="bold">Number of Tokens:</Text>
                      <Text>{selectedListing.tokens?.length || 0}</Text>
                    </HStack>
                    
                    <HStack justify="space-between" width="100%">
                      <Text fontWeight="bold">Quality (Min):</Text>
                      <Text>{selectedListing.minQuality?.toFixed(1) || "N/A"}%</Text>
                    </HStack>
                    
                    <Divider />
                    
                    <HStack justify="space-between" width="100%">
                      <Text fontWeight="bold" fontSize="lg">Total Price:</Text>
                      <Text fontWeight="bold" fontSize="lg" color="green.600">
                        ${selectedListing.Price?.toFixed(2) || "0.00"}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
                
                <Text fontSize="sm" color="gray.600">
                  The tokens will be transferred to your account and the listing will be marked as complete.
                </Text>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPurchaseClose} isDisabled={isPurchasing}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCompletePurchase}
              isLoading={isPurchasing}
              loadingText="Processing..."
            >
              Confirm Purchase
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}