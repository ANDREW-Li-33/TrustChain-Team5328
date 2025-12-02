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
  Badge,
  Text,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons";
import { AiFillMeh } from "react-icons/ai";
import {
  MdOutlinePendingActions,
  MdDashboard,
  MdAdminPanelSettings,
} from "react-icons/md";
import { BsStack } from "react-icons/bs";
import { RiCopperCoinFill } from "react-icons/ri";
import { FaShoppingBag, FaHistory, FaHandshake } from "react-icons/fa";
import { app } from "../firebase/firebase";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { Context } from "../context/authContext";

interface Props {
  children: React.ReactNode;
  path: string;
  icon: React.ReactNode;
}

type UserRow = {
  userID: number;
  firebaseUID: string;
  email?: string | null;
  role: string;
  organizationName?: string | null;
};

// Default links for operators
const OperatorLinks = [
  {
    name: "Jobs",
    path: "/jobs",
    icon: <FaHandshake />,
  },
  {
    name: "Tokens",
    path: "/tokens",
    icon: <RiCopperCoinFill />,
  },
  {
    name: "Marketplace",
    path: "/marketplace",
    icon: <FaShoppingBag />,
  },
  {
    name: "User History",
    path: "/userhistory",
    icon: <FaHistory />,
  },
];

// Buyer-specific links
const BuyerLinks = [
  {
    name: "Portfolio",
    path: "/tokens",
    icon: <BsStack />,
  },
  {
    name: "Marketplace",
    path: "/marketplace",
    icon: <FaShoppingBag />,
  },
  {
    name: "User History",
    path: "/userhistory",
    icon: <FaHistory />,
  },
];

// SLB Admin specific links
const AdminLinks = [

  {
    name: "Jobs",
    path: "/jobs",
    icon: <FaHandshake />,
  },
  {
    name: "Pending Requests",
    path: "/verifier",
    icon: <MdOutlinePendingActions />,
  },
  {
    name: "Tokens",
    path: "/tokens",
    icon: <RiCopperCoinFill />,
  },
  {
    name: "Marketplace",
    path: "/marketplace",
    icon: <FaShoppingBag />,
  },
  {
    name: "Admin Actions",
    path: "/adminaction",
    icon: <MdAdminPanelSettings />,
  },
];

const VerifierLinks = [
  {
    name: "Pending Requests",
    path: "/verifier",
    icon: <MdOutlinePendingActions />,
  },
];

const NavLink = (props: Props) => {
  const { children, path, icon } = props;
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Flex
      as={Link}
      to={path}
      px={2}
      py={1}
      rounded={"md"}
      bg={isActive ? useColorModeValue("blue.100", "blue.800") : "transparent"}
      fontWeight={isActive ? "semibold" : "normal"}
      _hover={{
        textDecoration: "none",
        bg: useColorModeValue("gray.200", "gray.700"),
      }}
      align="center"
    >
      {children}
      <Box pl="5px">{icon}</Box>
    </Flex>
  );
};

export default function NavBar() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const auth = getAuth(app);
  const nav = useNavigate();
  const { user } = useContext<any>(Context);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [isVerifier, setIsVerifier] = useState(false);
  const [userInfo, setUserInfo] = useState<UserRow | null>(null);

  const API =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5050";

  // Fetch user role to determine which links to show
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        return;
      }

      try {
        const res = await fetch(`${API}/users`);
        const users: UserRow[] = await res.json();

        const me =
          users.find((u) => String(u.firebaseUID) === String(user.uid)) ||
          users.find(
            (u) =>
              u.email &&
              user.email &&
              u.email.toLowerCase() === user.email.toLowerCase()
          );

        if (me) {
          setUserInfo(me);
          const userRole = me.role?.toLowerCase();
          setIsAdmin(userRole === "slb admin" || userRole === "slb_admin");
          setIsBuyer(userRole === "buyer");
          setIsVerifier(userRole === "verifier");
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      }
    };

    fetchUserRole();
  }, [user, API]);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log("User signed out successfully.");
        nav("/login");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  // Determine which links to show based on role
  const links = isAdmin
    ? AdminLinks
    : isBuyer
    ? BuyerLinks
    : isVerifier
    ? VerifierLinks
    : OperatorLinks;

  return (
    <>
      <Box
        bg={useColorModeValue("gray.100", "gray.900")}
        px={4}
        borderBottom="1px"
        borderColor={useColorModeValue("gray.200", "gray.700")}
      >
        <Flex h={16} alignItems={"center"} justifyContent={"space-between"}>
          <HStack spacing={4}>
            <IconButton
              size={"md"}
              icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
              aria-label={"Open Menu"}
              display={{ md: "none" }}
              onClick={isOpen ? onClose : onOpen}
            />
            <Text
              as={Link}
              to={
                isAdmin
                  ? "/jobs"
                  : isBuyer
                  ? "/tokens"
                  : isVerifier
                  ? "/verifier"
                  : "/jobs"
              }
              fontSize="xl"
              fontWeight="bold"
              color={useColorModeValue("blue.600", "blue.300")}
              _hover={{ textDecoration: "none" }}
            >
              TrustChain CO2
            </Text>
            {isAdmin && (
              <Badge colorScheme="purple" fontSize="sm">
                SLB Admin
              </Badge>
            )}
            {isBuyer && (
              <Badge colorScheme="green" fontSize="sm">
                Buyer
              </Badge>
            )}
            {isVerifier && (
              <Badge colorScheme="orange" fontSize="sm">
                Verifier
              </Badge>
            )}
            {!isAdmin && !isBuyer && !isVerifier && (
              <Badge colorScheme="blue" fontSize="sm">
                Operator
              </Badge>
            )}
          </HStack>

          <HStack spacing={8} alignItems={"center"}>
            <HStack
              as={"nav"}
              spacing={4}
              display={{ base: "none", md: "flex" }}
            >
              {links.map((link) => (
                <NavLink key={link.name} path={link.path} icon={link.icon}>
                  {link.name}
                </NavLink>
              ))}
            </HStack>
          </HStack>

          <Flex alignItems={"center"}>
            <Menu>
              <MenuButton
                as={Button}
                rounded={"full"}
                variant={"link"}
                cursor={"pointer"}
                minW={0}
              >
                <Avatar
                  size={"sm"}
                  name={userInfo?.email || user?.email || "User"}
                />
              </MenuButton>
              <MenuList>
                {userInfo && (
                  <>
                    <Box px={3} py={2}>
                      <Text fontSize="sm" fontWeight="bold">
                        {userInfo.organizationName || userInfo.email}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {userInfo.role}
                      </Text>
                    </Box>
                    <MenuDivider />
                  </>
                )}
                <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>

        {isOpen ? (
          <Box pb={4} display={{ md: "none" }}>
            <Stack as={"nav"} spacing={4}>
              {links.map((link) => (
                <NavLink key={link.name} path={link.path} icon={link.icon}>
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
