import {
    Box,
    Container,
    Heading,
    SimpleGrid,
    Text,
    useColorModeValue,
  } from '@chakra-ui/react';
  import { Link, Navigate } from 'react-router-dom';
  import { useContext, useEffect, useState } from 'react';
  import { Context } from '../context/authContext';
  
  type UserRow = {
    userID: number;
    firebaseUID: string;
    email?: string | null;
    role: string;
    organizationName?: string | null;
  };

  export default function OperatorDashboard() {
    const { user } = useContext<any>(Context);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const API =
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      "http://localhost:5050";

    useEffect(() => {
      const fetchUserRole = async () => {
        if (!user) {
          setLoading(false);
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
            setUserRole(me.role?.toLowerCase() || null);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchUserRole();
    }, [user, API]);

    // Redirect buyers to their portfolio
    if (!loading && userRole === "buyer") {
      return <Navigate to="/buyerportfolio" replace />;
    }

    if (loading) {
      return (
        <Container maxW="container.xl" py={8}>
          <Text>Loading...</Text>
        </Container>
      );
    }
    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
  
    const dashboardItems = [
      { title: 'Active Jobs Page', link: '/jobs', description: 'View all of your currently active jobs' },
      { title: 'Tool Management Page', link: '/toolmanagement', description: 'View and add tools' },
      { title: 'Revenue / Transactions', link: '/revenuetransactions', description: 'view revenue and transaction history'},
      { title: 'Credit Portfolio', link: '/creditportfolio', description: 'view minted credits'},
    ];
  
    return (
      <Container maxW="container.xl" py={8}>
        <Heading mb={8} textAlign="center" as={Link} to="/jobs" _hover={{ textDecoration: 'underline' }}>
          Operator Dashboard
        </Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {dashboardItems.map((item) => (
            <Box
              key={item.title}
              as={Link}
              to={item.link}
              p={8}
              bg={bgColor}
              borderWidth="2px"
              borderColor={borderColor}
              borderRadius="lg"
              textAlign="center"
              cursor="pointer"
              transition="all 0.3s"
              _hover={{
                transform: 'translateY(-4px)',
                boxShadow: 'xl',
                borderColor: 'blue.400',
              }}
            >
              <Text fontSize="xl" fontWeight="bold">
                {item.title}
              </Text>
              <Text mt={2} color="gray.500" fontSize="sm">
                {item.description.toLowerCase()}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    );
  }