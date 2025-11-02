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

export default function CreditPortfolioPage() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const toast = useToast();
  const [groupedTokens, setGroupedTokens] = useState<any[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [myOperatorID, setMyOperatorID] = useState<number | null>(null);

  // Fetch tokens and users
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

  // Calculate stats
  // Calculate stats by summing token counts (totalCredits)
const stats = useMemo(() => {
  const total = groupedTokens.reduce((sum, g) => sum + (g.totalCredits || 0), 0);
  const minted = groupedTokens
    .filter((g) => g.status === "Minted")
    .reduce((sum, g) => sum + (g.totalCredits || 0), 0);
  const marketplace = groupedTokens
    .filter((g) => g.status === "On the Marketplace")
    .reduce((sum, g) => sum + (g.totalCredits || 0), 0);
  const retired = groupedTokens
    .filter((g) => g.status === "Retired")
    .reduce((sum, g) => sum + (g.totalCredits || 0), 0);

  return { total, minted, marketplace, retired };
}, [groupedTokens]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case "Minted":
        return "yellow";
      case "Ready for Minting":
        return "purple";
      case "On the Marketplace":
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
          <option value="On the Marketplace">On the Marketplace</option>
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

      {/* Token cards */}
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
      onClick={() => {
        window.location.href = `/telemetry/${g.jobID}`;
      }}
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

      
    </Box>
  );
}