import { Navigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { Context } from "../context/authContext";
import { Box, Spinner, Text } from "@chakra-ui/react";

type UserRow = {
  userID: number;
  firebaseUID: string;
  email?: string | null;
  role: string;
  organizationName?: string | null;
};

interface RoleProtectedProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function RoleProtected({ children, allowedRoles }: RoleProtectedProps) {
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading...</Text>
      </Box>
    );
  }

  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // Normalize role names for comparison
  const normalizedUserRole = userRole.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

  // Check if user role is allowed
  const isAllowed = normalizedAllowedRoles.some(
    (allowedRole) =>
      normalizedUserRole === allowedRole ||
      (allowedRole === "slb admin" && normalizedUserRole === "slb_admin")
  );

  if (!isAllowed) {
    // Redirect buyers to their portfolio, others to login
    if (normalizedUserRole === "buyer") {
      return <Navigate to="/buyerportfolio" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

