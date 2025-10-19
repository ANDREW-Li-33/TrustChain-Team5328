import {
  Box,
  Flex,
  Avatar,
  HStack,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useDisclosure,
  useColorModeValue,
  Stack,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon, AddIcon } from "@chakra-ui/icons";
import { app } from "../firebase/firebase";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  path: string;
}

const Links = [
  {
    name: "Operator",
    path: "/operator",
  },
  {
    name: "Jobs",
    path: "/jobs",
  },
  {
    name: "Tokens",
    path: "/tokens",
  },
  {
    name: "Marketplace",
    path: "/marketplace",
  },
];

const NavLink = (props: Props) => {
  const { children, path } = props;

  return (
    <Box
      as="a"
      px={2}
      py={1}
      rounded={"md"}
      _hover={{
        textDecoration: "none",
        bg: useColorModeValue("gray.200", "gray.700"),
      }}
      href={path}
    >
      {children}
    </Box>
  );
};

export default function NavBar() {
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    <>
      <Box bg={useColorModeValue("gray.100", "gray.900")} px={4}>
        <Flex h={16} alignItems={"center"} justifyContent={"space-between"}>
          <IconButton
            size={"md"}
            icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
            aria-label={"Open Menu"}
            display={{ md: "none" }}
            onClick={isOpen ? onClose : onOpen}
          />
          <HStack spacing={8} alignItems={"center"}>
            <HStack
              as={"nav"}
              spacing={4}
              display={{ base: "none", md: "flex" }}
            >
              {Links.map((link) => (
                <NavLink key={link.name} path={link.path}>
                  {link.name}
                </NavLink>
              ))}
            </HStack>
          </HStack>
          <Flex alignItems={"center"}>
            <Button
              variant={"solid"}
              colorScheme={"teal"}
              size={"sm"}
              mr={4}
              leftIcon={<AddIcon />}
            >
              Action
            </Button>
            <Menu>
              <MenuButton
                as={Button}
                rounded={"full"}
                variant={"link"}
                cursor={"pointer"}
                minW={0}
              >
                <Avatar size={"sm"} />
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleSubmit}>Sign Out</MenuItem>
                <MenuDivider />
                <MenuItem>Link 2</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>

        {isOpen ? (
          <Box pb={4} display={{ md: "none" }}>
            <Stack as={"nav"} spacing={4}>
              {Links.map((link) => (
                <NavLink key={link.name} path={link.path}>
                  {link.name}
                </NavLink>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Box>
    </>
  );
}
