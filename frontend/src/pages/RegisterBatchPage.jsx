// src/pages/RegisterBatchPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function RegisterBatchPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    batchId: '',
    location: '',
    weight: '',
    supplier: '',
    dateMined: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const res = await API.post('/batches', formData);
      setMessage('Gold batch registered successfully!');
      setFormData({
        batchId: '',
        location: '',
        weight: '',
        supplier: '',
        dateMined: '',
      });
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Error registering batch.';
      setError(serverMsg);
    }
  };

  const goBack = () => {
    navigate('/dashboard');
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        minHeight: '100vh',
        width: '100vw',           // Ensure full viewport width
        margin: 0,                // Remove default margin
        background: 'linear-gradient(135deg, #fffbe6 0%, #b99651 100%)',
        padding: 0,
        overflowX: 'hidden'       // Prevent horizontal scroll
      }}
    >
      <div
        className="shadow-lg rounded-4 p-4"
        style={{
          background: 'rgba(255,255,255,0.97)',
          maxWidth: 480,
          width: '100%',
        }}
      >
        <h2 className="mb-4" style={{ color: '#b99651', textAlign: 'center', fontWeight: 700 }}>
          Register Gold Batch
        </h2>

        {message && (
          <div className="alert alert-success text-center">{message}</div>
        )}
        {error && (
          <div className="alert alert-danger text-center">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-12">
            <label htmlFor="batchId" className="form-label fw-semibold">
              Batch ID
            </label>
            <input
              type="text"
              id="batchId"
              name="batchId"
              className="form-control"
              value={formData.batchId}
              onChange={handleChange}
              placeholder="e.g., GH-0010"
              required
            />
          </div>

          <div className="col-12">
            <label htmlFor="location" className="form-label fw-semibold">
              Location (Mine)
            </label>
            <input
              type="text"
              id="location"
              name="location"
              className="form-control"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Tarkwa"
              required
            />
          </div>

          <div className="col-12">
            <label htmlFor="weight" className="form-label fw-semibold">
              Weight (kg)
            </label>
            <input
              type="number"
              id="weight"
              name="weight"
              className="form-control"
              value={formData.weight}
              onChange={handleChange}
              placeholder="e.g., 12.5"
              step="0.01"
              required
            />
          </div>

          <div className="col-12">
            <label htmlFor="supplier" className="form-label fw-semibold">
              Supplier
            </label>
            <input
              type="text"
              id="supplier"
              name="supplier"
              className="form-control"
              value={formData.supplier}
              onChange={handleChange}
              placeholder="e.g., GoldMiners Co."
              required
            />
          </div>

          <div className="col-12">
            <label htmlFor="dateMined" className="form-label fw-semibold">
              Date Mined
            </label>
            <input
              type="date"
              id="dateMined"
              name="dateMined"
              className="form-control"
              value={formData.dateMined}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-12 d-flex justify-content-between mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={goBack}
            >
              Back to Dashboard
            </button>
            <button type="submit" className="btn btn-warning px-4" style={{ fontWeight: 600 }}>
              Submit Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterBatchPage;
