// src/components/PrivateRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PrivateRoute({ children }) {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <h1>🔄 טוען הרשאה...</h1>;
  return firebaseUser
    ? children
    : <Navigate to="/login" replace />;
}

export default PrivateRoute;
