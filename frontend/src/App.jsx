import React, { useState, useEffect } from 'react';
import api from './api';

function App() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [grid, setGrid] = useState([]);
  const [bookingMessage, setBookingMessage] = useState('');
  
  // Default to today's date
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [myBookings, setMyBookings] = useState([]);

  // Fetch grid based on selected date
  useEffect(() => {
    if (user) {
      const fetchGrid = async () => {
        try {
          const response = await api.get(`/grid?date=${selectedDate}`);
          setGrid(response.data.grid);
        } catch (err) {
          console.error('Failed to fetch grid:', err);
        }
      };
      fetchGrid();
    }
  }, [user, selectedDate]);

  // Fetch user's personal booking list
  const fetchMyBookings = async () => {
    if (user) {
      try {
        const response = await api.get(`/bookings/${user.id}`);
        setMyBookings(response.data.bookings);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      }
    }
  };

  // Refresh bookings list when user logs in or date changes
  useEffect(() => {
    fetchMyBookings();
  }, [user, selectedDate]);

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

  const handleBookSpace = async (row, col) => {
    if (grid[row][col] !== null) return; 
    
    try {
      const response = await api.post('/book', { 
        employeeId: user.id, 
        row, 
        col,
        date: selectedDate
      });
      
      setGrid(response.data.grid);
      setBookingMessage('Booking confirmed!');
      setError('');
      fetchMyBookings(); // Update the sidebar list immediately
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to book space.');
      setBookingMessage('');
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
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
        <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
          
          {/* LEFT SIDE: Grid and Booking */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h3>Welcome, {user.name}</h3>
            <p><strong>Department:</strong> {user.department} | <strong>Vehicle Reg:</strong> {user.vehicleReg}</p>
            
            <h4 style={{ marginTop: '30px' }}>Select Date</h4>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setBookingMessage('');
                setError('');
              }} 
              style={{ padding: '8px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px' }}
            />

            <h4>Live Parking Availability</h4>
            
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

          {/* RIGHT SIDE: My Bookings */}
          <div style={{ flex: '1', minWidth: '250px', padding: '20px', background: '#f9f9f9', borderRadius: '8px', height: 'fit-content' }}>
            <h3 style={{ marginTop: 0 }}>My Bookings</h3>
            {myBookings.length === 0 ? (
              <p>No upcoming bookings.</p>
            ) : (
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {myBookings.map((b, index) => (
                  <li key={index} style={{ marginBottom: '10px', padding: '10px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <strong>Date:</strong> {b.date} <br/>
                    <strong>Space:</strong> Row {b.row}, Col {b.col}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default App;