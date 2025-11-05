import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import { Context } from "../context/authContext";
import {
  Container,
  VStack,
  Heading,
  Text,
  Box,
  Card,
  CardHeader,
  CardBody,
  HStack,
  Badge,
  SimpleGrid,
  Input,
  Select,
  Button,
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
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  IconButton,
  Tooltip,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from "@chakra-ui/react";
import { ViewIcon, SearchIcon } from "@chakra-ui/icons";

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

export default function AdminListings() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const toast = useToast();
  
  // State management
  const [listings, setListings] = useState<Listing[]>([]);
  const [displayedListings, setDisplayedListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  
  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 12;
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Modal state for listing details
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [minQuality, setMinQuality] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");

  // Fetch all listings
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
        const adminStatus = userRole === "slb admin" || userRole === "slb_admin" || userRole === "admin";
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          setErr("Access denied. Admin role required.");
          setLoading(false);
          return;
        }
      } else {
        setErr("User not found in database.");
        setLoading(false);
        return;
      }

      // Build filter query params
      const params = new URLSearchParams();
      if (minQuality) params.append("minQuality", minQuality);
      if (dateAfter) params.append("dateAfter", dateAfter);
      if (dateBefore) params.append("dateBefore", dateBefore);
      if (companyFilter !== "all") params.append("companyName", companyFilter);

      // Fetch listings with filters
      const endpoint = `${API}/listings/active/filtered${params.toString() ? `?${params.toString()}` : ''}`;
      const lRes = await fetch(endpoint);
      if (!lRes.ok) throw new Error(`Listings fetch failed (${lRes.status})`);

      const listingsData = await lRes.json();
      
      // Process listings
      const processedListings = (listingsData || []).map((listing: any) => ({
        ...listing,
        seller: listing.seller || null,
        tokens: listing.tokens || [],
        minQuality: listing.minQuality || 0,
        maxQuality: listing.maxQuality || 0,
        avgQuality: listing.avgQuality || 0,
      }));
      
      setListings(processedListings);
      setDisplayedListings(processedListings.slice(0, ITEMS_PER_PAGE));
      setPage(1);
      setHasMore(processedListings.length > ITEMS_PER_PAGE);
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
  }, [API, user, minQuality, dateAfter, dateBefore, companyFilter]);

  // Filter listings based on search query
  const filteredListings = React.useMemo(() => {
    if (!searchQuery) return listings;
    
    const query = searchQuery.toLowerCase();
    return listings.filter((listing) => {
      const sellerName = listing.seller?.organizationName || listing.seller?.email || "";
      return (
        String(listing.listingID).includes(query) ||
        String(listing.sellerID).includes(query) ||
        sellerName.toLowerCase().includes(query) ||
        listing.tokens.some((tokenID) => String(tokenID).includes(query)) ||
        String(listing.Price).includes(query)
      );
    });
  }, [listings, searchQuery]);

  // Update displayed listings when filtered listings change
  useEffect(() => {
    setDisplayedListings(filteredListings.slice(0, ITEMS_PER_PAGE));
    setPage(1);
    setHasMore(filteredListings.length > ITEMS_PER_PAGE);
  }, [filteredListings]);

  // Load more listings for infinite scroll
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newListings = filteredListings.slice(startIndex, endIndex);
      
      if (newListings.length > 0) {
        setDisplayedListings((prev) => [...prev, ...newListings]);
        setPage(nextPage);
        setHasMore(endIndex < filteredListings.length);
      } else {
        setHasMore(false);
      }
      setLoadingMore(false);
    }, 500);
  }, [page, filteredListings, loadingMore, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMore, hasMore, loadingMore]);

  // Get unique company names for filter
  const uniqueCompanies = React.useMemo(() => {
    const companies = new Set<string>();
    listings.forEach((listing) => {
      const companyName = listing.seller?.organizationName;
      if (companyName) {
        companies.add(companyName);
      }
    });
    return Array.from(companies).sort();
  }, [listings]);

  // Handle viewing listing details
  const handleViewDetails = (listing: Listing) => {
    setSelectedListing(listing);
    onDetailOpen();
  };

  // Get quality color
  const getQualityColor = (quality: number) => {
    if (quality >= 90) return "green";
    if (quality >= 70) return "blue";
    if (quality >= 50) return "yellow";
    return "red";
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setMinQuality("");
    setCompanyFilter("all");
    setDateAfter("");
    setDateBefore("");
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading listings...</Text>
        </VStack>
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

  if (!isAdmin) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="warning">
          <AlertIcon />
          Access denied. Admin role required.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="xl" mb={2}>
            Listings
          </Heading>
          <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
            Admin View
          </Badge>
        </Box>

        {/* Filters */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="sm">Filters</Heading>
              
              <Wrap spacing={4}>
                {/* Search */}
                <WrapItem flex="1" minW="250px">
                  <FormControl>
                    <FormLabel fontSize="sm">Search</FormLabel>
                    <Input
                      placeholder="Search by ID, seller, tokens..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      leftElement={<SearchIcon />}
                    />
                  </FormControl>
                </WrapItem>

                {/* Company Filter */}
                <WrapItem minW="200px">
                  <FormControl>
                    <FormLabel fontSize="sm">Company/Seller</FormLabel>
                    <Select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
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

                {/* Min Quality */}
                <WrapItem minW="150px">
                  <FormControl>
                    <FormLabel fontSize="sm">Min Quality</FormLabel>
                    <Input
                      type="number"
                      placeholder="Any"
                      value={minQuality}
                      onChange={(e) => setMinQuality(e.target.value)}
                      min="0"
                      max="100"
                    />
                  </FormControl>
                </WrapItem>

                {/* Date After */}
                <WrapItem minW="180px">
                  <FormControl>
                    <FormLabel fontSize="sm">Added After</FormLabel>
                    <Input
                      type="date"
                      value={dateAfter}
                      onChange={(e) => setDateAfter(e.target.value)}
                    />
                  </FormControl>
                </WrapItem>

                {/* Date Before */}
                <WrapItem minW="180px">
                  <FormControl>
                    <FormLabel fontSize="sm">Added Before</FormLabel>
                    <Input
                      type="date"
                      value={dateBefore}
                      onChange={(e) => setDateBefore(e.target.value)}
                    />
                  </FormControl>
                </WrapItem>

                {/* Reset Button */}
                <WrapItem alignSelf="flex-end">
                  <Button onClick={handleResetFilters} variant="outline">
                    Reset Filters
                  </Button>
                </WrapItem>
              </Wrap>
            </VStack>
          </CardBody>
        </Card>

        {/* Summary Stats */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Listings</StatLabel>
                <StatNumber>{filteredListings.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Unique Sellers</StatLabel>
                <StatNumber>{uniqueCompanies.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Avg Quality</StatLabel>
                <StatNumber>
                  {filteredListings.length > 0
                    ? Math.round(
                        filteredListings.reduce((sum, l) => sum + (l.avgQuality || 0), 0) /
                          filteredListings.length
                      )
                    : 0}
                  %
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Value</StatLabel>
                <StatNumber>
                  ${filteredListings.reduce((sum, l) => sum + (l.Price || 0), 0).toFixed(2)}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Listings Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {displayedListings.map((listing) => (
            <Card
              key={listing.listingID}
              cursor="pointer"
              onClick={() => handleViewDetails(listing)}
              transition="all 0.2s"
              _hover={{
                transform: "translateY(-4px)",
                boxShadow: "lg",
              }}
            >
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md">Listing #{listing.listingID}</Heading>
                  <HStack>
                    <Badge colorScheme="green">Active</Badge>
                  </HStack>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={3}>
                  {/* Seller Info */}
                  <Box width="100%">
                    <Text fontSize="sm" fontWeight="bold" color="gray.600">
                      Seller
                    </Text>
                    <Text fontSize="md" fontWeight="semibold">
                      {listing.seller?.organizationName || listing.seller?.email || `Seller ${listing.sellerID}`}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      ID: {listing.sellerID}
                    </Text>
                  </Box>

                  <Divider />

                  {/* Quality */}
                  <Box width="100%">
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="bold" color="gray.600">
                        Credit Quality
                      </Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {listing.avgQuality?.toFixed(1) || "N/A"}%
                      </Text>
                    </HStack>
                    <Progress
                      value={listing.avgQuality || 0}
                      size="sm"
                      colorScheme={getQualityColor(listing.avgQuality || 0)}
                      borderRadius="md"
                    />
                    <HStack mt={1} spacing={2} fontSize="xs" color="gray.600">
                      <Text>Min: {listing.minQuality || 0}%</Text>
                      <Text>•</Text>
                      <Text>Max: {listing.maxQuality || 0}%</Text>
                    </HStack>
                  </Box>

                  <Divider />

                  {/* Price & Token Count */}
                  <HStack width="100%" justify="space-between">
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" color="gray.600">
                        Price
                      </Text>
                      <Text fontSize="lg" color="green.600" fontWeight="bold">
                        ${listing.Price?.toFixed(2) || "0.00"}
                      </Text>
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="sm" fontWeight="bold" color="gray.600">
                        Tokens
                      </Text>
                      <Text fontSize="lg" fontWeight="bold">
                        {listing.tokens?.length || 0}
                      </Text>
                    </Box>
                  </HStack>

                  {/* Date Added */}
                  <Box width="100%">
                    <Text fontSize="xs" color="gray.500">
                      Added: {new Date(listing.CreatedAt).toLocaleString()}
                    </Text>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        {/* Loading indicator for infinite scroll */}
        {loadingMore && (
          <HStack justify="center" py={4}>
            <Spinner />
            <Text>Loading more listings...</Text>
          </HStack>
        )}

        {/* Intersection observer target */}
        <div ref={observerTarget} style={{ height: "20px" }} />

        {/* No more listings message */}
        {!hasMore && displayedListings.length > 0 && (
          <Text textAlign="center" color="gray.500" py={4}>
            All listings loaded ({displayedListings.length} total)
          </Text>
        )}

        {/* No listings message */}
        {displayedListings.length === 0 && (
          <Box textAlign="center" py={10}>
            <Text fontSize="lg" color="gray.500">
              No listings match your filters.
            </Text>
            <Button mt={4} onClick={handleResetFilters} variant="outline">
              Clear Filters
            </Button>
          </Box>
        )}
      </VStack>

      {/* Listing Details Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack justify="space-between">
              <Text>Listing #{selectedListing?.listingID} Details</Text>
              <Badge colorScheme="green" fontSize="md">
                {selectedListing?.Status}
              </Badge>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedListing && (
              <VStack align="stretch" spacing={4}>
                {/* Seller Information */}
                <Box>
                  <Heading size="sm" mb={2}>
                    Seller Information
                  </Heading>
                  <Card>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Organization:</Text>
                          <Text>
                            {selectedListing.seller?.organizationName || "N/A"}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Email:</Text>
                          <Text>{selectedListing.seller?.email || "N/A"}</Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Seller ID:</Text>
                          <Text>{selectedListing.sellerID}</Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Role:</Text>
                          <Badge>{selectedListing.seller?.role || "Unknown"}</Badge>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </Box>

                {/* Listing Details */}
                <Box>
                  <Heading size="sm" mb={2}>
                    Listing Details
                  </Heading>
                  <Card>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Price:</Text>
                          <Text fontSize="xl" color="green.600" fontWeight="bold">
                            ${selectedListing.Price?.toFixed(2)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Created:</Text>
                          <Text>
                            {new Date(selectedListing.CreatedAt).toLocaleString()}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Total Tokens:</Text>
                          <Text>{selectedListing.tokens?.length || 0}</Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </Box>

                {/* Credit Quality */}
                <Box>
                  <Heading size="sm" mb={2}>
                    Credit Quality Metrics
                  </Heading>
                  <Card>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <Box>
                          <HStack justify="space-between" mb={2}>
                            <Text fontWeight="bold">Average Quality:</Text>
                            <Text fontSize="lg" fontWeight="bold">
                              {selectedListing.avgQuality?.toFixed(1)}%
                            </Text>
                          </HStack>
                          <Progress
                            value={selectedListing.avgQuality || 0}
                            size="md"
                            colorScheme={getQualityColor(selectedListing.avgQuality || 0)}
                            borderRadius="md"
                          />
                        </Box>
                        <SimpleGrid columns={2} spacing={4}>
                          <Box>
                            <Text fontSize="sm" color="gray.600">
                              Minimum Quality
                            </Text>
                            <Text fontSize="2xl" fontWeight="bold">
                              {selectedListing.minQuality || 0}%
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.600">
                              Maximum Quality
                            </Text>
                            <Text fontSize="2xl" fontWeight="bold">
                              {selectedListing.maxQuality || 0}%
                            </Text>
                          </Box>
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>
                </Box>

                {/* Token Details */}
                {selectedListing.tokenDetails && selectedListing.tokenDetails.length > 0 && (
                  <Box>
                    <Heading size="sm" mb={2}>
                      Token Details
                    </Heading>
                    <Card>
                      <CardBody>
                        <TableContainer>
                          <Table size="sm" variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Token ID</Th>
                                <Th isNumeric>Quality (%)</Th>
                                <Th isNumeric>Credit Amount</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {selectedListing.tokenDetails.map((token) => (
                                <Tr key={token.tokenID}>
                                  <Td fontWeight="medium">{token.tokenID}</Td>
                                  <Td isNumeric>
                                    <Badge colorScheme={getQualityColor(token.quality)}>
                                      {token.quality || 0}%
                                    </Badge>
                                  </Td>
                                  <Td isNumeric>
                                    {token.creditProportion?.toFixed(2) || "0.00"} tCO2e
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </CardBody>
                    </Card>
                  </Box>
                )}

                {/* Token IDs List (if no token details) */}
                {(!selectedListing.tokenDetails || selectedListing.tokenDetails.length === 0) && (
                  <Box>
                    <Heading size="sm" mb={2}>
                      Token IDs
                    </Heading>
                    <Card>
                      <CardBody>
                        <Text fontSize="sm" color="gray.600">
                          {selectedListing.tokens?.join(", ") || "No tokens"}
                        </Text>
                      </CardBody>
                    </Card>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}