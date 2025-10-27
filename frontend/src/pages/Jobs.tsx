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
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";

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

export default function JobsPage() {
  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  const { user } = useContext<any>(Context);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]); // Store all users
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [myOperatorID, setMyOperatorID] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [newJobToolID, setNewJobToolID] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobStatus, setNewJobStatus] = useState<"Active" | "Completed" | "Paused">("Active");
  const [creating, setCreating] = useState(false);

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
      setUsers(allUsers); // Store all users for operator name lookup

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

      // Get jobs - all jobs for admin, only user's jobs for operators
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
    return operator?.organizationName || `${operatorID}`;
  };

  // Filtering
  const filtered = useMemo(
    () =>
      jobs.filter((j) => {
        const matchesStatus = status === "all" || j.status === status;
        const operatorName = getOperatorName(j.operatorID);
        const matchesQ =
          !q ||
          String(j.jobID).includes(q) ||
          j.jobTitle.toLowerCase().includes(q.toLowerCase()) ||
          operatorName.toLowerCase().includes(q.toLowerCase()) ||
          String(j.operatorID ?? "").includes(q) ||
          String(j.toolID).includes(q);
        return matchesStatus && matchesQ;
      }),
    [jobs, q, status, users]
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

      {/* Search and filter */}
      <HStack gap={4} mb={4} align="center" flexWrap="wrap">
        <Input
          placeholder="Search by Job ID, Title, Operator, Tool ID..."
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
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Paused">Paused</option>
          <option value="Ready for Minting">Ready for Minting</option>
          <option value="Denied">Denied</option>
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

      {/* Job cards - styled like verifier dashboard */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {filtered.map((j) => (
          <Card
            key={j.jobID}
            as="a"
            href={`/telemetry/${j.jobID}`}
            cursor="pointer"
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
                <Text>
                  <strong>Operator ID:</strong> {j.operatorID ?? "Unassigned"}
                </Text>
                <Text>
                  <strong>Tool ID:</strong> {j.toolID}
                </Text>
                <Text>
                  <strong>Created:</strong> {new Date(j.dateCreated).toLocaleString()}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {!filtered.length && <Text mt={6}>No jobs match your filters.</Text>}

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
    </Box>
  );
}