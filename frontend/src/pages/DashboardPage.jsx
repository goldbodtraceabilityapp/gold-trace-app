// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dealerInvites, setDealerInvites] = useState([]); // NEW
  const [expandedInvite, setExpandedInvite] = useState(null);
  const [batchDetails, setBatchDetails] = useState({}); // batch_id -> batch info
  const [asmNames, setAsmNames] = useState({}); // user_id -> username

  // Fetch user info and invitations on mount
  useEffect(() => {
    const fetchUserAndInvites = async () => {
      try {
        const userResp = await API.get('/user/me');
        setUser(userResp.data);

        // If dealer, fetch invitations
        if (userResp.data.role === 'dealer') {
          const token = localStorage.getItem('token');
          const invitesResp = await API.get('/dealer-invitations', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setDealerInvites(invitesResp.data || []);
        }
      } catch {
        localStorage.removeItem('token');
        navigate('/');
      }
    };
    fetchUserAndInvites();
  }, [navigate]);

  // Fetch batch and ASM info for each invite
  useEffect(() => {
    async function fetchDetails() {
      if (!dealerInvites.length) return;
      const token = localStorage.getItem('token');
      const batchIds = dealerInvites.map(inv => inv.batch_id);
      const batchRes = await Promise.all(
        batchIds.map(id =>
          API.get(`/batches/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.data)
            .catch(() => null)
        )
      );
      const batchMap = {};
      const asmUserIds = [];
      batchRes.forEach(batch => {
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
          uniqueIds.map(uid =>
            API.get(`/user/by-id/${uid}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => res.data)
              .catch(() => null)
          )
        );
        const nameMap = {};
        usersRes.forEach(user => {
          if (user) nameMap[user.id] = user.username;
        });
        setAsmNames(nameMap);
      }
    }
    fetchDetails();
  }, [dealerInvites]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const goToRegister = () => navigate('/register-batch');
  const goToTraceHistory = () => navigate('/trace-history');
  const goToMines = () => navigate('/mines');

  // Accept/Reject handlers
  const handleAccept = async (inviteId) => {
    const token = localStorage.getItem('token');
    await API.patch(`/dealer-invitations/${inviteId}/accept`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Refresh invites and trace history (batches)
    const invitesResp = await API.get('/dealer-invitations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setDealerInvites(invitesResp.data || []);
    // Optionally, trigger a refresh in Trace History page (if you use context or a global state)
  };
  const handleReject = async (inviteId) => {
    // Implement reject logic (DELETE invitation or mark as rejected)
    // Optionally, refresh invites after
  };

  // Only show invites that are not accepted
  const pendingInvites = dealerInvites.filter(invite => invite.accepted !== true);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f9d976 0%, #b99651 100%)',
        minHeight: '100vh',
        width: '100vw',
        padding: '2rem 0',
        margin: 0,
        overflowX: 'hidden'
      }}
    >
      <div className="container-fluid px-4">
        {/* ===== HEADER ===== */}
        <div
          className="d-flex justify-content-between align-items-center mb-5 flex-column flex-md-row"
          style={{ gap: '1rem', padding: '0 1rem' }}
        >
          <h1
            style={{
              color: '#fff',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              margin: 0,
              fontSize: '2.5rem',
              fontWeight: 600,
              width: '100%',
              textAlign: 'center'
            }}
          >
            Gold Traceability Dashboard
          </h1>
          <button
            className="btn btn-danger"
            style={{
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              minWidth: '100px',
              alignSelf: 'center'
            }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        {/* ===== DEALER INVITATIONS ===== */}
        {user && user.role === 'dealer' && (
          <div className="alert alert-info mt-3">
            <h5>Pending Invitations</h5>
            {pendingInvites.length === 0 ? (
              <div className="text-center text-muted py-2">Empty</div>
            ) : (
              <ul className="list-unstyled">
                {pendingInvites.map(invite => {
                  const batch = batchDetails[invite.batch_id];
                  const asmName = batch && asmNames[batch.user_id];

                  return (
                    <li key={invite.id} className="mb-2 border-bottom pb-2">
                      <div
                        className="d-flex align-items-center justify-content-between"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedInvite(expandedInvite === invite.id ? null : invite.id)}
                      >
                        <span>
                          <b>From:</b> {asmName ? asmName : 'Loading...'}
                        </span>
                        <span>
                          {expandedInvite === invite.id ? <FaChevronUp /> : <FaChevronDown />}
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
                                    ? new Date(batch.created_at).toLocaleString()
                                    : '—'}
                                </td>
                                <td>{batch.weight_kg}</td>
                                <td>{batch.purity_percent ?? '—'}</td>
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
                                    'N/A'
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
                                    'N/A'
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
                                    'N/A'
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="d-flex gap-2">
                            <button className="btn btn-success btn-sm" onClick={() => handleAccept(invite.id)}>
                              Accept
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleReject(invite.id)}>
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

        {/* ===== CARDS GRID ===== */}
        {user ? (
          <div className="row gx-4 gy-4 px-1 px-md-3 w-100 m-0">
            {/* ===== Welcome Card ===== */}
            <div className="col-12 col-md-3">
              <div
                className="card h-100"
                style={{
                  border: '2px solid #fff',
                  borderRadius: '0.75rem',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/dashboard')}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
              >
                <div className="card-body text-center py-5">
                  <h5 className="card-title mb-3" style={{ color: '#b99651' }}>
                    Welcome, {user.username}
                  </h5>
                  <p className="card-text text-secondary">
                    Manage and trace your gold batches.
                  </p>
                </div>
              </div>
            </div>

            {/* ===== Register Gold Batch Card (ASM only) ===== */}
            {user.role === 'asm' && (
              <div className="col-12 col-md-3">
                <div
                  className="card h-100"
                  style={{
                    border: '2px solid #fff',
                    borderRadius: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={goToRegister}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  }}
                >
                  <div className="card-body text-center py-5">
                    <h5 className="card-title mb-3" style={{ color: '#b99651' }}>
                      Register Gold Batch
                    </h5>
                    <p className="card-text text-secondary mb-4">
                      Add new gold batch details for traceability.
                    </p>
                    <button className="btn btn-warning px-4" style={{ fontWeight: 500 }}>
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
                  border: '2px solid #fff',
                  borderRadius: '0.75rem',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onClick={goToTraceHistory}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
              >
                <div className="card-body text-center py-5">
                  <h5 className="card-title mb-3" style={{ color: '#b99651' }}>
                    Trace History
                  </h5>
                  <p className="card-text text-secondary mb-4">
                    Review trace history of registered gold batches.
                  </p>
                  <button className="btn btn-warning px-4" style={{ fontWeight: 500 }}>
                    View History
                  </button>
                </div>
              </div>
            </div>

            {/* ===== Mines List Card (ASM only) ===== */}
            {user.role === 'asm' && (
              <div className="col-12 col-md-3">
                <div
                  className="card h-100"
                  style={{
                    border: '2px solid #fff',
                    borderRadius: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={goToMines}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  }}
                >
                  <div className="card-body text-center py-5">
                    <h5 className="card-title mb-3" style={{ color: '#b99651' }}>
                      View Mines
                    </h5>
                    <p className="card-text text-secondary mb-4">
                      See all mines you manage (or all if you are Goldbod).
                    </p>
                    <button className="btn btn-warning px-4" style={{ fontWeight: 500 }}>
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
        {user && <div style={{color: 'red'}}>Logged in as: {user.username}</div>}
      </div>
    </div>
  );
}

export default DashboardPage;
