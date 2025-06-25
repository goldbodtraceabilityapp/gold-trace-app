// src/pages/TraceDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";

function TraceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ASM Registration
  const [showAsmForm, setShowAsmForm] = useState(false);
  const [asmData, setAsmData] = useState({
    asm_registration_id: "",
    asm_mine_name: "",
    asm_mine_location: "",
    asm_date_collected: "",
    asm_weight_kg: "",
    asm_origin_cert_image: null,
  });
  const [asmError, setAsmError] = useState("");
  const [asmSuccess, setAsmSuccess] = useState("");

  // Dealer Received
  const [showDealerForm, setShowDealerForm] = useState(false);
  const [dealerData, setDealerData] = useState({
    dealer_location: "",
    dealer_received_weight: "",
    dealer_receipt_id: "",
  });
  const [dealerLicense, setDealerLicense] = useState(null); // <-- NEW
  const [dealerError, setDealerError] = useState("");
  const [dealerSuccess, setDealerSuccess] = useState("");

  // Transport
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [transportData, setTransportData] = useState({
    transport_courier: "",
    transport_tracking_number: "",
    transport_origin_location: "",
    transport_destination_location: "",
  });
  const [transportError, setTransportError] = useState("");
  const [transportSuccess, setTransportSuccess] = useState("");

  // Goldbod Intake
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [intakeData, setIntakeData] = useState({
    goldbod_intake_officer: "",
    goldbod_intake_weight: "",
    goldbod_intake_receipt_id: "",
  });
  const [intakeError, setIntakeError] = useState("");
  const [intakeSuccess, setIntakeSuccess] = useState("");

  // Assay
  const [showAssayForm, setShowAssayForm] = useState(false);
  const [purity, setPurity] = useState("");
  const [assayFile, setAssayFile] = useState(null);
  const [assayError, setAssayError] = useState("");
  const [assaySuccess, setAssaySuccess] = useState("");

  // Invite Dealer
  const [showInviteDealer, setShowInviteDealer] = useState(false);
  const [inviteDealerUsername, setInviteDealerUsername] = useState("");
  const [inviteDealerMessage, setInviteDealerMessage] = useState("");
  const [user, setUser] = useState(null); // Add this if you don't already have user info
  const [dealerInvite, setDealerInvite] = useState(null); // <-- NEW

  // Invite Goldbod
  const [showInviteGoldbod, setShowInviteGoldbod] = useState(false);
  const [inviteGoldbodUsername, setInviteGoldbodUsername] = useState("");
  const [inviteGoldbodMessage, setInviteGoldbodMessage] = useState("");

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        // Fetch user info
        const userResp = await API.get("/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userResp.data);

        const batchResp = await API.get(`/batches/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const batchData = batchResp.data;
        setBatch(batchData);

        const minesResp = await API.get("/mines", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const minesData = minesResp.data;
        const foundMine = minesData.find((m) => m.id === batchData.mine_id);
        setMine(foundMine || { name: "Unknown Mine", location: "" });
      } catch (err) {
        console.error(err);
        setError("Error loading batch details.");
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh", width: "100vw" }}
      >
        <div className="spinner-border text-warning" role="status" />
        <span className="ms-2" style={{ color: "#b99651" }}>
          Loading trace details…
        </span>
      </div>
    );
  }
  if (error) {
    return <div className="alert alert-danger m-4 text-center">{error}</div>;
  }

  // Helper: format a UTC string or show “Pending”
  const formatDateTime = (isoString) => {
    if (!isoString) return "Pending";
    return new Date(isoString).toLocaleString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Helper: format YMD string to readable date
  function formatDateYMD(ymd) {
    if (!ymd) return "—";
    const [year, month, day] = ymd.split("-");
    const dateObj = new Date(`${year}-${month}-${day}T12:00:00Z`);
    return dateObj.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // Destructure all the fields we need from batch
  const {
    batch_id,
    date_collected,
    weight_kg,
    origin_cert_image_url,
    dealer_license_image_url,
    purity_percent,
    assay_report_pdf_url,
    created_at,
    dealer_received_at,
    dealer_received_weight,
    dealer_receipt_id,
    dealer_location,
    transport_shipped_at,
    transport_courier,
    transport_tracking_number,
    transport_origin_location,
    transport_destination_location,
    goldbod_intake_at,
    goldbod_intake_officer,
    goldbod_intake_weight,
    goldbod_intake_receipt_id,
    assay_completed_at,
  } = batch;

  // ASM Registration Handlers
  const handleAsmChange = (e) => {
    const { name, value } = e.target;
    setAsmData((prev) => ({ ...prev, [name]: value }));
  };
  const handleAsmFileChange = (e) => {
    setAsmData((prev) => ({
      ...prev,
      asm_origin_cert_image: e.target.files[0],
    }));
  };
  const submitAsm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAsmError("");
    setAsmSuccess("");
    try {
      const token = localStorage.getItem("token");
      const {
        asm_registration_id,
        asm_mine_name,
        asm_mine_location,
        asm_date_collected,
        asm_weight_kg,
      } = asmData;
      if (
        !asm_registration_id.trim() ||
        !asm_mine_name.trim() ||
        !asm_mine_location.trim() ||
        !asm_date_collected ||
        !asm_weight_kg
      ) {
        setAsmError("All ASM fields are required.");
        setSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.append("asm_registration_id", asm_registration_id.trim());
      formData.append("asm_mine_name", asm_mine_name.trim());
      formData.append("asm_mine_location", asm_mine_location.trim());
      formData.append("asm_date_collected", asm_date_collected);
      formData.append("asm_weight_kg", parseFloat(asm_weight_kg));
      if (asmData.asm_origin_cert_image)
        formData.append("asm_origin_cert_image", asmData.asm_origin_cert_image);

      await API.patch(
        `/batches/${encodeURIComponent(id)}/asm-register`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const batchResp = await API.get(`/batches/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBatch(batchResp.data);
      setAsmSuccess("ASM registration saved.");
      setShowAsmForm(false);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Error saving ASM registration.";
      setAsmError(msg);
    }
    setSubmitting(false);
  };

  // Dealer Received Handlers
  const handleDealerChange = (e) => {
    const { name, value } = e.target;
    setDealerData((prev) => ({ ...prev, [name]: value }));
  };
  const handleDealerLicenseChange = (e) => {
    setDealerLicense(e.target.files[0]);
  };
  const submitDealer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDealerError("");
    setDealerSuccess("");
    try {
      const token = localStorage.getItem("token");
      const { dealer_location, dealer_received_weight, dealer_receipt_id } =
        dealerData;
      if (
        !dealer_location.trim() ||
        !dealer_received_weight ||
        !dealer_receipt_id.trim()
      ) {
        setDealerError("All dealer fields are required.");
        setSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.append("dealer_location", dealer_location.trim());
      formData.append(
        "dealer_received_weight",
        parseFloat(dealer_received_weight)
      );
      formData.append("dealer_receipt_id", dealer_receipt_id.trim());
      if (dealerLicense) formData.append("dealer_license", dealerLicense);

      await API.patch(
        `/batches/${encodeURIComponent(id)}/dealer-receive`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const batchResp = await API.get(`/batches/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBatch(batchResp.data);
      setDealerSuccess("Dealer info saved.");
      setShowDealerForm(false);
      setDealerLicense(null);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Error saving dealer info.";
      setDealerError(msg);
    }
    setSubmitting(false);
  };

  // Transport Handlers
  const handleTransportChange = (e) => {
    const { name, value } = e.target;
    setTransportData((prev) => ({ ...prev, [name]: value }));
  };
  const submitTransport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTransportError("");
    setTransportSuccess("");
    try {
      const token = localStorage.getItem("token");
      const {
        transport_courier,
        transport_tracking_number,
        transport_origin_location,
        transport_destination_location,
      } = transportData;
      if (
        !transport_courier.trim() ||
        !transport_tracking_number.trim() ||
        !transport_origin_location.trim() ||
        !transport_destination_location.trim()
      ) {
        setTransportError("All transport fields are required.");
        setSubmitting(false);
        return;
      }
      await API.patch(
        `/batches/${encodeURIComponent(id)}/transport`,
        {
          transport_courier: transport_courier.trim(),
          transport_tracking_number: transport_tracking_number.trim(),
          transport_origin_location: transport_origin_location.trim(),
          transport_destination_location: transport_destination_location.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const batchResp = await API.get(`/batches/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBatch(batchResp.data);
      setTransportSuccess("Transport info saved.");
      setShowTransportForm(false);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Error saving transport info.";
      setTransportError(msg);
    }
    setSubmitting(false);
  };

  // Intake Handlers
  const handleIntakeChange = (e) => {
    const { name, value } = e.target;
    setIntakeData((prev) => ({ ...prev, [name]: value }));
  };
  const submitIntake = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setIntakeError("");
    setIntakeSuccess("");
    try {
      const token = localStorage.getItem("token");
      const {
        goldbod_intake_officer,
        goldbod_intake_weight,
        goldbod_intake_receipt_id,
      } = intakeData;
      if (
        !goldbod_intake_officer.trim() ||
        !goldbod_intake_weight ||
        !goldbod_intake_receipt_id.trim()
      ) {
        setIntakeError("All intake fields are required.");
        setSubmitting(false);
        return;
      }
      await API.patch(
        `/batches/${encodeURIComponent(id)}/goldbod-intake`,
        {
          goldbod_intake_officer: goldbod_intake_officer.trim(),
          goldbod_intake_weight: parseFloat(goldbod_intake_weight),
          goldbod_intake_receipt_id: goldbod_intake_receipt_id.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const batchResp = await API.get(`/batches/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBatch(batchResp.data);
      setIntakeSuccess("Goldbod intake info saved.");
      setShowIntakeForm(false);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Error saving intake info.";
      setIntakeError(msg);
    }
    setSubmitting(false);
  };

  // Assay Handlers
  const handleAssayFileChange = (e) => {
    setAssayFile(e.target.files[0]);
  };
  const submitAssay = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAssayError("");
    setAssaySuccess("");
    if (!purity.trim() || !assayFile) {
      setAssayError("Please provide both purity % and the assay PDF.");
      setSubmitting(false);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("purity_percent", purity);
      formData.append("assay_report", assayFile);

      await API.patch(`/batches/${encodeURIComponent(id)}/assay`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setAssaySuccess("Assay report uploaded successfully!");
      setShowAssayForm(false);
      // Optionally, refresh batch data:
      const batchResp = await API.get(`/batches/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBatch(batchResp.data);
    } catch (err) {
      setAssayError(
        err.response?.data?.error || "Error uploading assay report."
      );
    }
    setSubmitting(false);
  };

  // Invite Dealer Handler
  const handleInviteDealer = async (e) => {
    e.preventDefault();
    setInviteDealerMessage("");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await API.post(
        `/batches/${encodeURIComponent(id)}/invite-dealer`,
        { dealer_username: inviteDealerUsername.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteDealerMessage("Invitation sent!");
      setShowInviteDealer(false);
    } catch (err) {
      setInviteDealerMessage(
        err.response?.data?.error || "Failed to send invite."
      );
    }
    setSubmitting(false);
  };

  // Invite Goldbod Handler
  const handleInviteGoldbod = async (e) => {
    e.preventDefault();
    setInviteGoldbodMessage("");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await API.post(
        `/batches/${encodeURIComponent(id)}/invite-goldbod`,
        { goldbod_username: inviteGoldbodUsername.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteGoldbodMessage("Invitation sent!");
      setShowInviteGoldbod(false);
    } catch (err) {
      setInviteGoldbodMessage(
        err.response?.data?.error || "Failed to send invite."
      );
    }
    setSubmitting(false);
  };

  // Small helper to render a green circular checkmark
  const CheckCircle = () => (
    <span
      className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle"
      style={{ width: "1.5rem", height: "1.5rem", fontSize: "1rem" }}
    >
      &#10003;
    </span>
  );

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
        {/* ===== HEADER ===== */}
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
            Trace Details for {batch_id}
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
            onClick={() => navigate("/trace-history")}
          >
            Back to History
          </button>
        </div>

        {/* ===== TIMELINE CARD ===== */}
        <div
          className="card shadow-lg mx-auto"
          style={{ maxWidth: "720px", borderRadius: "0.75rem" }}
        >
          <div
            className="card-body"
            style={{ background: "rgba(255,255,255,0.97)" }}
          >
            <h5
              className="card-title"
              style={{ color: "#b99651", fontWeight: 600 }}
            >
              Trace Flow
            </h5>
            <ul className="list-group list-group-flush">
              {/* 1) Registered by ASM */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div className="d-flex align-items-center">
                    <strong className="me-2">1. Registered by ASM</strong>
                    {created_at && <CheckCircle />}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: created_at ? "green" : "#777",
                    }}
                  >
                    <i>Timestamp:</i>
                    <br />
                    <b>{created_at ? formatDateTime(created_at) : "Pending"}</b>
                  </div>
                </div>
                <div
                  className="mt-2"
                  style={{ color: "#555", fontSize: "0.9rem" }}
                >
                  <p className="mb-1">
                    Mine: {mine?.name || "—"}
                    {mine?.location ? ` (${mine.location})` : ""}
                  </p>
                  <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                    Collected on: <b>{formatDateYMD(date_collected)}</b>
                  </p>
                  <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                    Weight: <b>{weight_kg} kg</b>
                  </p>
                  <p
                    className="mb-0"
                    style={{ fontSize: "0.85rem", color: "#777" }}
                  >
                    Origin Cert:&nbsp;
                    {origin_cert_image_url ? (
                      <a
                        href={origin_cert_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-info"
                      >
                        View
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </div>
                {/* ASM Registration form */}
                {!created_at && (
                  <div className="mt-3">
                    {!showAsmForm ? (
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => setShowAsmForm(true)}
                        disabled={submitting}
                      >
                        Update
                      </button>
                    ) : (
                      <form onSubmit={submitAsm}>
                        {asmError && (
                          <div className="alert alert-danger px-2">
                            {asmError}
                          </div>
                        )}
                        {asmSuccess && (
                          <div className="alert alert-success px-2">
                            {asmSuccess}
                          </div>
                        )}
                        <div className="mb-3">
                          <label
                            htmlFor="asm_registration_id"
                            className="form-label"
                          >
                            ASM Receipt #
                          </label>
                          <input
                            type="text"
                            id="asm_registration_id"
                            name="asm_registration_id"
                            className="form-control"
                            value={asmData.asm_registration_id}
                            onChange={handleAsmChange}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="asm_mine_name" className="form-label">
                            Mine Name
                          </label>
                          <input
                            type="text"
                            id="asm_mine_name"
                            name="asm_mine_name"
                            className="form-control"
                            value={asmData.asm_mine_name}
                            onChange={handleAsmChange}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label
                            htmlFor="asm_mine_location"
                            className="form-label"
                          >
                            Mine Location
                          </label>
                          <input
                            type="text"
                            id="asm_mine_location"
                            name="asm_mine_location"
                            className="form-control"
                            value={asmData.asm_mine_location}
                            onChange={handleAsmChange}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label
                            htmlFor="asm_date_collected"
                            className="form-label"
                          >
                            Date Collected
                          </label>
                          <input
                            type="date"
                            id="asm_date_collected"
                            name="asm_date_collected"
                            className="form-control"
                            value={asmData.asm_date_collected}
                            onChange={handleAsmChange}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="asm_weight_kg" className="form-label">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            id="asm_weight_kg"
                            name="asm_weight_kg"
                            className="form-control"
                            value={asmData.asm_weight_kg}
                            onChange={handleAsmChange}
                            step="0.01"
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label
                            htmlFor="asm_origin_cert_image"
                            className="form-label"
                          >
                            Origin Cert (image or PDF)
                          </label>
                          <input
                            type="file"
                            id="asm_origin_cert_image"
                            name="asm_origin_cert_image"
                            className="form-control"
                            accept="image/*,application/pdf"
                            onChange={handleAsmFileChange}
                          />
                        </div>
                        <div className="d-flex gap-2 mt-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowAsmForm(false)}
                            disabled={submitting}
                          >
                            Close
                          </button>
                          <button type="submit" className="btn btn-success" disabled={submitting}>
                            Save ASM Registration
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </li>

              {/* 2) Dealer Received Batch */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div className="d-flex align-items-center">
                    <strong className="me-2">2. Dealer Received</strong>
                    {dealer_received_at && <CheckCircle />}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: dealer_received_at ? "green" : "#777",
                    }}
                  >
                    <i>Timestamp:</i>
                    <br />
                    <b>
                      {dealer_received_at
                        ? formatDateTime(dealer_received_at)
                        : "Pending"}
                    </b>
                  </div>
                </div>

                <div
                  className="mt-2"
                  style={{ color: "#555", fontSize: "0.9rem" }}
                >
                  <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                    Location: <b>{dealer_location || "—"}</b>
                  </p>
                  <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                    Received Weight:{" "}
                    <b>
                      {dealer_received_weight
                        ? `${dealer_received_weight} kg`
                        : "—"}
                    </b>
                    <span style={{ fontSize: "0.8rem", color: "#777" }}>
                      {dealer_received_weight
                        ? ` (Receipt: ${dealer_receipt_id})`
                        : ""}
                    </span>
                  </p>
                  <p
                    className="mb-0"
                    style={{ fontSize: "0.85rem", color: "#777" }}
                  >
                    Dealer License:&nbsp;
                    {dealer_license_image_url ? (
                      <a
                        href={dealer_license_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-info"
                      >
                        View
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </div>
                {/* Update button, form, and invite logic */}
                {!dealer_received_at && user && (
                  <>
                    {user.role === "dealer" ? (
                      <div className="mt-3">
                        {!showDealerForm ? (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => setShowDealerForm(true)}
                            disabled={submitting}
                          >
                            Update
                          </button>
                        ) : (
                          <form
                            onSubmit={submitDealer}
                            className="row g-2 mt-2"
                          >
                            {dealerError && (
                              <div className="alert alert-danger px-2">
                                {dealerError}
                              </div>
                            )}
                            {dealerSuccess && (
                              <div className="alert alert-success px-2">
                                {dealerSuccess}
                              </div>
                            )}
                            <div className="col-md-4">
                              <label
                                htmlFor="dealer_location"
                                className="form-label"
                              >
                                Location
                              </label>
                              <input
                                type="text"
                                id="dealer_location"
                                name="dealer_location"
                                className="form-control"
                                value={dealerData.dealer_location}
                                onChange={handleDealerChange}
                                placeholder="e.g., Accra"
                                required
                              />
                            </div>
                            <div className="col-md-4">
                              <label
                                htmlFor="dealer_received_weight"
                                className="form-label"
                              >
                                Received Weight (kg)
                              </label>
                              <input
                                type="number"
                                id="dealer_received_weight"
                                name="dealer_received_weight"
                                className="form-control"
                                value={dealerData.dealer_received_weight}
                                onChange={handleDealerChange}
                                placeholder="e.g., 14.80"
                                step="0.01"
                                required
                              />
                            </div>
                            <div className="col-md-4">
                              <label
                                htmlFor="dealer_receipt_id"
                                className="form-label"
                              >
                                Receipt #
                              </label>
                              <input
                                type="text"
                                id="dealer_receipt_id"
                                name="dealer_receipt_id"
                                className="form-control"
                                value={dealerData.dealer_receipt_id}
                                onChange={handleDealerChange}
                                placeholder="e.g., DEAL-2025-001"
                                required
                              />
                            </div>
                            <div className="col-md-6">
                              <label
                                htmlFor="dealer_license"
                                className="form-label"
                              >
                                Dealer License (image or PDF)
                              </label>
                              <input
                                type="file"
                                id="dealer_license"
                                name="dealer_license"
                                className="form-control"
                                accept="image/*,application/pdf"
                                onChange={handleDealerLicenseChange}
                              />
                            </div>
                            <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowDealerForm(false)}
                                disabled={submitting}
                              >
                                Close
                              </button>
                              <button type="submit" className="btn btn-success" disabled={submitting}>
                                Submit Dealer Info
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => setShowInviteDealer(true)}
                          disabled={submitting}
                        >
                          Invite Dealer
                        </button>
                        {showInviteDealer && (
                          <form onSubmit={handleInviteDealer} className="mt-2">
                            <input
                              type="text"
                              className="form-control mb-2"
                              placeholder="Enter dealer's username"
                              value={inviteDealerUsername}
                              onChange={(e) =>
                                setInviteDealerUsername(e.target.value)
                              }
                              required
                              disabled={submitting}
                            />
                            <button
                              type="submit"
                              className="btn btn-success btn-sm"
                              disabled={submitting}
                            >
                              Send Invite
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm ms-2"
                              onClick={() => setShowInviteDealer(false)}
                              disabled={submitting}
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                        {inviteDealerMessage && (
                          <div className="alert alert-info mt-2">
                            {inviteDealerMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>

              {/* 3) Transport to Goldbod */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div className="d-flex align-items-center">
                    <strong className="me-2">3. Transport to Goldbod</strong>
                    {transport_shipped_at && <CheckCircle />}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: transport_shipped_at ? "green" : "#777",
                    }}
                  >
                    <i>Shipped At:</i>
                    <br />
                    <b>
                      {transport_shipped_at
                        ? formatDateTime(transport_shipped_at)
                        : "Pending"}
                    </b>
                  </div>
                </div>
                <div
                  className="mt-2"
                  style={{ color: "#555", fontSize: "0.9rem" }}
                >
                  <p className="mb-1">
                    Courier: <b>{transport_courier || "—"}</b>
                  </p>
                  <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                    Tracking #: <b>{transport_tracking_number || "—"}</b>
                  </p>
                  <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                    From: <b>{transport_origin_location || "—"}</b>
                    &nbsp;→&nbsp; To:{" "}
                    <b>{transport_destination_location || "—"}</b>
                  </p>
                </div>
                {/* Update button and form */}
                {!transport_shipped_at && user && (
                  <div className="mt-3">
                    {/* ASM can update before dealer step */}
                    {!dealer_received_at &&
                      user.role === "asm" &&
                      (!showTransportForm ? (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => setShowTransportForm(true)}
                          disabled={submitting}
                        >
                          Update
                        </button>
                      ) : (
                        <form onSubmit={submitTransport} className="row g-2">
                          {transportError && (
                            <div className="alert alert-danger px-2">
                              {transportError}
                            </div>
                          )}
                          {transportSuccess && (
                            <div className="alert alert-success px-2">
                              {transportSuccess}
                            </div>
                          )}
                          <div className="col-md-6">
                            <label
                              htmlFor="transport_courier"
                              className="form-label"
                            >
                              Courier
                            </label>
                            <input
                              type="text"
                              id="transport_courier"
                              name="transport_courier"
                              className="form-control"
                              value={transportData.transport_courier}
                              onChange={handleTransportChange}
                              placeholder="e.g., DHL"
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label
                              htmlFor="transport_tracking_number"
                              className="form-label"
                            >
                              Tracking #
                            </label>
                            <input
                              type="text"
                              id="transport_tracking_number"
                              name="transport_tracking_number"
                              className="form-control"
                              value={transportData.transport_tracking_number}
                              onChange={handleTransportChange}
                              placeholder="e.g., GH123456789"
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label
                              htmlFor="transport_origin_location"
                              className="form-label"
                            >
                              From
                            </label>
                            <input
                              type="text"
                              id="transport_origin_location"
                              name="transport_origin_location"
                              className="form-control"
                              value={transportData.transport_origin_location}
                              onChange={handleTransportChange}
                              placeholder="e.g., Obuasi"
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label
                              htmlFor="transport_destination_location"
                              className="form-label"
                            >
                              To
                            </label>
                            <input
                              type="text"
                              id="transport_destination_location"
                              name="transport_destination_location"
                              className="form-control"
                              value={
                                transportData.transport_destination_location
                              }
                              onChange={handleTransportChange}
                              placeholder="e.g., Accra"
                              required
                            />
                          </div>
                          <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setShowTransportForm(false)}
                              disabled={submitting}
                            >
                              Close
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                              Submit Transport
                            </button>
                          </div>
                        </form>
                      ))}

                    {/* Dealer can update after dealer step */}
                    {dealer_received_at &&
                      user.role === "dealer" &&
                      (!showTransportForm ? (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => setShowTransportForm(true)}
                          disabled={submitting}
                        >
                          Update
                        </button>
                      ) : (
                        <form onSubmit={submitTransport} className="row g-2">
                          {transportError && (
                            <div className="alert alert-danger px-2">
                              {transportError}
                            </div>
                          )}
                          {transportSuccess && (
                            <div className="alert alert-success px-2">
                              {transportSuccess}
                            </div>
                          )}
                          <div className="col-md-6">
                            <label
                              htmlFor="transport_courier"
                              className="form-label"
                            >
                              Courier
                            </label>
                            <input
                              type="text"
                              id="transport_courier"
                              name="transport_courier"
                              className="form-control"
                              value={transportData.transport_courier}
                              onChange={handleTransportChange}
                              placeholder="e.g., DHL"
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label
                              htmlFor="transport_tracking_number"
                              className="form-label"
                            >
                              Tracking #
                            </label>
                            <input
                              type="text"
                              id="transport_tracking_number"
                              name="transport_tracking_number"
                              className="form-control"
                              value={transportData.transport_tracking_number}
                              onChange={handleTransportChange}
                              placeholder="e.g., GH123456789"
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label
                              htmlFor="transport_origin_location"
                              className="form-label"
                            >
                              From
                            </label>
                            <input
                              type="text"
                              id="transport_origin_location"
                              name="transport_origin_location"
                              className="form-control"
                              value={transportData.transport_origin_location}
                              onChange={handleTransportChange}
                              placeholder="e.g., Obuasi"
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label
                              htmlFor="transport_destination_location"
                              className="form-label"
                            >
                              To
                            </label>
                            <input
                              type="text"
                              id="transport_destination_location"
                              name="transport_destination_location"
                              className="form-control"
                              value={
                                transportData.transport_destination_location
                              }
                              onChange={handleTransportChange}
                              placeholder="e.g., Accra"
                              required
                            />
                          </div>
                          <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setShowTransportForm(false)}
                              disabled={submitting}
                            >
                              Close
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                              Submit Transport
                            </button>
                          </div>
                        </form>
                      ))}
                  </div>
                )}
              </li>

              {/* 4) Goldbod Intake & Weighing */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div className="d-flex align-items-center">
                    <strong className="me-2">
                      4. Goldbod Intake & Weighing
                    </strong>
                    {goldbod_intake_at && <CheckCircle />}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: goldbod_intake_at ? "green" : "#777",
                    }}
                  >
                    <i>Timestamp:</i>
                    <br />
                    <b>
                      {goldbod_intake_at
                        ? formatDateTime(goldbod_intake_at)
                        : "Pending"}
                    </b>
                  </div>
                </div>
                <div
                  className="mt-2"
                  style={{ color: "#555", fontSize: "0.9rem" }}
                >
                  <p className="mb-1">
                    Officer: <b>{goldbod_intake_officer || "—"}</b>
                  </p>
                  <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                    Intake Weight:{" "}
                    <b>
                      {goldbod_intake_weight
                        ? `${goldbod_intake_weight} kg`
                        : "—"}
                    </b>
                  </p>
                  <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                    Intake Receipt #: <b>{goldbod_intake_receipt_id || "—"}</b>
                  </p>
                </div>
                {/* Only Goldbod can update */}
                {!goldbod_intake_at && user && user.role === "goldbod" && (
                  <div className="mt-3">
                    {!showIntakeForm ? (
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => setShowIntakeForm(true)}
                        disabled={submitting}
                      >
                        Update
                      </button>
                    ) : (
                      <form onSubmit={submitIntake} className="row g-2">
                        {intakeError && (
                          <div className="alert alert-danger px-2">
                            {intakeError}
                          </div>
                        )}
                        {intakeSuccess && (
                          <div className="alert alert-success px-2">
                            {intakeSuccess}
                          </div>
                        )}
                        <div className="col-md-4">
                          <label
                            htmlFor="goldbod_intake_officer"
                            className="form-label"
                          >
                            Officer
                          </label>
                          <input
                            type="text"
                            id="goldbod_intake_officer"
                            name="goldbod_intake_officer"
                            className="form-control"
                            value={intakeData.goldbod_intake_officer}
                            onChange={handleIntakeChange}
                            placeholder="e.g., John Doe"
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label
                            htmlFor="goldbod_intake_weight"
                            className="form-label"
                          >
                            Intake Weight (kg)
                          </label>
                          <input
                            type="number"
                            id="goldbod_intake_weight"
                            name="goldbod_intake_weight"
                            className="form-control"
                            value={intakeData.goldbod_intake_weight}
                            onChange={handleIntakeChange}
                            placeholder="e.g., 14.80"
                            step="0.01"
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label
                            htmlFor="goldbod_intake_receipt_id"
                            className="form-label"
                          >
                            Receipt #
                          </label>
                          <input
                            type="text"
                            id="goldbod_intake_receipt_id"
                            name="goldbod_intake_receipt_id"
                            className="form-control"
                            value={intakeData.goldbod_intake_receipt_id}
                            onChange={handleIntakeChange}
                            placeholder="e.g., GHD-2025-005"
                            required
                          />
                        </div>
                        <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowIntakeForm(false)}
                            disabled={submitting}
                          >
                            Close
                          </button>
                          <button type="submit" className="btn btn-success" disabled={submitting}>
                            Submit Intake
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}


                {/* Dealer can invite Goldbod after intake is still pending */}
                {!goldbod_intake_at && transport_shipped_at && user?.role === "dealer" && (
                  <div className="mt-3">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setShowInviteGoldbod(true)}
                      disabled={submitting}
                    >
                      Invite Goldbod
                    </button>
                    {showInviteGoldbod && (
                      <form onSubmit={handleInviteGoldbod} className="mt-2">
                        <input
                          type="text"
                          className="form-control mb-2"
                          placeholder="Enter goldbod's username"
                          value={inviteGoldbodUsername}
                          onChange={e => setInviteGoldbodUsername(e.target.value)}
                          required
                          disabled={submitting}
                        />
                        <button type="submit" className="btn btn-success btn-sm" disabled={submitting}>
                          Send Invite
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm ms-2"
                          onClick={() => setShowInviteGoldbod(false)}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                    {inviteGoldbodMessage && (
                      <div className="alert alert-info mt-2">{inviteGoldbodMessage}</div>
                    )}
                  </div>
                )}
              </li>

              {/* 5) Goldbod Assay Completed */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div className="d-flex align-items-center">
                    <strong className="me-2">5. Goldbod Assay Completed</strong>
                    {assay_completed_at && <CheckCircle />}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: assay_completed_at ? "green" : "#777",
                    }}
                  >
                    <i>Assay At:</i>
                    <br />
                    <b>
                      {assay_completed_at
                        ? formatDateTime(assay_completed_at)
                        : "Pending"}
                    </b>
                  </div>
                </div>

                <div className="mt-2">
                  {purity_percent ? (
                    <div style={{ color: "#555", fontSize: "0.9rem" }}>
                      <p style={{ marginBottom: "0.2rem" }}>
                        Purity: <b>{purity_percent}%</b>
                      </p>
                      {assay_report_pdf_url && (
                        <a
                          href={assay_report_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-info"
                        >
                          View Assay Report
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: "#999", fontSize: "0.85rem" }}>
                      <p className="mb-0" style={{ fontSize: "0.85rem" }}>
                        Purity: <b>—</b>
                      </p>
                      <p
                        className="mb-0"
                        style={{ fontSize: "0.85rem", color: "#777" }}
                      >
                        Assay Report: N/A
                      </p>

                      {/* Only Goldbod can update, and ONLY after intake is done */}
                      {user?.role === "goldbod" && !assay_completed_at && goldbod_intake_at && (
                        <>
                          {!showAssayForm ? (
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => setShowAssayForm(true)}
                              disabled={submitting}
                            >
                              Update
                            </button>
                          ) : (
                            <form onSubmit={submitAssay} className="row g-2 mt-2">
                              <div className="col-md-6">
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
                                  required
                                />
                              </div>
                              <div className="col-md-6">
                                <label htmlFor="assayFile" className="form-label fw-semibold">
                                  Assay Report (PDF)
                                </label>
                                <input
                                  type="file"
                                  id="assayFile"
                                  accept="application/pdf"
                                  className="form-control"
                                  onChange={handleAssayFileChange}
                                  required
                                />
                              </div>
                              {assayError && (
                                <div className="alert alert-danger text-center">{assayError}</div>
                              )}
                              {assaySuccess && (
                                <div className="alert alert-success text-center">{assaySuccess}</div>
                              )}
                              <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() => setShowAssayForm(false)}
                                  disabled={submitting}
                                >
                                  Close
                                </button>
                                <button type="submit" className="btn btn-success" disabled={submitting}>
                                  Submit Assay
                                </button>
                              </div>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submitting overlay */}
      {submitting && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255,255,255,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="text-center">
            <div className="spinner-border text-warning mb-3" role="status" />
            <div style={{ fontSize: "1.3rem", color: "#b99651" }}>Loading…</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TraceDetailsPage;
