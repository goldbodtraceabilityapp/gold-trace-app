import React from "react";
import { useNavigate } from "react-router-dom";

function BlockchainAnchorPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100vw",
        background: "linear-gradient(135deg, #f9d976 0%, #b99651 100%)",
        padding: 0,
        margin: 0,
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundImage: 'url("/Goldbodlogoforhome-1.jpg")', // <-- add this line
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
      }}
    >
      {/* ===== HEADER ===== */}
      <div
        className="d-flex justify-content-between align-items-center mb-5 flex-column flex-md-row"
        style={{ gap: "1rem", padding: "2rem 2rem 0 2rem", width: "100%" }}
      >
        <h1
          style={{
            color: "#fff",
            textShadow: "2px 2px 4px rgba(0,0,0,0.13)",
            margin: 0,
            fontSize: "2.2rem",
            fontWeight: 700,
            width: "100%",
            textAlign: "center",
          }}
        >
          Blockchain Anchoring
        </h1>
        <button
          className="btn btn-secondary"
          style={{
            color: "#fff",
            fontWeight: 500,
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            minWidth: "200px",
            height: "40px",
            alignSelf: "center",
            marginTop: "1.5rem",
          }}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>

      {/* ===== CONTENT CARD ===== */}
      <div
        className="shadow-lg rounded-4 p-5 text-center mx-auto"
        style={{
          background: "rgba(255,255,255,0.97)",
          maxWidth: 480,
          width: "95vw",
          marginTop: "2rem",
          marginBottom: "2rem",
        }}
      >
        <p style={{ fontSize: "1.2rem", color: "#555" }}>
          Soon, every gold batch and its trace flow will be{" "}
          <b>anchored on the Polygon blockchain</b> for tamper-proof verification
          by LBMA and others.
        </p>
        <div className="my-4">
          <span
            className="badge bg-warning text-dark"
            style={{ fontSize: "1.1rem", padding: "0.7em 1.5em" }}
          >
            Coming Soon
          </span>
        </div>
        <p className="text-muted mt-3" style={{ fontSize: "0.98rem" }}>
          This feature will allow anyone to verify that batch data has not been
          altered, using public blockchain technology.
        </p>
      </div>
    </div>
  );
}

export default BlockchainAnchorPage;