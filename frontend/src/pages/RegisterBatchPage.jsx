// src/pages/RegisterBatchPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function RegisterBatchPage() {
  const navigate = useNavigate();
  const [mines, setMines] = useState([]);
  const [formData, setFormData] = useState({
    batch_id: '',
    mine_id: '',
    date_collected: '',
    weight_kg: '',
  });
  const [originCert, setOriginCert] = useState(null);
  const [dealerLicense, setDealerLicense] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch mines for dropdown
  useEffect(() => {
    API.get('/mines')
      .then(res => setMines(res.data))
      .catch(() => setMines([]));
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === 'origin_cert') setOriginCert(files[0]);
    if (name === 'dealer_license') setDealerLicense(files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('batch_id', formData.batch_id);
      data.append('mine_id', formData.mine_id);
      data.append('date_collected', formData.date_collected);
      data.append('weight_kg', formData.weight_kg);
      if (originCert) data.append('origin_cert', originCert);
      if (dealerLicense) data.append('dealer_license', dealerLicense);

      await API.post('/batches', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage('Gold batch registered successfully!');
      setFormData({
        batch_id: '',
        mine_id: '',
        date_collected: '',
        weight_kg: '',
      });
      setOriginCert(null);
      setDealerLicense(null);
      // Optionally reset file inputs
      document.getElementById('origin_cert').value = '';
      document.getElementById('dealer_license').value = '';
    } catch (err) {
      const serverMsg = err.response?.data?.error || 'Error registering batch.';
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
        width: '100vw',
        margin: 0,
        background: 'linear-gradient(135deg, #fffbe6 0%, #b99651 100%)',
        padding: 0,
        overflowX: 'hidden'
      }}
    >
      <div
        className="shadow-lg rounded-4 p-4"
        style={{
          background: 'rgba(255,255,255,0.97)',
          maxWidth: 520,
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
          {/* Batch ID */}
          <div className="col-12">
            <label htmlFor="batch_id" className="form-label fw-semibold">
              Batch ID
            </label>
            <input
              type="text"
              id="batch_id"
              name="batch_id"
              className="form-control"
              value={formData.batch_id}
              onChange={handleChange}
              placeholder="e.g., GH-0010"
              required
            />
          </div>

          {/* Mine */}
          <div className="col-12">
            <label htmlFor="mine_id" className="form-label fw-semibold">
              Mine
            </label>
            <select
              id="mine_id"
              name="mine_id"
              className="form-select"
              value={formData.mine_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Mine</option>
              {mines.map((mine) => (
                <option key={mine.id} value={mine.id}>
                  {mine.name} {mine.location ? `(${mine.location})` : ''}
                </option>
              ))}
            </select>
          </div>

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

          {/* Dealer License Image */}
          <div className="col-12">
            <label htmlFor="dealer_license" className="form-label fw-semibold">
              Dealer License Image
            </label>
            <input
              type="file"
              id="dealer_license"
              name="dealer_license"
              className="form-control"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
          </div>

          {/* Purity (%) and Assay Report Info */}
          <div className="col-12">
            <label className="form-label fw-semibold">
              Purity (%) & Assay Report
            </label>
            <div className="alert alert-info py-2 mb-2" style={{ fontSize: '0.98rem' }}>
              <strong>Note:</strong> Purity (%) and the official Assay Report PDF will be provided by <b>Goldbod</b> (formerly PMMC) after your batch is registered. You do not need to upload these now.
            </div>
          </div>

          {/* Assay Report PDF (disabled) */}
          <div className="col-12">
            <label htmlFor="assay_report_pdf" className="form-label fw-semibold">
              Assay Report PDF (upload after batch creation)
            </label>
            <input
              type="file"
              id="assay_report_pdf"
              name="assay_report_pdf"
              className="form-control"
              accept="application/pdf"
              disabled
              title="Upload after batch creation"
            />
            <div className="form-text">
              You can upload the assay report and purity % after batch creation, when provided by Goldbod.
            </div>
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
