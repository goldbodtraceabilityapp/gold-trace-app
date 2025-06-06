import React from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function Dashboard() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <div>Loading user info…</div>;
  }

  if (!user) {
    return <div>Please log in to see your dashboard.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user.username}!</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Always-visible cards */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-xl font-semibold">View Batches</h2>
          <p className="text-sm text-gray-600">See all your gold batches.</p>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
            View
          </button>
        </div>

        {/* Conditionally show "Register Gold Batch" ONLY if role === "asm" */}
        {user.role === "asm" && (
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-xl font-semibold">Register Gold Batch</h2>
            <p className="text-sm text-gray-600">
              Create a new gold batch entry.
            </p>
            <button
              onClick={() => {
                // e.g. navigate to /register-batch
                window.location.href = "/register-batch";
              }}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg"
            >
              Register
            </button>
          </div>
        )}

        {/* Other cards... */}
      </div>
    </div>
  );
}