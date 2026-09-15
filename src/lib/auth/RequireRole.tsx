import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { UserRole } from "../database.types";

interface RequireRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RequireRole({ roles, children, redirectTo = "/app/login" }: RequireRoleProps) {
  const { session, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
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
