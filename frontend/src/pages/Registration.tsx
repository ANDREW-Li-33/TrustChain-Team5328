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
  RadioGroup,
  Radio,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { app } from "../firebase/firebase";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";

export default function RegistrationPage() {
  const auth = getAuth(app);
  const nav = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Operator");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);

  console.log(role);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Registration Failed",
        description: "Passwords don't match",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Error",
        description: "Password must be at least 6 characters long",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (role === "Operator" && !organizationName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your organization name",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password).then(
        async (obj) => {
          console.log(obj);

          const dataToSend = {
            firebaseUID: obj.user.uid,
            email,
            role: role,
            organizationName: organizationName || null,
          };

          const res = await fetch("http://localhost:5050/users/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(dataToSend),
          });

          console.log("res", res);

          toast({
            title: "Registration Successful",
            description: "Account created successfully!",
            status: "success",
            duration: 3000,
            isClosable: true,
          });

          if (role === "Operator") nav("/jobs");
          else if (role === "Verifier") nav("/verifier");
          else if (role === "Buyer") nav("/tokens");
          else nav("/operator");
        }
      );
    } catch (e: any) {
      console.error("Registration error:", e);
      let errorMessage = "Registration failed. Please try again.";

      if (e.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists.";
      } else if (e.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (e.code === "auth/weak-password") {
        errorMessage =
          "Password is too weak. Please choose a stronger password.";
      } else if (e.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
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
            <FormControl id="email" isRequired>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </FormControl>
            <FormControl id="password" isRequired>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </FormControl>
            <FormControl id="confirmPassword" isRequired>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                }}
              />
            </FormControl>

            <RadioGroup onChange={setRole} value={role}>
              <Stack direction="row">
                <Radio value="Operator">Operator</Radio>
                <Radio value="Buyer">Buyer</Radio>
                <Radio value="Verifier">Verifier</Radio>
                <Radio value="SLB Admin">SLB Admin</Radio>
              </Stack>
            </RadioGroup>

            {(role === "Operator" || role === "Buyer") && (
              <FormControl id="organizationName" isRequired>
                <FormLabel>Your Organization's Name</FormLabel>
                <Input
                  type="organizationName"
                  value={organizationName}
                  onChange={(e) => {
                    setOrganizationName(e.target.value);
                  }}
                />
              </FormControl>
            )}

            <Stack spacing={10}>
              <Stack
                direction={{ base: "column", sm: "row" }}
                align={"start"}
                justify={"space-between"}
              >
                <Link to="/login">
                  <Text color={"blue.400"}>Have an account?</Text>
                </Link>
              </Stack>
              <Button
                bg={"blue.400"}
                color={"white"}
                _hover={{
                  bg: "blue.500",
                }}
                isLoading={loading}
                loadingText="Creating account..."
                onClick={(e) => handleSubmit(e)}
              >
                Register
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
}
