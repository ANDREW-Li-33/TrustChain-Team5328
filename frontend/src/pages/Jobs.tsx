// React page component

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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [myOperatorID, setMyOperatorID] = useState<number | null>(null);

  const [newJobToolID, setNewJobToolID] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobStatus, setNewJobStatus] = useState<"Active" | "Completed" | "Paused">("Active");
  const [creating, setCreating] = useState(false);

  // getting all jobs (for the current user) from the database
  const fetchJobs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // get users from backend endpoint
      const uRes = await fetch(`${API}/users`);
      const users: UserRow[] = await uRes.json();

      // search the list of users to find the user that matches the logged in user's 
      // firebaseUID or email
      const me =
        users.find((u) => String(u.firebaseUID) === String(user.uid)) ||
        users.find(
          (u) => u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()
        );

      if (!me) throw new Error("No matching user in the DB");

      
      const operatorID = me.userID;
      setMyOperatorID(operatorID);

      // get jobs from backend endpoint
      const jRes = await fetch(`${API}/jobs/operator/${operatorID}`);
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

  // filtering: useMemo hook to create a new array of filtered cards
  // takes the full job list from state and applies teh q and status filters
  const filtered = useMemo(
    () =>
      jobs.filter((j) => {
        const matchesStatus = status === "all" || j.status === status;
        const matchesQ =
          !q ||
          String(j.jobID).includes(q) ||
          String(j.operatorID ?? "").includes(q) ||
          String(j.toolID).includes(q);
        return matchesStatus && matchesQ;
      }),
    [jobs, q, status]
  );

  const handleCreateJob = async () => {
    if (!newJobToolID) {
      toast({
        title: "Validation Error",
        description: "Please enter a Tool ID",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!newJobTitle) {
      toast({
        title: "Validation Error",
        description: "Please enter a Job Title",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!myOperatorID) {
      toast({
        title: "Error",
        description: "Could not determine operator ID",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setCreating(true);

    try {
      // sending the backend request to create the job
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

      if (!response.ok) {
        throw new Error("Failed to create job");
      }

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
            return { bg: "green.100", color: "green.800" };
        case "Paused":
            return { bg: "yellow.100", color: "yellow.800" };
        case "Ready for Minting":
        case "Minted":
            return { bg: "purple.100", color: "purple.800" };
        case "Denied":
            return { bg: "red.100", color: "red.800" };
        case "Active":
        default:
            return { bg: "blue.100", color: "blue.800" };
    }
  };

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">Jobs</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onOpen}>
          Create New Job
        </Button>
      </HStack>

      {/* searching and filtering */}
      <HStack gap={4} mb={4} align="center" flexWrap="wrap">
        <Input
          placeholder="Search jobID / operatorID / toolID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxW="320px"
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

      {/* cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {/* notice that we use filtered, not the full jobs list */}
        {filtered.map((j) => {
          const statusColors = getStatusColor(j.status);
          return (
            <Box
              key={j.jobID}
              border="1px solid"
              borderColor="gray.200"
              rounded="lg"
              p={4}
              as="a"
              href={`/telemetry/${j.jobID}`}
              _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
              transition="all 0.2s"
            >
              <HStack justify="space-between" mb={2}>
                <Heading size="md">Job #{j.jobID}</Heading>
                <Box
                  as="span"
                  fontWeight="semibold"
                  px={2}
                  py={1}
                  rounded="md"
                  bg={statusColors.bg}
                  color={statusColors.color}
                >
                  {j.status}
                </Box>
              </HStack>
              <Text mb={2} fontWeight="bold" color="blue.600">
                {j.jobTitle}
              </Text>
              <Text>
                <b>Operator:</b> {j.operatorID ?? "Unassigned"}
              </Text>
              <Text>
                <b>Tool:</b> {j.toolID}
              </Text>
              <Text>
                <b>Created:</b> {new Date(j.dateCreated).toLocaleString()}
              </Text>
            </Box>
          );
        })}
      </SimpleGrid>

      {!filtered.length && <Text mt={6}>No jobs match your filters.</Text>}

      {/* job creation */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Job</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {/* inputting data */}
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