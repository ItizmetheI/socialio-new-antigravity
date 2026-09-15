import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { UserRole } from "../database.types";
import { FullScreenSpinner } from "../../components/Spinner";

interface RequireRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RequireRole({ roles, children, redirectTo = "/app/login" }: RequireRoleProps) {
  const { session, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  if (!session || !profile) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!roles.includes(profile.role)) {
    // Logged in, wrong section for their role — send them to their own home
    // instead of a dead end.
    const home = profile.role === "client" ? "/app" : "/ops";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
