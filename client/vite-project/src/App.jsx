import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 👇 REPLACE THIS WITH YOUR ACTUAL VERCEL LINK
const API_URL = 'https://hostel-security-flax.vercel.app'; 

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Security Admin</h2>
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            onClick={handleLogin} 
            className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition duration-200"
          >
            Access Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4 md:mb-0">
          <span>🛡️</span> Sentinel System
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('logs')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'logs' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📋 Logs History
          </button>
          <button 
            onClick={() => setActiveTab('register')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'register' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            👤 Register Student
          </button>
          <button 
            onClick={() => setIsLoggedIn(false)} 
            className="px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Access Entry Logs</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-4 text-sm font-semibold text-gray-600 bg-gray-50 first:rounded-tl-lg">Timestamp</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-600 bg-gray-50">Evidence</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-600 bg-gray-50">Identity</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-600 bg-gray-50 last:rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-sm text-gray-500">{log.timestamp}</td>
                <td className="py-3 px-4">
                  {/* UPDATED: Renders Base64 Image from MongoDB */}
                  {log.imageData ? (
                    <img 
                      src={`data:${log.contentType};base64,${log.imageData}`} 
                      alt="evidence" 
                      className="w-12 h-12 object-cover rounded shadow-sm border border-gray-200"
                    />
                  ) : <span className="text-xs text-gray-400 italic">No Img</span>}
                </td>
                <td className="py-3 px-4 font-medium text-gray-800">{log.name}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.name === 'Unknown' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {log.name === 'Unknown' ? '⚠️ INTRUDER' : '✓ Verified'}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-12 text-gray-400">
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
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Register New Student</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Student Name / ID</label>
          <input 
            type="text" 
            placeholder="Ex: John Doe"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Face Reference Photo</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors cursor-pointer relative">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>{file ? file.name : "Upload a file"}</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files[0])} accept="image/*" />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Please upload a clear front-facing photo for accurate recognition.
          </p>
        </div>

        <button 
          type="submit" 
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          ) : "Save Registration"}
        </button>
      </form>
    </div>
  );
}

export default App;