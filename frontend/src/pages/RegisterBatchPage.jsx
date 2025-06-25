// src/pages/RegisterBatchPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function RegisterBatchPage() {
  const navigate = useNavigate();

  const [mines, setMines] = useState([]);
  const [formData, setFormData] = useState({
    mine_id: '',             // existing mine ID or 'new'
    date_collected: '',
    weight_kg: '',
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newMineName, setNewMineName] = useState('');

  const [originCert, setOriginCert] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add new state for new mine fields
  const [newMineType, setNewMineType] = useState('');
  const [newMineLocation, setNewMineLocation] = useState('');
  const [newMineLicense, setNewMineLicense] = useState('');

  // Fetch existing mines for this user
  useEffect(() => {
    API.get('/mines')
      .then(res => setMines(res.data))
      .catch(() => setMines([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If user chooses "new" in the dropdown, toggle new-mine mode
    if (name === 'mine_id') {
      if (value === 'new') {
        setIsCreatingNew(true);
        setFormData({ ...formData, mine_id: '' });
      } else {
        setIsCreatingNew(false);
        setFormData({ ...formData, mine_id: value });
      }
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleNewMineFieldChange = (e) => {
    const { name, value } = e.target;
    if (name === 'newMineName') setNewMineName(value);
    if (name === 'newMineType') setNewMineType(value);
    if (name === 'newMineLocation') setNewMineLocation(value);
    if (name === 'newMineLicense') setNewMineLicense(value);
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === 'origin_cert') setOriginCert(files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      let selectedMineId = formData.mine_id;

      // 1. If user is creating a new mine, call POST /mines first
      if (isCreatingNew) {
        if (!newMineName.trim() || !newMineType.trim() || !newMineLocation.trim() || !newMineLicense.trim()) {
          setError('Please fill in all new mine fields.');
          setSubmitting(false);
          return;
        }
        // Create new mine; backend now requires all fields
        const mineResponse = await API.post(
          '/mines',
          {
            name: newMineName.trim(),
            type: newMineType.trim(),
            location: newMineLocation.trim(),
            license_number: newMineLicense.trim(),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        selectedMineId = mineResponse.data.id;
        setMines(prev => [...prev, mineResponse.data]);
      }

      // 2. Now build FormData for the batch itself
      const batchData = new FormData();
      batchData.append('mine_id', selectedMineId);
      batchData.append('date_collected', formData.date_collected);
      batchData.append('weight_kg', formData.weight_kg);
      if (originCert) batchData.append('origin_cert', originCert);

      // 3. Post the batch
      const batchResponse = await API.post(
        '/batches',
        batchData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { batch_id, created_at } = batchResponse.data;
      const createdAtLocal = new Date(created_at).toLocaleString(undefined, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

      setMessage(
        `Gold batch registered successfully! Assigned ID: ${batch_id}. ` +
        `Registered at ${createdAtLocal}`
      );

      // Scroll to top so user sees the message
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // 4. Reset form fields
      setFormData({
        mine_id: '',
        date_collected: '',
        weight_kg: '',
      });
      setNewMineName('');
      setNewMineType('');
      setNewMineLocation('');
      setNewMineLicense('');
      setIsCreatingNew(false);
      setOriginCert(null);

      // Clear file input by ID
      document.getElementById('origin_cert').value = '';
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.error || 'Error registering batch.';
      setError(serverMsg);
      // Also scroll to top if there's an error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => navigate('/dashboard');

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        minHeight: '100vh',
        width: '100vw',
        margin: 0,
        background: 'linear-gradient(135deg, #fffbe6 0%, #b99651 100%)',
        padding: 0,
        overflowX: 'hidden',
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
              color: '#b99651',
              textShadow: '2px 2px 4px rgba(0,0,0,0.13)',
              margin: 0,
              fontSize: '2.2rem',
              fontWeight: 700,
              width: '100%',
              textAlign: 'center',
              marginLeft: '12.5rem', // <-- Add this line or increase as needed
            }}
          >
            Register Gold Batch
          </h1>
          <button
            className="btn btn-secondary"
            style={{
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              minWidth: '200px',
              height: '40px',
              alignSelf: 'center',
              marginTop: '1.5rem',
            }}
            onClick={goBack}
          >
            Back to Dashboard
          </button>
        </div>

        <div
          className="shadow-lg rounded-4 p-4 mx-auto"
          style={{
            background: 'rgba(255,255,255,0.97)',
            maxWidth: 520,
            width: '100%',
          }}
        >
          <h2
            className="mb-4 d-none"
            style={{ color: '#b99651', textAlign: 'center', fontWeight: 700 }}
          >
            Register Gold Batch
          </h2>

          {message && <div className="alert alert-success text-center">{message}</div>}
          {error && <div className="alert alert-danger text-center">{error}</div>}

          <form onSubmit={handleSubmit} className="row g-3">
            {/* Select existing mine OR create new */}
            <div className="col-12">
              <label htmlFor="mine_id" className="form-label fw-semibold">
                Mine
              </label>
              <select
                id="mine_id"
                name="mine_id"
                className="form-select"
                value={isCreatingNew ? 'new' : formData.mine_id}
                onChange={handleChange}
                required={!isCreatingNew}
              >
                <option value="">Select Mine</option>
                {mines.map((mine) => (
                  <option key={mine.id} value={mine.id}>
                    {mine.name} {mine.location ? `(${mine.location})` : ''}
                  </option>
                ))}
                <option value="new">➕ Add new mine</option>
              </select>
            </div>

            {/* If "Add new mine" is chosen, show inputs for all required new mine fields */}
            {isCreatingNew && (
              <>
                <div className="col-12">
                  <label htmlFor="newMineName" className="form-label fw-semibold">
                    New Mine Name
                  </label>
                  <input
                    type="text"
                    id="newMineName"
                    name="newMineName"
                    className="form-control"
                    placeholder="e.g., Obuasi Main Pit"
                    value={newMineName}
                    onChange={handleNewMineFieldChange}
                    required={isCreatingNew}
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="newMineType" className="form-label fw-semibold">
                    New Mine Type
                  </label>
                  <input
                    type="text"
                    id="newMineType"
                    name="newMineType"
                    className="form-control"
                    placeholder="e.g., ASM, LSM"
                    value={newMineType}
                    onChange={handleNewMineFieldChange}
                    required={isCreatingNew}
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="newMineLocation" className="form-label fw-semibold">
                    New Mine Location
                  </label>
                  <input
                    type="text"
                    id="newMineLocation"
                    name="newMineLocation"
                    className="form-control"
                    placeholder="e.g., Obuasi"
                    value={newMineLocation}
                    onChange={handleNewMineFieldChange}
                    required={isCreatingNew}
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="newMineLicense" className="form-label fw-semibold">
                    New Mine License Number
                  </label>
                  <input
                    type="text"
                    id="newMineLicense"
                    name="newMineLicense"
                    className="form-control"
                    placeholder="e.g., LIC-12345"
                    value={newMineLicense}
                    onChange={handleNewMineFieldChange}
                    required={isCreatingNew}
                  />
                </div>
              </>
            )}

            {/* Date Collected */}
            <div className="col-12">
              <label htmlFor="date_collected" className="form-label fw-semibold">
                Date Collected
              </label>
              <input
                type="date"
                id="date_collected"
                name="date_collected"
                className="form-control"
                value={formData.date_collected}
                onChange={handleChange}
                required
              />
            </div>

            {/* Weight (kg) */}
            <div className="col-12">
              <label htmlFor="weight_kg" className="form-label fw-semibold">
                Weight (kg)
              </label>
              <input
                type="number"
                id="weight_kg"
                name="weight_kg"
                className="form-control"
                value={formData.weight_kg}
                onChange={handleChange}
                placeholder="e.g., 12.5"
                step="0.01"
                required
              />
            </div>

            {/* Origin Certificate Image */}
            <div className="col-12">
              <label htmlFor="origin_cert" className="form-label fw-semibold">
                Origin Certificate Image
              </label>
              <input
                type="file"
                id="origin_cert"
                name="origin_cert"
                className="form-control"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>

            <div className="col-12 d-flex justify-content-between mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={goBack}
                disabled={submitting}
              >
                Back to Dashboard
              </button>
              <button
                type="submit"
                className="btn btn-warning px-4"
                style={{ fontWeight: 600 }}
                disabled={submitting}
              >
                Submit Batch
              </button>
            </div>
          </form>

          {/* Loading overlay */}
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
      </div>
    </div>
  );
}

export default RegisterBatchPage;
