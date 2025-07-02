// Version 2 - force new build
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // ✅ React Router
import App from './App.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';     // ✅ Bootstrap
import './index.css';                              // Optional custom styles

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
