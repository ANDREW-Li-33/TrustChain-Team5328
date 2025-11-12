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
import { ViewIcon } from "@chakra-ui/icons";

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
  const [allListingsForDropdown, setAllListingsForDropdown] = useState<Listing[]>([]); // All listings for company dropdown
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  const [isOperator, setIsOperator] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);

  // Modal state for purchase confirmation
  const { isOpen: isPurchaseOpen, onOpen: onPurchaseOpen, onClose: onPurchaseClose } = useDisclosure();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Modal state for listing details
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [detailListing, setDetailListing] = useState<Listing | null>(null);

  // Filter states
  const [q, setQ] = useState("");
  const [recencyFilter, setRecencyFilter] = useState("all");
  const [dateAfter, setDateAfter] = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [minQuality, setMinQuality] = useState<string>("");
  const [sellerIDFilter, setSellerIDFilter] = useState<string>("");
  const [tokenIDFilter, setTokenIDFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");


  // Determine if date filters are active
  const isDateFilterActive = dateAfter !== "" || dateBefore !== "";
  const isRecencyFilterActive = recencyFilter !== "all";

  // Fetch all listings for company dropdown (always fetch all, regardless of filters)
  const fetchAllListingsForDropdown = async () => {
    if (!user) return;
    
    try {
      const uRes = await fetch(`${API}/users`);
      const allUsers: UserRow[] = await uRes.json();
      
      // Determine if user is admin
      const me =
        allUsers.find((u) => String(u.firebaseUID) === String(user.uid)) ||
        allUsers.find(
          (u) =>
            u.email &&
            user.email &&
            u.email.toLowerCase() === user.email.toLowerCase()
        );
      
      const userIsAdmin = me?.role?.toLowerCase() === "slb admin" || me?.role?.toLowerCase() === "slb_admin";
      
      let endpoint: string;
      if (userIsAdmin) {
        // Admins see ALL listings using date range with broad dates
        endpoint = `${API}/listings/date-range?start=1900-01-01T00:00:00Z&end=2099-12-31T23:59:59Z`;
      } else {
        // Regular users see only active listings
        endpoint = `${API}/listings/active`;
      }
      
      const lRes = await fetch(endpoint);
      if (!lRes.ok) {
        console.error(`Failed to fetch all listings for dropdown: ${lRes.status} ${lRes.statusText}`);
        console.error("Endpoint:", endpoint);
        return;
      }
      
      const listingsData = await lRes.json();
      
      // Process listings - quality data should already be included from backend
      const processedListings = (listingsData || []).map((listing: any) => {
        const seller = listing.seller || allUsers?.find((u: any) => u.userID === listing.sellerID);
        return {
          ...listing,
          seller: seller || null,
          tokens: listing.tokens || [],
          minQuality: listing.minQuality ?? 0,
          maxQuality: listing.maxQuality ?? 0,
          avgQuality: listing.avgQuality ?? 0,
          CreatedAt: listing.CreatedAt || listing.createdAt || listing.Timestamp || listing.timestamp || listing.created_at || new Date().toISOString(),
        };
      });
      
      setAllListingsForDropdown(processedListings);
    } catch (e: any) {
      console.error("Error fetching all listings for dropdown:", e);
    }
  };

  // Fetch listings and users (with filters for admin)
  const fetchListings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
  
    let endpoint: string = "";
    
    try {
      // Get all users for seller info
      const uRes = await fetch(`${API}/users`);
      if (!uRes.ok) {
        throw new Error(`Failed to fetch users: ${uRes.status} ${uRes.statusText}`);
      }
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
        setIsOperator(userRole === "operator");
        setIsBuyer(userRole === "buyer");
      }
  
      // Determine if user is admin
      const userIsAdmin = me?.role?.toLowerCase() === "slb admin" || me?.role?.toLowerCase() === "slb_admin";

      let listingsData: any[] = [];
      
      if (userIsAdmin) {
        // If status filter is "all" or "Complete", we need all listings (filtered endpoint only returns active)
        // Otherwise, check if any admin filters are active
        const needsAllListings = statusFilter === "all" || statusFilter === "Complete";
        const hasAdminFilters = minQuality || sellerIDFilter || tokenIDFilter || dateAfter || dateBefore || (companyFilter !== "all") || minPrice || maxPrice;
        
        if (needsAllListings || !hasAdminFilters) {
          // Get all listings (for status filtering or when no server-side filters)
          endpoint = `${API}/listings/date-range?start=1900-01-01T00:00:00Z&end=2099-12-31T23:59:59Z`;
        } else {
          // Use filtered endpoint (only returns active listings, status filter will be applied client-side for "Active")
          // Only use this when statusFilter is "Active" and we have admin filters
          const params = new URLSearchParams();
          if (minQuality) params.append("minQuality", minQuality);
          if (sellerIDFilter) params.append("sellerID", sellerIDFilter);
          if (tokenIDFilter) params.append("tokenID", tokenIDFilter);
          if (dateAfter) params.append("dateAfter", dateAfter);
          if (dateBefore) params.append("dateBefore", dateBefore);
          if (companyFilter !== "all") params.append("companyName", companyFilter);
          
          endpoint = `${API}/listings/active/filtered${params.toString() ? `?${params.toString()}` : ''}`;
        }
      } else {
        // Regular users see only active listings
        endpoint = `${API}/listings/active`;
      }
  
      const lRes = await fetch(endpoint);
      if (!lRes.ok) {
        const errorText = await lRes.text();
        let errorMessage = `Listings fetch failed (${lRes.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      listingsData = await lRes.json();
      
      // Process listings - quality data should already be included from backend
      const processedListings = (listingsData || []).map((listing: any) => {
        const seller = listing.seller || allUsers?.find((u: any) => u.userID === listing.sellerID);
        return {
          ...listing,
          seller: seller || null,
          tokens: listing.tokens || [],
          minQuality: listing.minQuality ?? 0,
          maxQuality: listing.maxQuality ?? 0,
          avgQuality: listing.avgQuality ?? 0,
          // Normalize date field
          CreatedAt: listing.CreatedAt || listing.createdAt || listing.Timestamp || listing.timestamp || listing.created_at || new Date().toISOString(),
        };
      });
      
      setListings(processedListings);
      setErr(null); // Clear any previous errors
    } catch (e: any) {
      const errorMessage = e.message || "Failed to load listings";
      console.error("Error fetching listings:", e);
      console.error("Endpoint attempted:", endpoint || "Not set");
      console.error("API base URL:", API);
      setErr(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all listings for dropdown on mount and when user changes
  useEffect(() => {
    fetchAllListingsForDropdown();
  }, [API, user]);

  // Fetch filtered listings when filters change
  useEffect(() => {
    fetchListings();
  }, [API, user, minQuality, sellerIDFilter, tokenIDFilter, dateAfter, dateBefore, companyFilter, statusFilter, minPrice, maxPrice]);

  // Get seller name from users array
  const getSellerName = (sellerID: number | null) => {
    if (!sellerID) return "Unknown";
    const seller = users.find((u) => u.userID === sellerID);
    return seller?.organizationName || seller?.email || `Seller ${sellerID}`;
  };

  // Get unique company names for filter dropdown - use allListingsForDropdown, not filtered listings
  // This ensures all companies are always shown in the dropdown regardless of current filters
  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    // Always use allListingsForDropdown to show all available companies
    allListingsForDropdown.forEach((listing) => {
      const companyName = listing.seller?.organizationName || getSellerName(listing.sellerID);
      if (companyName && companyName !== "Unknown") {
        companies.add(companyName);
      }
    });
    return Array.from(companies).sort();
  }, [allListingsForDropdown]);

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

  // Enhanced filtering logic (client-side for recency, search, and status)
  // Note: For admin, when using filtered endpoint, server-side filters (minQuality, sellerID, tokenID, dateAfter, dateBefore, companyName) 
  // are already applied. When fetching all listings, we apply all filters client-side.
  const filtered = useMemo(
    () =>
      listings.filter((listing) => {
        // Status filter (client-side, applies to all users)
        const matchesStatus = statusFilter === "all" || listing.Status === statusFilter;

        // Admin filters (only apply client-side if we fetched all listings, not filtered endpoint)
        // Check if we're using server-side filters by checking if we have admin filters but status is not "Complete" or "all"
        // Note: Price filters are always client-side since backend doesn't support them in filtered endpoint
        const usingServerSideFilters = isAdmin && statusFilter === "Active" && (minQuality || sellerIDFilter || tokenIDFilter || dateAfter || dateBefore || (companyFilter !== "all"));
        
        let matchesAdminFilters = true;
        if (isAdmin && !usingServerSideFilters) {
          // Apply admin filters client-side (when we fetched all listings)
          if (minQuality) {
            const listingMinQuality = listing.minQuality || 0;
            if (listingMinQuality < parseFloat(minQuality)) matchesAdminFilters = false;
          }
          if (sellerIDFilter && listing.sellerID !== parseInt(sellerIDFilter)) {
            matchesAdminFilters = false;
          }
          if (tokenIDFilter && !listing.tokens?.includes(parseInt(tokenIDFilter))) {
            matchesAdminFilters = false;
          }
          if (companyFilter !== "all") {
            const sellerName = listing.seller?.organizationName || getSellerName(listing.sellerID);
            if (sellerName !== companyFilter) matchesAdminFilters = false;
          }
          // Date filters - only apply client-side if we didn't use server-side filtering
          if (dateAfter || dateBefore) {
            if (!isWithinDateRange(listing.CreatedAt, dateAfter, dateBefore)) {
              matchesAdminFilters = false;
            }
          }
          // Price filters - always client-side
          if (minPrice) {
            const listingPrice = listing.Price || 0;
            if (listingPrice < parseFloat(minPrice)) matchesAdminFilters = false;
          }
          if (maxPrice) {
            const listingPrice = listing.Price || 0;
            if (listingPrice > parseFloat(maxPrice)) matchesAdminFilters = false;
          }
        }
        
        // Price filters - also apply when using server-side filters (since price isn't supported server-side)
        if (isAdmin && usingServerSideFilters) {
          if (minPrice) {
            const listingPrice = listing.Price || 0;
            if (listingPrice < parseFloat(minPrice)) return false;
          }
          if (maxPrice) {
            const listingPrice = listing.Price || 0;
            if (listingPrice > parseFloat(maxPrice)) return false;
          }
        }
        
        // Operator and Buyer filters - apply quality and price filters client-side
        if ((isOperator || isBuyer) && !isAdmin) {
          // Quality filter - operators and buyers see minQuality
          if (minQuality) {
            const listingMinQuality = listing.minQuality || 0;
            if (listingMinQuality < parseFloat(minQuality)) return false;
          }
          // Price filters
          if (minPrice) {
            const listingPrice = listing.Price || 0;
            if (listingPrice < parseFloat(minPrice)) return false;
          }
          if (maxPrice) {
            const listingPrice = listing.Price || 0;
            if (listingPrice > parseFloat(maxPrice)) return false;
          }
        }

        // Recency filter (only applied if date filters are not active)
        // If admin is using server-side date filters, skip client-side recency filter
        const matchesRecency =
          (isAdmin && usingServerSideFilters && (dateAfter || dateBefore)) ? true :
          recencyFilter === "all" ||
          isWithinRecency(listing.CreatedAt, recencyFilter);

        // Date range filter (only applied if recency filter is not active)
        // If admin is using server-side date filters, skip client-side date range filter
        const matchesDateRange =
          (isAdmin && usingServerSideFilters && (dateAfter || dateBefore)) ? true :
          isRecencyFilterActive ||
          isWithinDateRange(listing.CreatedAt, dateAfter, dateBefore);

        // Search query filter (always client-side)
        const sellerName = listing.seller?.organizationName || getSellerName(listing.sellerID);
        const matchesQ =
          !q ||
          String(listing.listingID).includes(q) ||
          String(listing.sellerID).includes(q) ||
          sellerName.toLowerCase().includes(q.toLowerCase()) ||
          listing.tokens.some((tokenID) => String(tokenID).includes(q)) ||
          String(listing.Price).includes(q);

        return matchesStatus && matchesAdminFilters && matchesRecency && matchesDateRange && matchesQ;
      }),
    [
      listings,
      q,
      recencyFilter,
      dateAfter,
      dateBefore,
      users,
      isAdmin,
      isOperator,
      isBuyer,
      isDateFilterActive,
      isRecencyFilterActive,
      statusFilter,
      minQuality,
      sellerIDFilter,
      tokenIDFilter,
      companyFilter,
      minPrice,
      maxPrice
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
    setStatusFilter("all");
    setMinPrice("");
    setMaxPrice("");
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

  // Handle viewing listing details
  const handleViewDetails = (listing: Listing) => {
    setDetailListing(listing);
    onDetailOpen();
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
      await Promise.all([fetchListings(), fetchAllListingsForDropdown()]);

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

        {/* Operator and Buyer filters - Price and Quality */}
        {(isOperator || isBuyer) && !isAdmin && (
          <>
            <Divider />
            <Text fontWeight="semibold" color="gray.600">
              Filters
            </Text>

            <Wrap spacing={3} align="center">
              {/* Minimum Quality filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Min Quality (%)
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

              {/* Min Price filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Min Price ($)
                  </FormLabel>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    w="120px"
                  />
                </FormControl>
              </WrapItem>

              {/* Max Price filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Max Price ($)
                  </FormLabel>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    w="120px"
                  />
                </FormControl>
              </WrapItem>
            </Wrap>
          </>
        )}

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

              {/* Min Price filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Min Price ($)
                  </FormLabel>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    w="120px"
                  />
                </FormControl>
              </WrapItem>

              {/* Max Price filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Max Price ($)
                  </FormLabel>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    w="120px"
                  />
                </FormControl>
              </WrapItem>

              {/* Status filter */}
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm" mb={1}>
                    Status
                  </FormLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    w="150px"
                  >
                    <option value="all">All statuses</option>
                    <option value="Active">Active</option>
                    <option value="Complete">Complete</option>
                  </Select>
                </FormControl>
              </WrapItem>
            </Wrap>

            
          </>
        )}
      </VStack>

      {/* Active filters summary */}
      {(isAdmin || isOperator || isBuyer) && (
        <HStack mb={4} flexWrap="wrap" spacing={2}>
          {isAdmin && isRecencyFilterActive && (
            <Badge colorScheme="blue" px={2} py={1}>
              {getRecencyDisplayText(recencyFilter)}
            </Badge>
          )}
          {isAdmin && dateAfter && (
            <Badge colorScheme="green" px={2} py={1}>
              After: {new Date(dateAfter).toLocaleDateString(undefined, { timeZone: "UTC" })}
            </Badge>
          )}
          {isAdmin && dateBefore && (
            <Badge colorScheme="green" px={2} py={1}>
              Before: {new Date(dateBefore).toLocaleDateString(undefined, { timeZone: "UTC" })}
            </Badge>
          )}
          {isAdmin && companyFilter !== "all" && (
            <Badge colorScheme="orange" px={2} py={1}>
              Company: {companyFilter}
            </Badge>
          )}
          {minQuality && (
            <Badge colorScheme="purple" px={2} py={1}>
              Min Quality: {parseFloat(minQuality)}%
            </Badge>
          )}
          {minPrice && (
            <Badge colorScheme="teal" px={2} py={1}>
              Min Price: ${parseFloat(minPrice).toFixed(2)}
            </Badge>
          )}
          {maxPrice && (
            <Badge colorScheme="teal" px={2} py={1}>
              Max Price: ${parseFloat(maxPrice).toFixed(2)}
            </Badge>
          )}
        </HStack>
      )}

      {/* Summary stats */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: isOperator ? 2 : 4 }} spacing={4} mb={6}>
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
              <StatNumber>
                {new Set(filtered.map((l) => {
                  const companyName = l.seller?.organizationName || getSellerName(l.sellerID);
                  return companyName && companyName !== "Unknown" ? companyName : null;
                }).filter(Boolean)).size}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
        {!isOperator && (
          <>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>Avg Quality</StatLabel>
                  <StatNumber>
                    {(() => {
                      const listingsWithQuality = filtered.filter((l) => (l.avgQuality ?? 0) > 0);
                      if (listingsWithQuality.length === 0) return 0;
                      return Math.round(
                        listingsWithQuality.reduce((sum, l) => sum + (l.avgQuality ?? 0), 0) /
                          listingsWithQuality.length
                      );
                    })()}
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
                    $
                    {filtered
                      .reduce((sum, l) => sum + (l.Price || 0), 0)
                      .toFixed(2)}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
          </>
        )}
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
                  {listing.tokens?.length || 0} token{(listing.tokens?.length || 0) !== 1 ? 's' : ''} from {listing.seller?.organizationName || listing.seller?.email || `Seller ${listing.sellerID}`}
                </Heading>
                <HStack>
                  <Badge colorScheme={listing.Status === 'Active' ? 'green' : 'gray'}>
                    {listing.Status}
                  </Badge>
                  {isAdmin && (
                    <Tooltip label="View Details">
                      <IconButton
                        aria-label="View details"
                        icon={<ViewIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(listing);
                        }}
                      />
                    </Tooltip>
                  )}
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

                {/* Quality - Show avgQuality for admins, minQuality for others */}
                <Box width="100%">
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="bold" color="gray.600">
                      Credit Quality
                    </Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {isAdmin 
                        ? `${listing.avgQuality?.toFixed(1) || "N/A"}%`
                        : `${listing.minQuality?.toFixed(1) || "N/A"}%`
                      }
                    </Text>
                  </HStack>
                  <Progress
                    value={isAdmin ? (listing.avgQuality || 0) : (listing.minQuality || 0)}
                    size="sm"
                    colorScheme={getQualityColor(isAdmin ? (listing.avgQuality || 0) : (listing.minQuality || 0))}
                    borderRadius="md"
                  />
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

                {/* Show message if user owns the listing */}
                {currentUser && currentUser.userID === listing.sellerID && !isAdmin && (
                  <>
                    <Divider />
                    <Box width="100%" textAlign="center">
                      <Badge colorScheme="gray" px={4} py={2}>
                        Your Listing
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

      {/* Listing Details Modal (Admin Only) */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack justify="space-between">
              <Text>Listing #{detailListing?.listingID} Details</Text>
              <Badge colorScheme="green" fontSize="md">
                {detailListing?.Status}
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {detailListing && (
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
                            {detailListing.seller?.organizationName || "N/A"}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Email:</Text>
                          <Text>{detailListing.seller?.email || "N/A"}</Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Seller ID:</Text>
                          <Text>{detailListing.sellerID}</Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Role:</Text>
                          <Badge>{detailListing.seller?.role || "Unknown"}</Badge>
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
                            ${detailListing.Price?.toFixed(2)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Created:</Text>
                          <Text>
                            {new Date(detailListing.CreatedAt).toLocaleString()}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontWeight="bold">Total Tokens:</Text>
                          <Text>{detailListing.tokens?.length || 0}</Text>
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
                              {detailListing.avgQuality?.toFixed(1)}%
                            </Text>
                          </HStack>
                          <Progress
                            value={detailListing.avgQuality || 0}
                            size="md"
                            colorScheme={getQualityColor(detailListing.avgQuality || 0)}
                            borderRadius="md"
                          />
                        </Box>
                        <SimpleGrid columns={2} spacing={4}>
                          <Box>
                            <Text fontSize="sm" color="gray.600">
                              Minimum Quality
                            </Text>
                            <Text fontSize="2xl" fontWeight="bold">
                              {detailListing.minQuality || 0}%
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.600">
                              Maximum Quality
                            </Text>
                            <Text fontSize="2xl" fontWeight="bold">
                              {detailListing.maxQuality || 0}%
                            </Text>
                          </Box>
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>
                </Box>

                {/* Token Details */}
                {detailListing.tokenDetails && detailListing.tokenDetails.length > 0 && (
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
                              {detailListing.tokenDetails.map((token) => (
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
                {(!detailListing.tokenDetails || detailListing.tokenDetails.length === 0) && (
                  <Box>
                    <Heading size="sm" mb={2}>
                      Token IDs
                    </Heading>
                    <Card>
                      <CardBody>
                        <Text fontSize="sm" color="gray.600">
                          {detailListing.tokens?.join(", ") || "No tokens"}
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
    </Box>
  );
}