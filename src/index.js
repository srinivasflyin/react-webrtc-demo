// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';  // Import ReactDOM from 'react-dom/client' for React 18+
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App';
import Meeting from './meeting';

// Create a root for React 18
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the app using the root object
root.render(
  <Router>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/meeting/:meetingId" element={<Meeting />} />
    </Routes>
  </Router>
);
