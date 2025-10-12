import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  HStack,
  Input,
  Select,
  Button,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

type Job = {
  jobID: number;
  operatorID: number | null;
  toolID: number;
  status: string;
  dateCreated: string;
};

export default function JobsPage() {
  const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/jobs`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setJobs(data);
      } catch (e: any) {
        setErr(e.message || "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, [API]);

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

  if (loading) return <Spinner ml="6" mt="6" />;

  if (err)
    return (
      <Alert status="error" m="6">
        <AlertIcon />
        {err}
      </Alert>
    );

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        Jobs
      </Heading>

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
        <Button onClick={() => { setQ(""); setStatus("all"); }}>Reset</Button>
      </HStack>

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
            <Text><b>Operator:</b> {j.operatorID ?? "Unassigned"}</Text>
            <Text><b>Tool:</b> {j.toolID}</Text>
            <Text><b>Created:</b> {new Date(j.dateCreated).toLocaleString()}</Text>
          </Box>
        ))}
      </SimpleGrid>

      {!filtered.length && <Text mt={6}>No jobs match your filters.</Text>}
    </Box>
  );
}
