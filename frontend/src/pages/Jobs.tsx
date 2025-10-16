import React, { useEffect, useMemo, useState, useContext } from "react";
import { Context } from "../context/authContext";
import {
  Box, Heading, Text, SimpleGrid, HStack, Input, Select, Button, Spinner, Alert, AlertIcon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, FormControl, FormLabel, useDisclosure, useToast, VStack,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";

type Job = {
  jobID: number;
  operatorID: number | null;
  toolID: number;
  status: string;
  dateCreated: string;
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
  const [newJobStatus, setNewJobStatus] = useState<"Active" | "Completed" | "Paused">("Active");
  const [creating, setCreating] = useState(false);


  const fetchJobs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {

        // get users from backend endpoint
        const uRes = await fetch(`${API}/users`);
        // if (!uRes.ok) throw new Error(`users fetch failed (${uRes.status})`);
        const users: UserRow[] = await uRes.json();

        const me = users.find((u) => String(u.firebaseUID) === String(user.uid)) ||
        users.find(
            (u) =>
            u.email &&
            user.email &&
            u.email.toLowerCase() === user.email.toLowerCase()
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

  // filtering
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
        // from chakra UI
        toast({
        title: "Validation Error",
        description: "Please enter a Tool ID",
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
        
        const response = await fetch(`${API}/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json",},
            body: JSON.stringify({
                operatorID: myOperatorID,
                toolID: parseInt(newJobToolID),
                status: newJobStatus,
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



  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">Jobs</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={onOpen}
        >
          Create New Job
        </Button>
      </HStack>

      {/* filtering */}
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
        {filtered.map((j) => (
          <Box
            key={j.jobID}
            border="1px solid"
            borderColor="gray.200"
            rounded="lg"
            p={4}
          >
            <HStack justify="space-between" mb={2}>
              <Heading size="md">Job #{j.jobID}</Heading>
              <Box
                as="span"
                fontWeight="semibold"
                px={2}
                py={1}
                rounded="md"
                bg={
                  j.status === "Completed"
                    ? "green.100"
                    : j.status === "Paused"
                    ? "yellow.100"
                    : "blue.100"
                }
              >
                {j.status}
              </Box>
            </HStack>
            <Text>
              <b>Operator:</b> {j.operatorID ?? "Unassigned"}
            </Text>
            <Text>
              <b>Tool:</b> {j.toolID}
            </Text>
            <Text>
              <b>Created:</b>{" "}
              {new Date(j.dateCreated).toLocaleString()}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      {!filtered.length && <Text mt={6}>No jobs match your filters.</Text>}

      {/* create new job modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Job</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
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
                  onChange={(e) => setNewJobStatus(e.target.value as "Active" | "Completed" | "Paused")}
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