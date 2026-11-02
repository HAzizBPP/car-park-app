import React, { useState, useEffect } from 'react';
import api from './api';

function App() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [grid, setGrid] = useState([]);
  const [bookingMessage, setBookingMessage] = useState('');

  // Automatically fetch the grid data once the user logs in
  useEffect(() => {
    if (user) {
      const fetchGrid = async () => {
        try {
          const response = await api.get('/grid');
          setGrid(response.data.grid);
        } catch (err) {
          console.error('Failed to fetch grid:', err);
        }
      };
      fetchGrid();
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/login', { id: employeeId, password });
      setUser(response.data.user || response.data.employee || response.data);
      setError('');
    } catch (err) {
      setError('Invalid Employee ID or password. Please try again.');
    }
  };

  // Handles clicking a space to book it
  const handleBookSpace = async (row, col) => {
    if (grid[row][col] !== null) return; // Ignore clicks on occupied spaces
    
    try {
      const response = await api.post('/book', { 
        employeeId: user.id, 
        row, 
        col 
      });
      
      // Update grid with the new layout and show success message
      setGrid(response.data.grid);
      setBookingMessage('Booking confirmed!');
      setError(''); // Clear any previous errors
    } catch (err) {
      // This catches the 409 Conflict duplicate error from your backend
      setError(err.response?.data?.error || 'Failed to book space.');
      setBookingMessage('');
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Lloyds Car Park Portal</h2>
      
      {!user ? (
        <form onSubmit={handleLogin} style={{ maxWidth: '400px' }}>
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
          <p><strong>Department:</strong> {user.department} | <strong>Vehicle Reg:</strong> {user.vehicleReg}</p>
          
          <h4 style={{ marginTop: '30px' }}>Live Parking Availability</h4>
          
          {/* Feedback messages for the user */}
          {bookingMessage && <p style={{ color: 'green', fontWeight: 'bold' }}>{bookingMessage}</p>}
          {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(5, 60px)', 
            gap: '10px', 
            marginTop: '15px' 
          }}>
            {grid.map((row, rowIndex) => 
              row.map((cell, colIndex) => (
                <div 
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleBookSpace(rowIndex, colIndex)}
                  style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: cell ? '#d9534f' : '#5cb85c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    cursor: cell ? 'not-allowed' : 'pointer'
                  }}
                  title={cell ? 'Occupied' : 'Click to book'}
                >
                  {cell ? 'X' : `${rowIndex},${colIndex}`}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;