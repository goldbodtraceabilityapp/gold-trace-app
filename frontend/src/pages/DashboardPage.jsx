// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Fetch user info on mount
  useEffect(() => {
    API.get('/user/me')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/');
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const goToRegister = () => navigate('/register-batch');
  const goToTraceHistory = () => navigate('/trace-history');
  const goToMines = () => navigate('/mines');

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

            {/* ===== Mines List Card ===== */}
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
          </div>
        ) : (
          <p className="text-white text-center mt-5">Loading your info…</p>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
