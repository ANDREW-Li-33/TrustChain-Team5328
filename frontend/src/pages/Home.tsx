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
import { app } from "../firebase/firebase";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const auth = getAuth(app);
  const nav = useNavigate();

  const handleSubmit = () => {
    signOut(auth)
      .then(() => {
        console.log("User signed out successfully.");
        nav("/login");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  return (
    <Flex
      minH={"100vh"}
      align={"center"}
      justify={"center"}
      bg={useColorModeValue("gray.50", "gray.800")}
    >
      <Button bgColor="teal" onClick={handleSubmit}>
        Sign Out
      </Button>
    </Flex>
  );
}
