// src/pages/TraceDetailsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

function TraceDetailsPage() {
  const { id } = useParams();      // Batch ID from URL
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');

        // 1. Fetch the single batch by its primary key (id)
        const { data: batchData, error: batchError } = await API.get(
          `/batches/${encodeURIComponent(id)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (batchError || !batchData) {
          setError(batchError?.message || 'Batch not found.');
          setLoading(false);
          return;
        }
        setBatch(batchData);

        // 2. Fetch all mines, then find mine matching batchData.mine_id
        const { data: minesData, error: minesError } = await API.get('/mines', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (minesError) {
          setError(minesError.message || 'Error fetching mine.');
        } else {
          const found = minesData.find((m) => m.id === batchData.mine_id);
          setMine(found || { name: 'Unknown Mine', location: '' });
        }
      } catch (err) {
        console.error(err);
        setError('Server error loading trace.');
      }
      setLoading(false);
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-warning" role="status" />
        <span className="ms-2" style={{ color: '#b99651' }}>Loading trace details…</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger m-4 text-center">{error}</div>;
  }

  // Helper: format UTC string to local date/time, or show 'Pending'
  const formatDateTime = (isoString) => {
    if (!isoString) return 'Pending';
    return new Date(isoString).toLocaleString();
  };

  // Destructure necessary fields from batch
  const {
    batch_id,
    date_collected,               // user‐entered
    weight_kg,
    origin_cert_image_url,
    dealer_license_image_url,
    purity_percent,
    assay_report_pdf_url,
    created_at,                   // server‐generated timestamp
    assay_completed_at            // new column
  } = batch;

  // Dealer license upload should show created_at (same moment)
  const dealerReceivedAt = dealer_license_image_url
    ? formatDateTime(created_at)
    : null;

  // Assay completion uses its own timestamp
  const assayCompletedAt = assay_completed_at
    ? formatDateTime(assay_completed_at)
    : null;

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
            Trace Details for {batch_id}
          </h1>
          <button
            className="btn btn-secondary"
            style={{
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              minWidth: '200px',
              height: '40px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => navigate('/trace-history')}
          >
            Back to History
          </button>
        </div>

        {/* ===== TIMELINE CARD ===== */}
        <div className="card shadow-lg mx-auto" style={{ maxWidth: '720px', borderRadius: '0.75rem' }}>
          <div className="card-body" style={{ background: 'rgba(255,255,255,0.97)' }}>
            <h5 className="card-title" style={{ color: '#b99651', fontWeight: 600 }}>Trace Flow</h5>

            <ul className="list-group list-group-flush">
              {/* 1) Registered by ASM at Mine */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>Batch Registered</strong>
                    <p className="mb-1" style={{ fontSize: '0.9rem', color: '#555' }}>
                      Mine: {mine?.name || '—'}{mine?.location ? ` (${mine.location})` : ''}
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      Collected on: {date_collected ? new Date(date_collected).toLocaleDateString() : '—'}
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      Weight: {weight_kg} kg
                    </p>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#777' }}>
                    {formatDateTime(created_at)}
                  </div>
                </div>
              </li>

              {/* 2) Dealer Received Batch */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>Dealer Received</strong>
                    <p className="mb-1" style={{ fontSize: '0.85rem' }}>
                      {dealer_license_image_url ? (
                        <a
                          href={dealer_license_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-info"
                        >
                          View Dealer License
                        </a>
                      ) : (
                        <span style={{ color: '#999' }}>Pending</span>
                      )}
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem', color: '#555' }}>
                      Dealer: {batch.user_id ? `ID ${batch.user_id}` : '—'}{/* or replace with dealer name */}
                    </p>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#777' }}>
                    {dealerReceivedAt || '—'}
                  </div>
                </div>
              </li>

              {/* 3) Goldbod Assay Completed */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>Goldbod Assay Completed</strong>
                    {purity_percent ? (
                      <>
                        <p className="mb-1" style={{ fontSize: '0.9rem', color: '#555' }}>
                          Purity: {purity_percent}%
                        </p>
                        {assay_report_pdf_url && (
                          <a
                            href={assay_report_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-info mt-1"
                          >
                            View Assay Report
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="mb-0" style={{ fontSize: '0.85rem', color: '#999' }}>
                          Pending
                        </p>
                        <button
                          className="btn btn-sm btn-warning mt-2"
                          onClick={() => navigate(`/batch/${id}/assay`)}
                        >
                          Upload Assay
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#777' }}>
                    {assayCompletedAt || '—'}
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TraceDetailsPage;
