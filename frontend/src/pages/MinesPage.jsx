// src/pages/MinesPage.jsx
import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';

function MinesPage() {
  const [mines, setMines] = useState([]);
  const [filteredMines, setFilteredMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Fetch all mines on mount
  useEffect(() => {
    API.get('/mines')
      .then((res) => {
        setMines(res.data);
        setFilteredMines(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Error fetching mines.');
        setLoading(false);
      });
  }, []);

  // Filter mines when searchTerm changes
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term === '') {
      setFilteredMines(mines);
    } else {
      const filtered = mines.filter((mine) =>
        (mine.name?.toLowerCase() || '').includes(term) ||
        (mine.location?.toLowerCase() || '').includes(term)
      );
      setFilteredMines(filtered);
    }
  }, [searchTerm, mines]);

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
            Mines List
          </h1>
          <button
            className="btn btn-secondary"
            style={{
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              minWidth: '200px',
              alignSelf: 'center'
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
              placeholder="Search by Mine Name or Location"
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
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.97)'
          }}
        >
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-warning" role="status" />
              <p className="mt-3" style={{ color: '#b99651' }}>Loading mines…</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger m-4 text-center">{error}</div>
          ) : (
            <table className="table table-hover table-bordered mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>License No.</th>
                </tr>
              </thead>
              <tbody>
                {filteredMines.length > 0 ? (
                  filteredMines.map((mine) => (
                    <tr key={mine.id}>
                      <td>{mine.name}</td>
                      <td>{mine.location}</td>
                      <td>{mine.license_number || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      No mines found.
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

export default MinesPage;
