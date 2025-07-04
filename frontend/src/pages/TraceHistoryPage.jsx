// src/pages/TraceHistoryPage.jsx
import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';

function TraceHistoryPage() {
  const [batches, setBatches] = useState([]);
  const [mines, setMines] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Helper to extract numeric part of "BATCH-<number>"
  const getBatchNumber = (batchId) => {
    const parts = batchId.split('-');
    return parts.length === 2 ? parseInt(parts[1], 10) : 0;
  };

  // 1. Fetch both batches and mines when the component mounts
  useEffect(() => {
    Promise.all([API.get('/mines'), API.get('/batches')])
      .then(([minesRes, batchesRes]) => {
        const sortedBatches = batchesRes.data
          .slice()
          .sort((a, b) => getBatchNumber(a.batch_id) - getBatchNumber(b.batch_id));

        setMines(minesRes.data);
        setBatches(sortedBatches);
        setFilteredBatches(sortedBatches);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Error fetching data.');
        setLoading(false);
      });
  }, []);

  // 2. Build a map from mine ID → mine name
  const mineById = React.useMemo(() => {
    const map = {};
    mines.forEach((m) => {
      map[m.id] = m.name;
    });
    return map;
  }, [mines]);

  // 3. Filter batches whenever searchTerm or batches change
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term === '') {
      setFilteredBatches(batches);
    } else {
      const filtered = batches.filter((batch) => {
        const mineName = mineById[batch.mine_id]?.toLowerCase() || '';
        return (
          batch.batch_id.toLowerCase().includes(term) ||
          mineName.includes(term)
        );
      });
      setFilteredBatches(filtered);
    }
  }, [searchTerm, batches, mineById]);

  // 4. Handler for “View Trace” button
  const handleViewTrace = (batch) => {
    navigate(`/batch/${encodeURIComponent(batch.id)}`);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f9d976 0%, #b99651 100%)',
        minHeight: '100vh',
        width: '100vw',
        padding: '2rem 0',
        margin: 0,
        overflowX: 'hidden',
        backgroundImage: 'url("/Goldbodlogoforhome-1.jpg")', // <-- add this line
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
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
            Trace History
          </h1>
          <button
            className="btn btn-secondary "
            style={{
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              minWidth: '200px',
              height: '40px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>

        {/* ===== SEARCH BAR ===== */}
        <div className="row mb-4">
          <div className="col-12 col-md-6 mx-auto">
            <input
              type="text"
              className="form-control shadow-sm"
              placeholder="Search by Batch ID or Mine Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                borderRadius: '0.5rem',
                border: '1px solid #ccc',
              }}
            />
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <div
          className="table-responsive shadow-sm"
          style={{
            borderRadius: '0.75rem',
            background: 'rgba(255,255,255,0.97)',
            maxHeight: '90vh',      // Add this line
            overflowY: 'auto',      // Add this line
          }}
        >
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" role="status" />
              <p className="mt-3" style={{ color: '#b99651' }}>Loading data…</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger m-4 text-center">{error}</div>
          ) : (
            <table className="table table-hover table-bordered mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Batch ID</th>
                  <th>Mine Name</th>
                  <th>Date Registered</th>
                  <th>Weight (kg)</th>
                  <th>Purity (%)</th>
                  <th>Origin Cert</th>
                  <th>Dealer License</th>
                  <th>Assay Report</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch) => {
                    const mineName = mineById[batch.mine_id] || 'Unknown Mine';
                    return (
                      <tr
                        key={batch.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleViewTrace(batch)}
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') handleViewTrace(batch);
                        }}
                      >
                        <td>{batch.batch_id}</td>
                        <td>{mineName}</td>
                        <td>
                          {batch.created_at
                            ? new Date(batch.created_at).toLocaleString(undefined, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })
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
                              onClick={e => e.stopPropagation()}
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
                              onClick={e => e.stopPropagation()}
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
                              onClick={e => e.stopPropagation()}
                            >
                              View
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={e => {
                              e.stopPropagation();
                              handleViewTrace(batch);
                            }}
                          >
                            View Trace
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      No batches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default TraceHistoryPage;
