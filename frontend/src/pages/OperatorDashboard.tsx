import {
    Box,
    Container,
    Heading,
    SimpleGrid,
    Text,
    useColorModeValue,
  } from '@chakra-ui/react';
  import { Link } from 'react-router-dom';
  
  export default function OperatorDashboard() {
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
        <Heading mb={8} textAlign="center">
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