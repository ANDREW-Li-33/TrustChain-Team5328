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
  const [tokens, setTokens] = useState<Token[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [myOperatorID, setMyOperatorID] = useState<number | null>(null);

  // Fetch tokens and users
  const fetchTokens = async () => {
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

      const endpoint = `${API}/tokens/owner/${operatorID}`;
      console.log('Fetching tokens for operator:', operatorID);
      console.log('Endpoint:', endpoint);

      const tRes = await fetch(endpoint);
      console.log('Response status:', tRes.status);
      
      // Handle 404 as empty tokens array (no tokens for this owner yet)
      if (tRes.status === 404) {
        console.log('No tokens found (404) - setting empty array');
        setTokens([]);
      } else if (!tRes.ok) {
        throw new Error(`tokens fetch failed (${tRes.status})`);
      } else {
        const tokenData = await tRes.json();
        console.log('Tokens received:', tokenData);
        setTokens(tokenData);
      }
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
    fetchTokens();
  }, [API, user]);

  // Get operator name from users array
  const getOperatorName = (ownerID: number | null) => {
    if (!ownerID) return "Unassigned";
    const operator = users.find((u) => u.userID === ownerID);
    return operator?.organizationName || `Operator ${ownerID}`;
  };

  // Filtering
  const filtered = useMemo(
    () => {
      const result = tokens.filter((t) => {
        const matchesStatus = status === "all" || t.status === status;
        const operatorName = getOperatorName(t.ownerID);
        const matchesQ =
          !q ||
          String(t.tokenID).includes(q) ||
          String(t.jobID).includes(q) ||
          operatorName.toLowerCase().includes(q.toLowerCase()) ||
          String(t.ownerID ?? "").includes(q) ||
          t.blockchainHash?.toLowerCase().includes(q.toLowerCase());
        return matchesStatus && matchesQ;
      });
      console.log('Total tokens:', tokens.length);
      console.log('Filtered tokens:', result.length);
      console.log('Current filter - status:', status, 'query:', q);
      return result;
    },
    [tokens, q, status, users]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const readyToMint = filtered.filter(t => t.status === "Ready for Minting").length;
    const minted = filtered.filter(t => t.status === "Minted").length;
    const marketplace = filtered.filter(t => t.status === "On the Marketplace").length;
    const retired = filtered.filter(t => t.retiredAt).length;

    return { total, readyToMint, minted, marketplace, retired };
  }, [filtered]);

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
              <StatLabel>Ready to Mint</StatLabel>
              <StatNumber color="purple.500">{stats.readyToMint}</StatNumber>
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
        {filtered.map((t) => (
          <Card
            key={t.tokenID}
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              transform: "translateY(-4px)",
              boxShadow: "lg",
            }}
            onClick={() => {
              // Navigate to token details or job telemetry
              window.location.href = `/telemetry/${t.jobID}`;
            }}
          >
            <CardHeader>
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Heading size="md">Token #{t.tokenID}</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Job #{t.jobID}
                  </Text>
                </VStack>
                <Badge colorScheme={getStatusColor(t.status)} size="lg">
                  {t.status}
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              <VStack align="start" spacing={3}>
                <Box width="100%">
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="bold">Quality Score</Text>
                    <Text fontSize="sm" fontWeight="bold">{t.quality}%</Text>
                  </HStack>
                  <Progress 
                    value={t.quality} 
                    size="sm" 
                    colorScheme={getQualityColor(t.quality)}
                    borderRadius="md"
                  />
                </Box>

                {t.mintedAt && (
                  <Text fontSize="sm">
                    <strong>Minted:</strong> {new Date(t.mintedAt).toLocaleDateString()}
                  </Text>
                )}

                {t.retiredAt && (
                  <Text fontSize="sm" color="gray.600">
                    <strong>Retired:</strong> {new Date(t.retiredAt).toLocaleDateString()}
                  </Text>
                )}

                {t.blockchainHash && (
                  <Text fontSize="xs" color="gray.600" noOfLines={1}>
                    <strong>Hash:</strong> {t.blockchainHash}
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {!filtered.length && (
        <Box textAlign="center" mt={10}>
          <Text fontSize="lg" color="gray.600">No tokens match your filters.</Text>
          {tokens.length === 0 && (
            <Text fontSize="md" color="gray.500" mt={2}>
              Complete jobs to earn carbon credit tokens.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}