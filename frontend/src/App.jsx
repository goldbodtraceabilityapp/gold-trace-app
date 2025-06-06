// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RegisterBatchPage from "./pages/RegisterBatchPage";
import TraceHistoryPage from "./pages/TraceHistoryPage";
import TraceDetailsPage from "./pages/TraceDetailsPage";
import MinesPage from "./pages/MinesPage";

import ProtectedRoute from "./components/ProtectedRoute";
import { useCurrentUser } from "./hooks/useCurrentUser";

function App() {
  const { user, loading } = useCurrentUser();

  // While we’re fetching “/user/me”, don’t render anything yet
  if (loading) return <div>Loading…</div>;

  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<LoginPage />} />

      {/* Dashboard (protected) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Register Batch: only ASM users can see/use */}
      <Route
        path="/register-batch"
        element={
          <ProtectedRoute>
            {user?.role === "asm" ? (
              <RegisterBatchPage />
            ) : (
              // If not ASM, redirect to dashboard
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        }
      />

      {/* Trace History (protected) */}
      <Route
        path="/trace-history"
        element={
          <ProtectedRoute>
            <TraceHistoryPage />
          </ProtectedRoute>
        }
      />

      {/* Trace Details (protected) */}
      <Route
        path="/batch/:id"
        element={
          <ProtectedRoute>
            <TraceDetailsPage />
          </ProtectedRoute>
        }
      />

      {/* Mines List (protected) */}
      <Route
        path="/mines"
        element={
          <ProtectedRoute>
            <MinesPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
