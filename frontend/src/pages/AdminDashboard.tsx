import {
    Box,
    Container,
    Heading,
    SimpleGrid,
    Text,
    useColorModeValue,
    Badge,
    VStack,
  } from '@chakra-ui/react';
  import { Link } from 'react-router-dom';
  
  export default function AdminDashboard() {
    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
  
    const dashboardItems = [
      { 
        title: 'Jobs Page', 
        link: '/jobs', 
        description: 'View and manage all jobs across the platform' 
      },
      { 
        title: 'Listings Page', 
        link: '/marketplace', 
        description: 'View and manage marketplace listings' 
      },
    ];
  
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} mb={8}>
          <Heading textAlign="center">
            Admin Dashboard
          </Heading>
        </VStack>
        
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
                borderColor: 'purple.400',
              }}
            >
              <Text fontSize="xl" fontWeight="bold">
                {item.title}
              </Text>
              <Text mt={2} color="gray.500" fontSize="sm">
                {item.description}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Container>
    );
  }