import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { firebaseUser, profile, loading } = useAuth();

  // While authentication/profile is loading, block rendering
  if (loading) return <h1>Loading authorization…</h1>;

  // If user is not signed in, redirect to login
  if (!firebaseUser) return <Navigate to="/login" replace />;

  // If signed in but role is not admin, redirect to home
  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  // Only admins can access the child component/page
  return children;
}
