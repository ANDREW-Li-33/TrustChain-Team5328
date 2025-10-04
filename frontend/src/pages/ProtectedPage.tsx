import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { Context } from "../context/authContext";

export function Protected({ children }: any) {
  const { user } = useContext<any>(Context);

  if (!user) {
    return <Navigate to="/login" replace />;
  } else {
    return children;
  }
}
