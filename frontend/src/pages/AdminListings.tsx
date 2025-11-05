import {
    Box,
    Container,
    Heading,
    Text,
    Badge,
    VStack,
    useColorModeValue,
  } from '@chakra-ui/react';
  
  export default function AdminListings() {
    const bgColor = useColorModeValue('white', 'gray.700');
  
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading mb={2}>Listings</Heading>
            <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
              Admin View
            </Badge>
          </Box>

        </VStack>
      </Container>
    );
  }