import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";

type SystemStatus = {
  minting: boolean;
  transfer: boolean;
  retire: boolean;
};

type GovernanceLog = {
  id?: number;
  Action: string;
  Timestamp: string;
};

export default function AdminActions() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    minting: true,
    transfer: true,
    retire: true,
  });
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceLog[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);

  const toast = useToast();
  const bgColor = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // Fetch system status
  const fetchSystemStatus = async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const [mintingRes, transferRes, retireRes] = await Promise.all([
        fetch(`${API}/systemstatus/minting`),
        fetch(`${API}/systemstatus/transfer`),
        fetch(`${API}/systemstatus/retire`),
      ]);

      if (mintingRes.ok && transferRes.ok && retireRes.ok) {
        const mintingData = await mintingRes.json();
        const transferData = await transferRes.json();
        const retireData = await retireRes.json();

        setSystemStatus({
          minting: mintingData.active ?? true,
          transfer: transferData.active ?? true,
          retire: retireData.active ?? true,
        });
      } else {
        setStatusError("System status endpoints not available. Showing default values.");
        setSystemStatus({
          minting: true,
          transfer: true,
          retire: true,
        });
      }
    } catch (err) {
      console.error("Error fetching system status:", err);
      setStatusError("Unable to fetch system status. Using default values.");
      setSystemStatus({
        minting: true,
        transfer: true,
        retire: true,
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fetch governance logs
  const fetchGovernanceLogs = async () => {
    setLoadingLogs(true);
    setLogsError(null);
    try {
      const res = await fetch(`${API}/governancelogs`);
      if (res.ok) {
        const data = await res.json();
        setGovernanceLogs(data || []);
      } else {
        setLogsError("Governance logs endpoint not available.");
        setGovernanceLogs([]);
      }
    } catch (err) {
      console.error("Error fetching governance logs:", err);
      setLogsError("Unable to fetch governance logs.");
      setGovernanceLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    fetchGovernanceLogs();
  }, []);

  const [togglingMinting, setTogglingMinting] = useState(false);
  const [togglingTransfer, setTogglingTransfer] = useState(false);
  const [togglingRetire, setTogglingRetire] = useState(false);

  // Button handlers
  const handleToggleMinting = async () => {
    setTogglingMinting(true);
    try {
      const res = await fetch(`${API}/systemstatus/minting/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus((prev) => ({ ...prev, minting: data.active }));
        toast({
          title: data.active ? "Minting Activated" : "Minting Paused",
          description: data.message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        fetchGovernanceLogs();
      } else {
        throw new Error("Failed to toggle minting");
      }
    } catch (err) {
      console.error("Error toggling minting:", err);
      toast({
        title: "Error",
        description: "Failed to toggle minting status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setTogglingMinting(false);
    }
  };

  const handleToggleTransfer = async () => {
    setTogglingTransfer(true);
    try {
      const res = await fetch(`${API}/systemstatus/transfer/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus((prev) => ({ ...prev, transfer: data.active }));
        toast({
          title: data.active ? "Sales Activated" : "Sales Paused",
          description: data.message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        fetchGovernanceLogs();
      } else {
        throw new Error("Failed to toggle transfer");
      }
    } catch (err) {
      console.error("Error toggling transfer:", err);
      toast({
        title: "Error",
        description: "Failed to toggle sales status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setTogglingTransfer(false);
    }
  };

  const handleToggleRetire = async () => {
    setTogglingRetire(true);
    try {
      const res = await fetch(`${API}/systemstatus/retire/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus((prev) => ({ ...prev, retire: data.active }));
        toast({
          title: data.active ? "Retiring Activated" : "Retiring Paused",
          description: data.message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        fetchGovernanceLogs();
      } else {
        throw new Error("Failed to toggle retire");
      }
    } catch (err) {
      console.error("Error toggling retire:", err);
      toast({
        title: "Error",
        description: "Failed to toggle retiring status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setTogglingRetire(false);
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes("activated") || lowerAction.includes("resume")) {
      return "green";
    }
    if (lowerAction.includes("deactivated") || lowerAction.includes("pause")) {
      return "red";
    }
    return "gray";
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            Admin Actions
          </Heading>
          <Text color="gray.600">
            Manage system-wide settings and view governance activity
          </Text>
        </Box>

        {/* System Status Controls */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="md">System Controls</Heading>
          </CardHeader>
          <CardBody>
            {loadingStatus ? (
              <Box textAlign="center" py={6}>
                <Spinner size="lg" />
                <Text mt={2}>Loading system status...</Text>
              </Box>
            ) : (
              <>
                {statusError && (
                  <Alert status="warning" mb={4} borderRadius="md">
                    <AlertIcon />
                    {statusError}
                  </Alert>
                )}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  {/* Minting Control */}
                  <Card variant="outline">
                    <CardBody>
                      <VStack spacing={4}>
                        <HStack justify="space-between" w="100%">
                          <Text fontWeight="bold" fontSize="lg">
                            Minting
                          </Text>
                          <Badge
                            colorScheme={systemStatus.minting ? "green" : "red"}
                            fontSize="sm"
                            px={2}
                            py={1}
                          >
                            {systemStatus.minting ? "Active" : "Paused"}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Controls whether new tokens can be minted from verified jobs.
                        </Text>
                        <Button
                          colorScheme={systemStatus.minting ? "red" : "green"}
                          w="100%"
                          onClick={handleToggleMinting}
                          isLoading={togglingMinting}
                          loadingText={systemStatus.minting ? "Pausing..." : "Resuming..."}
                        >
                          {systemStatus.minting ? "Pause Minting" : "Resume Minting"}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Transfer/Sale Control */}
                  <Card variant="outline">
                    <CardBody>
                      <VStack spacing={4}>
                        <HStack justify="space-between" w="100%">
                          <Text fontWeight="bold" fontSize="lg">
                            Sale of Tokens
                          </Text>
                          <Badge
                            colorScheme={systemStatus.transfer ? "green" : "red"}
                            fontSize="sm"
                            px={2}
                            py={1}
                          >
                            {systemStatus.transfer ? "Active" : "Paused"}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Controls whether tokens can be bought and sold on the marketplace.
                        </Text>
                        <Button
                          colorScheme={systemStatus.transfer ? "red" : "green"}
                          w="100%"
                          onClick={handleToggleTransfer}
                          isLoading={togglingTransfer}
                          loadingText={systemStatus.transfer ? "Pausing..." : "Resuming..."}
                        >
                          {systemStatus.transfer ? "Pause Sales" : "Resume Sales"}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Retire Control */}
                  <Card variant="outline">
                    <CardBody>
                      <VStack spacing={4}>
                        <HStack justify="space-between" w="100%">
                          <Text fontWeight="bold" fontSize="lg">
                            Retiring
                          </Text>
                          <Badge
                            colorScheme={systemStatus.retire ? "green" : "red"}
                            fontSize="sm"
                            px={2}
                            py={1}
                          >
                            {systemStatus.retire ? "Active" : "Paused"}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Controls whether token owners can retire their carbon credits.
                        </Text>
                        <Button
                          colorScheme={systemStatus.retire ? "red" : "green"}
                          w="100%"
                          onClick={handleToggleRetire}
                          isLoading={togglingRetire}
                          loadingText={systemStatus.retire ? "Pausing..." : "Resuming..."}
                        >
                          {systemStatus.retire ? "Pause Retiring" : "Resume Retiring"}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </>
            )}
          </CardBody>
        </Card>

        <Divider />

        {/* Governance Logs */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="md">Previous Admin Actions</Heading>
            <Text fontSize="sm" color="gray.600" mt={1}>
              History of governance actions taken by administrators
            </Text>
          </CardHeader>
          <CardBody>
            {loadingLogs ? (
              <Box textAlign="center" py={6}>
                <Spinner size="lg" />
                <Text mt={2}>Loading governance logs...</Text>
              </Box>
            ) : logsError ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                {logsError}
              </Alert>
            ) : governanceLogs.length === 0 ? (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                No governance actions have been recorded yet.
              </Alert>
            ) : (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Action</Th>
                      <Th>Timestamp</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {governanceLogs.map((log, index) => (
                      <Tr key={log.id || index}>
                        <Td>
                          <HStack>
                            <Badge colorScheme={getActionColor(log.Action)}>
                              {log.Action}
                            </Badge>
                          </HStack>
                        </Td>
                        <Td>{formatDate(log.Timestamp)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}