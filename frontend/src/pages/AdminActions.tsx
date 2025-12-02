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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Input,
  FormControl,
  FormLabel,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon, WarningTwoIcon } from "@chakra-ui/icons";

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

type ConfirmAction = "minting" | "transfer" | "retire" | null;

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

  const [togglingMinting, setTogglingMinting] = useState(false);
  const [togglingTransfer, setTogglingTransfer] = useState(false);
  const [togglingRetire, setTogglingRetire] = useState(false);

  // Confirmation modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

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

  // Open confirmation modal
  const openConfirmModal = (action: ConfirmAction) => {
    setConfirmAction(action);
    setAdminPassword("");
    setPasswordError(null);
    setShowPassword(false);
    onOpen();
  };

  // Close confirmation modal
  const closeConfirmModal = () => {
    setConfirmAction(null);
    setAdminPassword("");
    setPasswordError(null);
    setShowPassword(false);
    onClose();
  };

  // Get warning message based on action
  const getWarningMessage = () => {
    if (!confirmAction) return "";

    const isCurrentlyActive = systemStatus[confirmAction];
    const actionName = confirmAction === "transfer" ? "sales" : confirmAction;

    if (isCurrentlyActive) {
      switch (confirmAction) {
        case "minting":
          return "Pausing minting will stop all new carbon credit tokens from being created. Verified jobs will be queued and minted once minting is resumed. This action will be logged in the governance history.";
        case "transfer":
          return "Pausing sales will prevent all token purchases and transfers on the marketplace. Existing listings will remain but cannot be purchased until sales are resumed. This action will be logged in the governance history.";
        case "retire":
          return "Pausing retiring will prevent token owners from retiring their carbon credits. This action will be logged in the governance history.";
        default:
          return "";
      }
    } else {
      switch (confirmAction) {
        case "minting":
          return "Resuming minting will allow new carbon credit tokens to be created from verified jobs. Any queued minting requests will be processed. This action will be logged in the governance history.";
        case "transfer":
          return "Resuming sales will allow token purchases and transfers on the marketplace. This action will be logged in the governance history.";
        case "retire":
          return "Resuming retiring will allow token owners to retire their carbon credits. This action will be logged in the governance history.";
        default:
          return "";
      }
    }
  };

  // Get action title
  const getActionTitle = () => {
    if (!confirmAction) return "";

    const isCurrentlyActive = systemStatus[confirmAction];
    const actionName = confirmAction === "transfer" ? "Sales" : confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1);

    return isCurrentlyActive ? `Pause ${actionName}` : `Resume ${actionName}`;
  };

  // Handle confirmed action
  const handleConfirmedAction = async () => {
    if (!confirmAction || !adminPassword) {
      setPasswordError("Please enter the admin password");
      return;
    }

    setIsConfirming(true);
    setPasswordError(null);

    const setToggling = {
      minting: setTogglingMinting,
      transfer: setTogglingTransfer,
      retire: setTogglingRetire,
    }[confirmAction];

    setToggling(true);

    try {
      const res = await fetch(`${API}/systemstatus/${confirmAction}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        setSystemStatus((prev) => ({ ...prev, [confirmAction]: data.active }));

        const actionName = confirmAction === "transfer" ? "Sales" : confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1);
        toast({
          title: data.active ? `${actionName} Activated` : `${actionName} Paused`,
          description: data.message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        fetchGovernanceLogs();
        closeConfirmModal();
      } else {
        const errorData = await res.json();
        if (res.status === 401) {
          setPasswordError("Invalid admin password. Please try again.");
        } else {
          setPasswordError(errorData.error || "Failed to perform action");
        }
      }
    } catch (err) {
      console.error(`Error toggling ${confirmAction}:`, err);
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setIsConfirming(false);
      setToggling(false);
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
    console.log(lowerAction);
    if (lowerAction.includes("deactivated") || lowerAction.includes("pause")) {
        return "red";
      }
    if (lowerAction.includes("activated") || lowerAction.includes("resume")) {
      return "green";
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
                          onClick={() => openConfirmModal("minting")}
                          isLoading={togglingMinting}
                          loadingText={systemStatus.minting ? "Pausing..." : "Resuming..."}
                        >
                          {systemStatus.minting ? "Pause Minting" : "Resume Minting"}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Transfer/Sale Control */}
                  {/* <Card variant="outline">
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
                          onClick={() => openConfirmModal("transfer")}
                          isLoading={togglingTransfer}
                          loadingText={systemStatus.transfer ? "Pausing..." : "Resuming..."}
                        >
                          {systemStatus.transfer ? "Pause Sales" : "Resume Sales"}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card> */}

                  {/* Retire Control */}
                  {/* <Card variant="outline">
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
                          onClick={() => openConfirmModal("retire")}
                          isLoading={togglingRetire}
                          loadingText={systemStatus.retire ? "Pausing..." : "Resuming..."}
                        >
                          {systemStatus.retire ? "Pause Retiring" : "Resume Retiring"}
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card> */}
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

      {/* Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={closeConfirmModal} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <WarningTwoIcon color="orange.500" />
              <Text>{getActionTitle()}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Warning Message */}
              <Alert
                status={systemStatus[confirmAction!] ? "warning" : "info"}
                borderRadius="md"
              >
                <AlertIcon />
                <Text fontSize="sm">{getWarningMessage()}</Text>
              </Alert>

              {/* Password Input */}
              <FormControl isRequired isInvalid={!!passwordError}>
                <FormLabel>Admin Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleConfirmedAction();
                      }
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
                {passwordError && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {passwordError}
                  </Text>
                )}
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeConfirmModal}>
              Cancel
            </Button>
            <Button
              colorScheme={systemStatus[confirmAction!] ? "red" : "green"}
              onClick={handleConfirmedAction}
              isLoading={isConfirming}
              loadingText="Confirming..."
              isDisabled={!adminPassword}
            >
              {getActionTitle()}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}