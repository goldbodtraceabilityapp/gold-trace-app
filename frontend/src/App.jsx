// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RegisterBatchPage from "./pages/RegisterBatchPage";
import TraceHistoryPage from "./pages/TraceHistoryPage";
import TraceDetailsPage from "./pages/TraceDetailsPage";
import AssayUploadPage from "./pages/AssayUploadPage";
import MinesPage from "./pages/MinesPage"; 

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
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

      {/* Register Batch (protected) */}
      <Route
        path="/register-batch"
        element={
          <ProtectedRoute>
            <RegisterBatchPage />
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

      {/* Assay Upload (protected) */}
      <Route
        path="/batch/:id/assay"
        element={
          <ProtectedRoute>
            <AssayUploadPage />
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
