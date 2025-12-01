import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('logs'); 

  // --- LOGIN COMPONENT ---
  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:3000/api/login', { password });
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin} className="btn-primary">Access Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="brand">🛡️ Sentinel System</div>
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
          <button onClick={() => setIsLoggedIn(false)} className="nav-btn btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="content-wrapper">
        <div className="card">
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
      const res = await axios.get('http://localhost:3000/api/logs');
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
    <div>
      <h2 style={{marginTop: 0, marginBottom: '20px'}}>Access Entry Logs</h2>
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
              <td style={{color: '#6b7280', fontSize: '0.9rem'}}>{log.timestamp}</td>
              <td>
                {log.image ? (
                  <img 
                    src={`http://localhost:3000/uploads/${log.image}`} 
                    alt="evidence" 
                    width="50"
                    height="50"
                    className="evidence-img"
                    style={{objectFit: 'cover'}}
                  />
                ) : <span style={{color:'#ccc'}}>No Img</span>}
              </td>
              <td style={{fontWeight: '500'}}>{log.name}</td>
              <td>
                <span className={`badge ${log.name === 'Unknown' ? 'badge-intruder' : 'badge-verified'}`}>
                  {log.name === 'Unknown' ? '⚠️ INTRUDER' : '✓ Verified'}
                </span>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan="4" style={{textAlign:'center', padding:'30px', color:'#999'}}>
                No logs found yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- SUB-COMPONENT: REGISTRATION FORM ---
function RegistrationForm() {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !file) return alert("Please fill all fields");

    const formData = new FormData();
    formData.append('studentName', name);
    formData.append('photo', file);

    try {
      await axios.post('http://localhost:3000/api/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Success! Please restart the Python script to apply changes.");
      setName('');
      setFile(null);
    } catch (err) {
      alert("Error uploading file");
    }
  };

  return (
    <div className="form-wrapper">
      <h2 style={{marginTop: 0, borderBottom:'1px solid #eee', paddingBottom:'15px'}}>Register New Student</h2>
      <form onSubmit={handleSubmit} style={{marginTop: '20px'}}>
        <div className="form-group">
          <label>Student Name / ID</label>
          <input 
            type="text" 
            placeholder="Ex: John Doe"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Face Reference Photo</label>
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])} 
            accept="image/*"
            style={{padding: '10px 0'}}
          />
          <p style={{fontSize:'0.8rem', color:'#666', marginTop:'-10px'}}>
            * Please upload a clear front-facing photo.
          </p>
        </div>
        <button type="submit" className="btn-primary" style={{marginTop: '10px'}}>
          Save Registration
        </button>
      </form>
    </div>
  );
}

export default App;