import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // Make sure this import is present

// Smart URL Handling
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://hostel-security-flax.vercel.app'; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('logs'); 

  // --- LOGIN COMPONENT ---
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/login`, { password });
      if (res.data.success) setIsLoggedIn(true);
    } catch (err) {
      alert("Wrong Password!");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2>Security Admin</h2>
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin} className="btn-primary full-width">
            Access Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <span>🛡️</span> Sentinel System
        </div>
        <div className="nav-actions">
          <button 
            onClick={() => setActiveTab('logs')} 
            className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
          >
            📋 Logs History
          </button>
          <button 
            onClick={() => setActiveTab('register')} 
            className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`}
          >
            👤 Register Student
          </button>
          <button 
            onClick={() => setIsLoggedIn(false)} 
            className="nav-btn logout"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-card">
          {activeTab === 'logs' ? <LogsTable /> : <RegistrationForm />}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: LOGS TABLE ---
function LogsTable() {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/logs`);
      setLogs(res.data);
    } catch (error) {
      console.error("Error fetching logs", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="table-wrapper">
      <h2 className="section-title">Access Entry Logs</h2>
      <div className="table-scroll">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Evidence</th>
              <th>Identity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td className="text-gray">{log.timestamp}</td>
                <td>
                  {log.imageData ? (
                    <img 
                      src={`data:${log.contentType};base64,${log.imageData}`} 
                      alt="evidence" 
                      className="log-img"
                    />
                  ) : <span className="no-img">No Img</span>}
                </td>
                <td className="font-bold">{log.name}</td>
                <td>
                  <span className={`badge ${log.name === 'Unknown' ? 'badge-danger' : 'badge-success'}`}>
                    {log.name === 'Unknown' ? '⚠️ INTRUDER' : '✓ Verified'}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="4" className="empty-state">
                  No logs found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: REGISTRATION FORM ---
function RegistrationForm() {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !file) return alert("Please fill all fields");

    setIsLoading(true);
    const formData = new FormData();
    formData.append('studentName', name);
    formData.append('photo', file);

    try {
      await axios.post(`${API_URL}/api/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("✅ Success! Student registered in Cloud DB.");
      setName('');
      setFile(null);
    } catch (err) {
      alert("❌ Error uploading file. Check console.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-wrapper">
      <h2 className="section-title">Register New Student</h2>
      <form onSubmit={handleSubmit} className="reg-form">
        <div className="form-group">
          <label>Student Name / ID</label>
          <input 
            type="text" 
            placeholder="Ex: John Doe"
            className="form-input"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>
        
        <div className="form-group">
          <label>Face Reference Photo</label>
          <div className="upload-box">
            <div className="upload-content">
              <span className="upload-icon">📷</span>
              <label htmlFor="file-upload" className="file-label">
                <span>{file ? file.name : "Click to Upload Photo"}</span>
                <input id="file-upload" type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*" />
              </label>
              <p className="upload-hint">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
          <p className="upload-note">
            * Please upload a clear front-facing photo.
          </p>
        </div>

        <button 
          type="submit" 
          className="btn-primary full-width"
          disabled={isLoading}
        >
          {isLoading ? "Uploading..." : "Save Registration"}
        </button>
      </form>
    </div>
  );
}

export default App;