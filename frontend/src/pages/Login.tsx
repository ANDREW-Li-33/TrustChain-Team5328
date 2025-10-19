import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  Heading,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { app } from "../firebase/firebase";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || "http://localhost:5050";

export default function LoginPage() {
  const auth = getAuth(app);
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password).then(async (obj) => {
        const firebaseUID = obj.user?.uid;
        try {
          const res = await fetch(`${API_BASE}/users`);
          const users = await res.json();
          const me = users.find((u: any) => String(u.firebaseUID) === String(firebaseUID)) || users.find((u: any) => u.email && obj.user?.email && u.email.toLowerCase() === obj.user.email.toLowerCase());
          const role = me?.role?.toLowerCase?.();
          if (role === "operator") nav("/jobs");
          else if (role === "verifier") nav("/verifier");
          else nav("/operator");
        } catch {
          nav("/");
        }
      });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Flex
      minH={"100vh"}
      align={"center"}
      justify={"center"}
      bg={useColorModeValue("gray.50", "gray.800")}
    >
      <Stack spacing={8} mx={"auto"} maxW={"lg"} py={12} px={6}>
        <Stack align={"center"}>
          <Heading fontSize={"3xl"}>Welcome to TrustChain CO2</Heading>
          <Text fontSize={"xl"}>Transparency in Every Transaction</Text>
        </Stack>
        <Box
          rounded={"lg"}
          bg={useColorModeValue("white", "gray.700")}
          boxShadow={"lg"}
          p={8}
        >
          <Stack spacing={4}>
            <FormControl id="email">
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </FormControl>
            <FormControl id="password">
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </FormControl>
            <Stack spacing={10}>
              <Stack
                direction={{ base: "column", sm: "row" }}
                align={"end"}
                justify={"space-between"}
              >
                <Link to="/register">
                  <Text color={"blue.400"}>Don't have an account?</Text>
                </Link>
              </Stack>
              <Button
                bg={"blue.400"}
                color={"white"}
                _hover={{
                  bg: "blue.500",
                }}
                onClick={(e) => handleSubmit(e)}
              >
                Sign in
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
}
