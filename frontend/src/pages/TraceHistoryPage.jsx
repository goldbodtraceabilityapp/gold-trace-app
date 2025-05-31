// src/pages/TraceHistoryPage.jsx
import React from 'react';

function TraceHistoryPage() {
  return (
    <div className="container my-5" style={{ maxWidth: '800px' }}>
      <h2 style={{ color: '#b99651', textAlign: 'center' }}>Trace History</h2>
      <p className="text-center">This page will list all registered gold batches.</p>
      {/* Later, you’ll fetch and show a table of batches here */}
    </div>
  );
}

export default TraceHistoryPage;
