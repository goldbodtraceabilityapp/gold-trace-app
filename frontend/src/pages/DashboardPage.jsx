// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dealerInvites, setDealerInvites] = useState([]);
  const [goldbodInvites, setGoldbodInvites] = useState([]);
  const [expandedInvite, setExpandedInvite] = useState(null);
  const [batchDetails, setBatchDetails] = useState({});
  const [asmNames, setAsmNames] = useState({});
  const [dealerNames, setDealerNames] = useState({});
  const [inviterNames, setInviterNames] = useState({});
  const [dealerNamesLoading, setDealerNamesLoading] = useState(true);
  const [showAcceptedNotification, setShowAcceptedNotification] =
    useState(false);
  const [justAcceptedBatchId, setJustAcceptedBatchId] = useState(null);
  const [showGoldbodAcceptedNotification, setShowGoldbodAcceptedNotification] =
    useState(false);
  const [justAcceptedGoldbodBatchId, setJustAcceptedGoldbodBatchId] =
    useState(null);

  // Fetch user info and invitations on mount
  useEffect(() => {
    const fetchUserAndInvites = async () => {
      try {
        const userResp = await API.get("/user/me");
        setUser(userResp.data);

        // If dealer, fetch invitations
        if (userResp.data.role === "dealer") {
          const token = localStorage.getItem("token");
          const invitesResp = await API.get("/dealer-invitations", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setDealerInvites(invitesResp.data || []);
        }
      } catch {
        localStorage.removeItem("token");
        navigate("/");
      }
    };
    fetchUserAndInvites();
  }, [navigate]);

  // Fetch goldbod invites if role is goldbod
  useEffect(() => {
    if (user?.role === "goldbod") {
      const fetchInvites = async () => {
        const token = localStorage.getItem("token");
        const resp = await API.get("/goldbod-invitations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGoldbodInvites(resp.data || []);
      };
      fetchInvites();
    }
  }, [user]);

  // Fetch batch and ASM info for each invite
  useEffect(() => {
    async function fetchDetails() {
      if (!dealerInvites.length) return;
      const token = localStorage.getItem("token");
      const batchIds = dealerInvites.map((inv) => inv.batch_id);
      const batchRes = await Promise.all(
        batchIds.map((id) =>
          API.get(`/batches/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.data)
            .catch(() => null)
        )
      );
      const batchMap = {};
      const asmUserIds = [];
      batchRes.forEach((batch) => {
        if (batch) {
          batchMap[batch.id] = batch;
          asmUserIds.push(batch.user_id);
        }
      });
      setBatchDetails(batchMap);

      // Fetch ASM usernames
      if (asmUserIds.length) {
        const uniqueIds = [...new Set(asmUserIds)];
        const usersRes = await Promise.all(
          uniqueIds.map((uid) =>
            API.get(`/user/by-id/${uid}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((res) => res.data)
              .catch(() => null)
          )
        );
        const nameMap = {};
        usersRes.forEach((user) => {
          if (user) nameMap[user.id] = user.username;
        });
        setAsmNames(nameMap);
      }
    }
    fetchDetails();
  }, [dealerInvites]);

  // Fetch batch and dealer info for each goldbod invite
  useEffect(() => {
    async function fetchGoldbodDetails() {
      setDealerNamesLoading(true);
      if (!goldbodInvites.length) return;
      const token = localStorage.getItem("token");
      const batchIds = goldbodInvites.map((inv) => inv.batch_id);

      // Fetch batch details for all goldbod invites
      const batchRes = await Promise.all(
        batchIds.map((id) =>
          API.get(`/batches/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.data)
            .catch(() => null)
        )
      );
      const batchMap = {};
      batchRes.forEach((batch) => {
        if (batch) {
          batchMap[batch.id] = batch;
        }
      });
      setBatchDetails((prev) => ({ ...prev, ...batchMap }));

      // Fetch dealer usernames for each batch
      const dealerRes = await Promise.all(
        batchIds.map((batchId) =>
          API.get(`/dealer-for-batch/${batchId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.data.dealer_username)
            .catch(() => null)
        )
      );
      // Map batchId -> dealer_username
      const batchIdToDealerUsername = {};
      batchIds.forEach((batchId, idx) => {
        if (dealerRes[idx]) {
          batchIdToDealerUsername[batchId] = dealerRes[idx];
        }
      });

      // Fetch dealer user info for each unique dealer_username
      const uniqueDealerUsernames = [
        ...new Set(Object.values(batchIdToDealerUsername).filter(Boolean)),
      ];
      const usersRes = await Promise.all(
        uniqueDealerUsernames.map((username) =>
          API.get(`/user/by-username/${username}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.data)
            .catch(() => null)
        )
      );
      const nameMap = {};
      usersRes.forEach((user) => {
        if (user) nameMap[user.username] = user.username;
      });
      setDealerNames(nameMap);

      // Save mapping from batchId to dealer_username for rendering
      setBatchDetails((prev) => {
        const updated = { ...prev };
        Object.entries(batchIdToDealerUsername).forEach(
          ([batchId, dealerUsername]) => {
            if (!updated[batchId]) updated[batchId] = {};
            updated[batchId].dealer_username = dealerUsername;
          }
        );
        return updated;
      });

      // Fetch mine info for each batch
      const mineIds = batchRes
        .filter((batch) => batch && batch.mine_id)
        .map((batch) => batch.mine_id);
      const uniqueMineIds = [...new Set(mineIds)];
      const minesRes = await Promise.all(
        uniqueMineIds.map((id) =>
          API.get(`/mines/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.data)
            .catch(() => null)
        )
      );
      const mineMap = {};
      minesRes.forEach((mine) => {
        if (mine) mineMap[mine.id] = mine.name;
      });
      setBatchDetails((prev) => {
        const updated = { ...prev };
        Object.values(updated).forEach((batch) => {
          if (batch && batch.mine_id && mineMap[batch.mine_id]) {
            batch.mine_name = mineMap[batch.mine_id];
          }
        });
        return updated;
      });
      setDealerNamesLoading(false);
    }
    fetchGoldbodDetails();
  }, [goldbodInvites]);

  // Fetch inviter usernames for all goldbod invites
  useEffect(() => {
    async function fetchInviterNames() {
      if (!goldbodInvites.length) return;
      const token = localStorage.getItem("token");
      const inviterIds = [
        ...new Set(goldbodInvites.map((inv) => inv.invited_by).filter(Boolean)),
      ];
      if (!inviterIds.length) return;
      const usersRes = await Promise.all(
        inviterIds.map((uid) =>
          API.get(`/user/by-id/${uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.data)
            .catch(() => null)
        )
      );
      const inviterNames = {};
      usersRes.forEach((user) => {
        if (user) inviterNames[user.id] = user.username;
      });
      setInviterNames(inviterNames);
    }
    fetchInviterNames();
  }, [goldbodInvites]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const goToRegister = () => navigate("/register-batch");
  const goToTraceHistory = () => navigate("/trace-history");
  const goToMines = () => navigate("/mines");

  // Accept/Reject handlers
  const handleAccept = async (inviteId) => {
    if (!window.confirm("Are you sure you want to accept this invitation?"))
      return;
    const token = localStorage.getItem("token");
    await API.patch(
      `/dealer-invitations/${inviteId}/accept`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    // Find the batch_id for this invite
    const acceptedInvite = dealerInvites.find((inv) => inv.id === inviteId);
    if (acceptedInvite) {
      setJustAcceptedBatchId(acceptedInvite.batch_id);
      setShowAcceptedNotification(true);
    }
    // Refresh invites and trace history (batches)
    const invitesResp = await API.get("/dealer-invitations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDealerInvites(invitesResp.data || []);
  };
  const handleReject = async (inviteId) => {
    if (!window.confirm("Are you sure you want to reject this invitation?"))
      return;
    const token = localStorage.getItem("token");
    // Delete the invite from the backend
    await API.delete(`/dealer-invitations/${inviteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Refresh invites
    const invitesResp = await API.get("/dealer-invitations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDealerInvites(invitesResp.data || []);
  };
  const handleAcceptGoldbodInvite = async (inviteId, batchId) => {
    if (!window.confirm("Accept this invitation?")) return;
    const token = localStorage.getItem("token");
    await API.patch(
      `/goldbod-invitations/${inviteId}/accept`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    // Refresh invites
    const resp = await API.get("/goldbod-invitations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setGoldbodInvites(resp.data || []);
    setJustAcceptedGoldbodBatchId(batchId);
    setShowGoldbodAcceptedNotification(true);
    // Do NOT navigate automatically!
  };
  const handleRejectGoldbodInvite = async (inviteId) => {
    if (!window.confirm("Reject this invitation?")) return;
    const token = localStorage.getItem("token");
    await API.delete(`/goldbod-invitations/${inviteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Refresh invites
    const resp = await API.get("/goldbod-invitations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setGoldbodInvites(resp.data || []);
  };

  // Only show invites that are not accepted
  const pendingInvites = dealerInvites.filter(
    (invite) => invite.accepted == null
  );
  const acceptedInvites = dealerInvites.filter(
    (invite) => invite.accepted === true
  );
  const rejectedInvites = dealerInvites.filter(
    (invite) => invite.accepted === false
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
            Gold Traceability Dashboard
          </h1>
          <button
            className="btn btn-danger"
            style={{
              color: "#fff",
              fontWeight: 500,
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              minWidth: "100px",
              alignSelf: "center",
            }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        {/* ===== DEALER ACCEPTED NOTIFICATION ===== */}
        {showAcceptedNotification && justAcceptedBatchId && (
          <div
            className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between"
            role="alert"
          >
            <div>
              <b>Batch accepted!</b> The batch has been added to your trace
              history.
            </div>
            <div>
              <button
                className="btn btn-sm btn-outline-primary ms-2"
                onClick={() => {
                  setShowAcceptedNotification(false);
                  navigate(`/batch/${encodeURIComponent(justAcceptedBatchId)}`);
                }}
              >
                View Trace Flow
              </button>
              <button
                type="button"
                className="btn-close ms-2"
                aria-label="Close"
                onClick={() => setShowAcceptedNotification(false)}
              />
            </div>
          </div>
        )}

        {/* ===== GOLDBOD ACCEPTED NOTIFICATION ===== */}
        {showGoldbodAcceptedNotification && justAcceptedGoldbodBatchId && (
          <div
            className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between"
            role="alert"
          >
            <div>
              <b>Batch accepted!</b> The batch has been added to your trace
              history.
            </div>
            <div>
              <button
                className="btn btn-sm btn-outline-primary ms-2"
                onClick={() => {
                  setShowGoldbodAcceptedNotification(false);
                  navigate("/trace-history");
                }}
              >
                View Trace History
              </button>
              <button
                type="button"
                className="btn-close ms-2"
                aria-label="Close"
                onClick={() => setShowGoldbodAcceptedNotification(false)}
              />
            </div>
          </div>
        )}

        {/* ===== DEALER INVITATIONS ===== */}
        {user && user.role === "dealer" && (
          <div className="alert alert-info mt-3">
            <h5>Pending Invitations</h5>
            {pendingInvites.length === 0 ? (
              <div className="text-center text-muted py-2">Empty</div>
            ) : (
              <ul className="list-unstyled">
                {pendingInvites.map((invite) => {
                  const batch = batchDetails[invite.batch_id];
                  const asmName = batch && asmNames[batch.user_id];

                  // New code change: Determine inviter name
                  const inviterId = invite.invited_by;
                  const inviterName =
                    inviterNames[invite.invited_by] || "Unknown";

                  return (
                    <li key={invite.id} className="mb-2 border-bottom pb-2">
                      <div
                        className="d-flex align-items-center justify-content-between"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setExpandedInvite(
                            expandedInvite === invite.id ? null : invite.id
                          )
                        }
                      >
                        <span>
                          <b>From:</b> {inviterName}
                        </span>
                        <span>
                          {expandedInvite === invite.id ? (
                            <FaChevronUp />
                          ) : (
                            <FaChevronDown />
                          )}
                        </span>
                      </div>
                      {expandedInvite === invite.id && batch && (
                        <div className="mt-2">
                          <table className="table table-bordered table-sm mb-2">
                            <thead>
                              <tr>
                                <th>Batch ID</th>
                                <th>Mine Name</th>
                                <th>Date Registered</th>
                                <th>Weight (kg)</th>
                                <th>Purity (%)</th>
                                <th>Origin Cert</th>
                                <th>Dealer License</th>
                                <th>Assay Report</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>{batch.batch_id}</td>
                                <td>{batch.mine_name || batch.mine_id}</td>
                                <td>
                                  {batch.created_at
                                    ? new Date(
                                        batch.created_at
                                      ).toLocaleString()
                                    : "—"}
                                </td>
                                <td>{batch.weight_kg}</td>
                                <td>{batch.purity_percent ?? "—"}</td>
                                <td>
                                  {batch.origin_cert_image_url ? (
                                    <a
                                      href={batch.origin_cert_image_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm btn-outline-info"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    "N/A"
                                  )}
                                </td>
                                <td>
                                  {batch.dealer_license_image_url ? (
                                    <a
                                      href={batch.dealer_license_image_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm btn-outline-info"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    "N/A"
                                  )}
                                </td>
                                <td>
                                  {batch.assay_report_pdf_url ? (
                                    <a
                                      href={batch.assay_report_pdf_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-sm btn-outline-info"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    "N/A"
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleAccept(invite.id)}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleReject(invite.id)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ===== GOLD BOD INVITATIONS ===== */}
        {user?.role === "goldbod" && (
          <div className="alert alert-info mt-3">
            <h5>Pending Goldbod Invitations</h5>
            {goldbodInvites.filter((invite) => invite.accepted == null)
              .length === 0 ? (
              <div className="text-center text-muted py-2">Empty</div>
            ) : (
              <div>
                {dealerNamesLoading ? (
                  <div className="text-center text-muted py-2">
                    Loading info…
                  </div>
                ) : (
                  <ul className="list-unstyled">
                    {goldbodInvites
                      .filter((invite) => invite.accepted == null)
                      .map((invite) => {
                        const batch = batchDetails[invite.batch_id];
                        const dealerName =
                          (batch &&
                            batch.dealer_username &&
                            dealerNames[batch.dealer_username]) ||
                          (batch && batch.dealer_username) ||
                          "Unknown Dealer";
                        return (
                          <li
                            key={invite.id}
                            className="mb-2 border-bottom pb-2"
                          >
                            <div
                              className="d-flex align-items-center justify-content-between"
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                setExpandedInvite(
                                  expandedInvite === invite.id
                                    ? null
                                    : invite.id
                                )
                              }
                            >
                              <span>
                                <b>Invited By:</b>{" "}
                                {inviterNames[invite.invited_by] || "Unknown"}
                              </span>
                              <span>
                                {expandedInvite === invite.id ? (
                                  <FaChevronUp />
                                ) : (
                                  <FaChevronDown />
                                )}
                              </span>
                            </div>
                            {expandedInvite === invite.id && batch && (
                              <div className="mt-2">
                                <table className="table table-bordered table-sm mb-2">
                                  <thead>
                                    <tr>
                                      <th>Batch ID</th>
                                      <th>Mine Name</th>
                                      <th>Date Registered</th>
                                      <th>Weight (kg)</th>
                                      <th>Purity (%)</th>
                                      <th>Origin Cert</th>
                                      <th>Dealer License</th>
                                      <th>Assay Report</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>{batch.batch_id}</td>
                                      <td>
                                        {batch.mine_name || batch.mine_id}
                                      </td>
                                      <td>
                                        {batch.created_at
                                          ? new Date(
                                              batch.created_at
                                            ).toLocaleString()
                                          : "—"}
                                      </td>
                                      <td>{batch.weight_kg}</td>
                                      <td>{batch.purity_percent ?? "—"}</td>
                                      <td>
                                        {batch.origin_cert_image_url ? (
                                          <a
                                            href={batch.origin_cert_image_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-outline-info"
                                          >
                                            View
                                          </a>
                                        ) : (
                                          "N/A"
                                        )}
                                      </td>
                                      <td>
                                        {batch.dealer_license_image_url ? (
                                          <a
                                            href={
                                              batch.dealer_license_image_url
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-outline-info"
                                          >
                                            View
                                          </a>
                                        ) : (
                                          "N/A"
                                        )}
                                      </td>
                                      <td>
                                        {batch.assay_report_pdf_url ? (
                                          <a
                                            href={batch.assay_report_pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-outline-info"
                                          >
                                            View
                                          </a>
                                        ) : (
                                          "N/A"
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() =>
                                      handleAcceptGoldbodInvite(
                                        invite.id,
                                        invite.batch_id
                                      )
                                    }
                                  >
                                    Accept
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() =>
                                      handleRejectGoldbodInvite(invite.id)
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== CARDS GRID ===== */}
        {user ? (
          <div className="row gx-4 gy-4 px-1 px-md-3 w-100 m-0">
            {/* ===== Welcome Card ===== */}
            <div className="col-12 col-md-3">
              <div
                className="card h-100"
                style={{
                  border: "2px solid #fff",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/dashboard")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.08)";
                }}
              >
                <div className="card-body text-center py-5">
                  <h5 className="card-title mb-3" style={{ color: "#b99651" }}>
                    Welcome, {user.username}
                  </h5>
                  <p className="card-text text-secondary">
                    Manage and trace your gold batches.
                  </p>
                </div>
              </div>
            </div>

            {/* ===== Register Gold Batch Card (ASM only) ===== */}
            {user.role === "asm" && (
              <div className="col-12 col-md-3">
                <div
                  className="card h-100"
                  style={{
                    border: "2px solid #fff",
                    borderRadius: "0.75rem",
                    backgroundColor: "rgba(255,255,255,0.9)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer",
                  }}
                  onClick={goToRegister}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.08)";
                  }}
                >
                  <div className="card-body text-center py-5">
                    <h5
                      className="card-title mb-3"
                      style={{ color: "#b99651" }}
                    >
                      Register Gold Batch
                    </h5>
                    <p className="card-text text-secondary mb-4">
                      Add new gold batch details for traceability.
                    </p>
                    <button
                      type="button"
                      className="btn btn-warning px-4"
                      style={{ fontWeight: 500 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToRegister();
                      }}
                    >
                      Add Batch
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== Trace History Card ===== */}
            <div className="col-12 col-md-3">
              <div
                className="card h-100"
                style={{
                  border: "2px solid #fff",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "pointer",
                }}
                onClick={goToTraceHistory}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.08)";
                }}
              >
                <div className="card-body text-center py-5">
                  <h5 className="card-title mb-3" style={{ color: "#b99651" }}>
                    Trace History
                  </h5>
                  <p className="card-text text-secondary mb-4">
                    Review trace history of registered gold batches.
                  </p>
                  <button
                    className="btn btn-warning px-4"
                    style={{ fontWeight: 500 }}
                  >
                    View History
                  </button>
                </div>
              </div>
            </div>

            {/* ===== Mines List Card (ASM only) ===== */}
            {user.role === "asm" && (
              <div className="col-12 col-md-3">
                <div
                  className="card h-100"
                  style={{
                    border: "2px solid #fff",
                    borderRadius: "0.75rem",
                    backgroundColor: "rgba(255,255,255,0.9)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer",
                  }}
                  onClick={goToMines}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.08)";
                  }}
                >
                  <div className="card-body text-center py-5">
                    <h5
                      className="card-title mb-3"
                      style={{ color: "#b99651" }}
                    >
                      View Mines
                    </h5>
                    <p className="card-text text-secondary mb-4">
                      See all mines you manage (or all if you are Goldbod).
                    </p>
                    <button
                      className="btn btn-warning px-4"
                      style={{ fontWeight: 500 }}
                    >
                      Go to Mines
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-white text-center mt-5">Loading your info…</p>
        )}

        {/* ===== USER INFO ===== */}
        {user && (
          <div style={{ color: "red" }}>Logged in as: {user.username}</div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
