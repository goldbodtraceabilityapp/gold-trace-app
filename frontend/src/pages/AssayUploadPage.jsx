// src/pages/AssayUploadPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

function AssayUploadPage() {
  const { id } = useParams();     // batch ID from URL
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purity, setPurity] = useState("");
  const [assayFile, setAssayFile] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  // Fetch the batch so we can display basic info (e.g. ID, mine, etc.)
  useEffect(() => {
    async function fetchBatch() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const { data, error } = await API.get(
          `/batches/${encodeURIComponent(id)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (error || !data) {
          setError(error?.message || "Batch not found.");
        } else {
          setBatch(data);
        }
      } catch (err) {
        console.error(err);
        setError("Server error fetching batch.");
      }
      setLoading(false);
    }
    fetchBatch();
  }, [id]);

  const handleFileChange = (e) => {
    setAssayFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitMessage("");

    if (!purity.trim() || !assayFile) {
      setSubmitError("Please provide both purity % and the assay PDF.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("purity_percent", purity);
      formData.append("assay_report", assayFile);

      const response = await API.patch(
        `/batches/${encodeURIComponent(id)}/assay`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSubmitMessage("Assay report uploaded successfully!");
      // Optionally, navigate back to Trace Details or History:
      // navigate(`/batch/${id}`);
    } catch (err) {
      console.error(err);
      setSubmitError(
        err.response?.data?.error || "Error uploading assay report."
      );
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-warning" role="status" />
        <span className="ms-2" style={{ color: "#b99651" }}>Loading batch details…</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger m-4 text-center">{error}</div>;
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f9d976 0%, #b99651 100%)",
        minHeight: "100vh",
        width: "100vw",
        padding: "2rem 0",
        margin: 0,
        overflowX: "hidden",
      }}
    >
      <div className="container-fluid px-4">
        {/* HEADER */}
        <div
          className="d-flex justify-content-between align-items-center mb-5 flex-column flex-md-row"
          style={{ gap: "1rem", padding: "0 1rem" }}
        >
          <h1
            style={{
              color: "#fff",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              margin: 0,
              fontSize: "2.5rem",
              fontWeight: 600,
              width: "100%",
              textAlign: "center",
            }}
          >
            Upload Assay for {batch.batch_id}
          </h1>
          <button
            className="btn btn-secondary"
            style={{
              color: "#fff",
              fontWeight: 500,
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              minWidth: "200px",
              height: "40px",
              whiteSpace: "nowrap",
            }}
            onClick={() => navigate(`/batch/${id}`)}
          >
            Back to Trace Details
          </button>
        </div>

        {/* FORM CARD */}
        <div className="card shadow-lg mx-auto" style={{ maxWidth: "600px", borderRadius: "0.75rem" }}>
          <div className="card-body" style={{ background: "rgba(255,255,255,0.97)" }}>
            <form onSubmit={handleSubmit}>
              {/* Purity % */}
              <div className="mb-4">
                <label htmlFor="purity" className="form-label fw-semibold">
                  Purity (%) 
                </label>
                <input
                  type="number"
                  id="purity"
                  name="purity"
                  className="form-control"
                  placeholder="e.g., 98.7"
                  value={purity}
                  onChange={(e) => setPurity(e.target.value)}
                  step="0.01"
                  min="0"
                  max="100"
                  required
                />
              </div>

              {/* Assay Report PDF */}
              <div className="mb-4">
                <label htmlFor="assay_report" className="form-label fw-semibold">
                  Assay Report PDF
                </label>
                <input
                  type="file"
                  id="assay_report"
                  name="assay_report"
                  className="form-control"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  required
                />
              </div>

              {submitError && (
                <div className="alert alert-danger text-center">{submitError}</div>
              )}
              {submitMessage && (
                <div className="alert alert-success text-center">{submitMessage}</div>
              )}

              <div className="d-flex justify-content-end">
                <button type="submit" className="btn btn-warning px-4" style={{ fontWeight: 600 }}>
                  Upload Assay
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssayUploadPage;
