import React, { useState } from 'react';
import api from './api';

function App() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/login', { id: employeeId, password });
      console.log("Server response:", response.data); // Let's peek at the data
      
      // Try to catch the data regardless of what the backend named it
      setUser(response.data.employee || response.data.user || response.data); 
      setError('');
    } catch (err) {
      setError('Invalid Employee ID or password. Please try again.');
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Lloyds Car Park Portal</h2>
      {!user ? (
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label>Employee ID</label><br />
            <input 
              type="text" 
              value={employeeId} 
              onChange={(e) => setEmployeeId(e.target.value)} 
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required 
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Password</label><br />
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required 
            />
          </div>
          <button type="submit" style={{ padding: '10px 15px', background: '#00539f', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Login
          </button>
          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        </form>
      ) : (
        <div>
          <h3>Welcome, {user.name}</h3>
          <p><strong>Department:</strong> {user.department}</p>
          <p><strong>Vehicle Reg:</strong> {user.vehicleReg}</p>
          <p style={{ color: 'green', marginTop: '15px' }}>Successfully authenticated!</p>
        </div>
      )}
    </div>
  );
}

export default App;