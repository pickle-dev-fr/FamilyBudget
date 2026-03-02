import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, authenticated } = useAuth();

  if (loading) return null;

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
