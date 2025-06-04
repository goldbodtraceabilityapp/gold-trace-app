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

        // 1) Fetch the single batch by its id
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

        // 2) Fetch mines list so we can show mine name & location
        const { data: minesData, error: minesError } = await API.get('/mines', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (minesError) {
          setError(minesError.message || 'Error fetching mine.');
        } else {
          const found = minesData.find(m => m.id === batchData.mine_id);
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

  // Helper: format a UTC string or show “Pending”
  const formatDateTime = isoString => {
    if (!isoString) return 'Pending';
    return new Date(isoString).toLocaleString();
  };

  // Destructure all the fields we need from batch
  const {
    batch_id,
    date_collected,               // user‐provided
    weight_kg,
    origin_cert_image_url,
    dealer_license_image_url,
    purity_percent,
    assay_report_pdf_url,
    created_at,                   // step 1 timestamp
    dealer_received_at,           // step 2 timestamp
    dealer_received_weight,       // step 2 weight
    dealer_receipt_id,            // step 2 receipt
    dealer_location,              // step 2 location
    transport_shipped_at,         // step 3 timestamp
    transport_courier,            // step 3 courier
    transport_tracking_number,    // step 3 tracking
    transport_origin_location,    // step 3 origin
    transport_destination_location, // step 3 destination
    goldbod_intake_at,            // step 4 timestamp
    goldbod_intake_officer,       // step 4 officer
    goldbod_intake_weight,        // step 4 weight
    goldbod_intake_receipt_id,    // step 4 receipt
    assay_completed_at            // step 5 timestamp
  } = batch;

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

              {/* 1) Registered by ASM */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>1. Registered by ASM</strong>
                    <p className="mb-1" style={{ fontSize: '0.9rem', color: '#555' }}>
                      Mine: {mine?.name || '—'}{mine?.location ? ` (${mine.location})` : ''}
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      Collected on: <b>{date_collected ? new Date(date_collected).toLocaleDateString() : '—'}</b>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      Weight: <b>{weight_kg} kg</b>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem', color: '#777' }}>
                      Origin Cert:&nbsp;
                      {origin_cert_image_url 
                        ? (
                          <a
                            href={origin_cert_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-info"
                          >
                            View
                          </a>
                        )
                        : 'N/A'}
                    </p>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#777' }}>
                    <i>Timestamp:</i><br/>
                    <b>{formatDateTime(created_at)}</b>
                  </div>
                </div>
              </li>

              {/* 2) Dealer Received Batch */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>2. Dealer Received</strong>
                    <p className="mb-1" style={{ fontSize: '0.9rem', color: '#555' }}>
                      Dealer: <b>{batch.user_id ? `ID ${batch.user_id}` : '—'}</b>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      Location: <b>{dealer_location || '—'}</b>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      Received Weight: <b>{dealer_received_weight && `${dealer_received_weight} kg`}</b>
                      <span style={{ fontSize: '0.8rem', color: '#777' }}>
                        {dealer_received_weight
                          ? ` (Receipt: ${dealer_receipt_id})`
                          : ''}
                      </span>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem', color: '#777' }}>
                      Dealer License:&nbsp;
                      {dealer_license_image_url
                        ? (
                          <a
                            href={dealer_license_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-info"
                          >
                            View
                          </a>
                        )
                        : 'N/A'}
                    </p>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#777' }}>
                    <i>Timestamp:</i><br/>
                    <b>{dealer_received_at ? formatDateTime(dealer_received_at) : 'Pending'}</b>
                  </div>
                </div>
              </li>

              {/* 3) Transport to Goldbod */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>3. Transport to Goldbod</strong>
                    <p className="mb-1" style={{ fontSize: '0.9rem', color: '#555' }}>
                      Courier: <b>{transport_courier || '—'}</b>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      Tracking #: <b>{transport_tracking_number || '—'}</b>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      From: <b>{transport_origin_location || '—'}</b>  
                      &nbsp;→&nbsp;
                      To: <b>{transport_destination_location || '—'}</b>
                    </p>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#777' }}>
                    <i>Shipped At:</i><br/>
                    <b>{transport_shipped_at ? formatDateTime(transport_shipped_at) : 'Pending'}</b>
                  </div>
                </div>
              </li>

              {/* 4) Goldbod Intake & Weighing */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>4. Goldbod Intake & Weighing</strong>
                    <p className="mb-1" style={{ fontSize: '0.9rem', color: '#555' }}>
                      Officer: <b>{goldbod_intake_officer || '—'}</b>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                      Intake Weight: <b>{goldbod_intake_weight ? `${goldbod_intake_weight} kg` : '—'}</b>
                    </p>
                    <p className="mb-0" style={{ fontSize: '0.85rem', color: '#777' }}>
                      Intake Receipt #: <b>{goldbod_intake_receipt_id || '—'}</b>
                    </p>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#777' }}>
                    <i>Timestamp:</i><br/>
                    <b>{goldbod_intake_at ? formatDateTime(goldbod_intake_at) : 'Pending'}</b>
                  </div>
                </div>
              </li>

              {/* 5) Goldbod Assay Completed */}
              <li className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>5. Goldbod Assay Completed</strong>
                    {purity_percent ? (
                      <>
                        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.2rem' }}>
                          Purity: <b>{purity_percent}%</b>
                        </p>
                        {assay_report_pdf_url && (
                          <a
                            href={assay_report_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-info mb-1"
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
                    <i>Assay At:</i><br/>
                    <b>{assay_completed_at ? formatDateTime(assay_completed_at) : 'Pending'}</b>
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
