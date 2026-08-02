// ==========================
// PrivateRoute: protect routes that require sign-in
// ==========================
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Renders children only when a Firebase user session exists.
 * While auth state is resolving, a loading placeholder is shown.
 * Unauthenticated users are redirected to /login (with `replace` to avoid back navigation).
 */
function PrivateRoute({ children }) {
  const { firebaseUser, loading } = useAuth();

  // While auth is resolving, block the route and show a lightweight placeholder
  if (loading) return <h1> טוען הרשאה...</h1>; // UI copy intentionally Hebrew (project style)

  // Gate by sign-in status
  return firebaseUser
    ? children
    : <Navigate to="/login" replace />;
}

export default PrivateRoute;
