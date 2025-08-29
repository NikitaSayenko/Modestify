import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { firebaseUser, profile, loading } = useAuth();

  // 1) still loading auth/profile?
  if (loading) return <h1>🔄 טוען הרשאה…</h1>;

  // 2) not even signed in?
  if (!firebaseUser) return <Navigate to="/login" replace />;

  // 3) signed in but not an admin?
  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  // 4) signed in & role==="admin" → show the page
  return children;
}
