import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const employeeMap = new Map(); 
const activeBookings = new Set(); // Key format: "employeeId_YYYY-MM-DD"
let allBookings = []; 
let waitlistQueue = []; 

async function loadData() {
  try {
    const empPath = path.join(__dirname, 'data', 'employees.json');
    const empData = await fs.readFile(empPath, 'utf-8');
    JSON.parse(empData).forEach((emp) => employeeMap.set(emp.id, emp));

    const ledgerPath = path.join(__dirname, 'data', 'ledger.json');
    const ledgerData = await fs.readFile(ledgerPath, 'utf-8');
    const ledger = JSON.parse(ledgerData);
    
    waitlistQueue = ledger.waitlist || [];
    allBookings = ledger.bookings || [];

    // Store active bookings using composite key for date checks
    allBookings.forEach(booking => {
      activeBookings.add(`${booking.employeeId}_${booking.date}`);
    });

    console.log(`[DATA] Loaded ${employeeMap.size} employees and ${allBookings.length} total bookings.`);
  } catch (error) {
    console.error('[ERROR] Failed to load data files:', error);
  }
}

// POST /api/login
app.post('/api/login', (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ error: 'ID and Password required' });

  const employee = employeeMap.get(id);
  if (!employee || employee.password !== password) {
    return res.status(401).json({ error: 'Invalid ID or password' });
  }

  const { password: _, ...userProfile } = employee;
  return res.status(200).json({ user: userProfile });
});

// GET /api/grid?date=YYYY-MM-DD
app.get('/api/grid', (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const grid = Array(5).fill().map(() => Array(5).fill(null));

  allBookings.forEach(booking => {
    if (booking.date === targetDate) {
      grid[booking.row][booking.col] = booking;
    }
  });

  res.status(200).json({ grid });
});

// GET /api/bookings/:employeeId
app.get('/api/bookings/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const userBookings = allBookings.filter(b => b.employeeId === employeeId);
  res.status(200).json({ bookings: userBookings });
});

// POST /api/book
app.post('/api/book', async (req, res) => {
  const { employeeId, row, col, date } = req.body;
  const bookingDate = date || new Date().toISOString().split('T')[0];
  const bookingKey = `${employeeId}_${bookingDate}`;

  // HTTP 409: Duplicate booking check for specific date
  if (activeBookings.has(bookingKey)) {
    return res.status(409).json({ error: 'You already have a booking for this date.' });
  }

  // Check space availability on specific date
  const spaceTaken = allBookings.some(
    b => b.date === bookingDate && b.row === row && b.col === col
  );
  if (spaceTaken) {
    return res.status(400).json({ error: 'Space is already occupied on this date.' });
  }

  const newBooking = { employeeId, row, col, date: bookingDate };
  allBookings.push(newBooking);
  activeBookings.add(bookingKey);

  try {
    const ledgerPath = path.join(__dirname, 'data', 'ledger.json');
    const ledgerData = JSON.parse(await fs.readFile(ledgerPath, 'utf-8'));
    ledgerData.bookings = allBookings;
    await fs.writeFile(ledgerPath, JSON.stringify(ledgerData, null, 2));

    const grid = Array(5).fill().map(() => Array(5).fill(null));
    allBookings.filter(b => b.date === bookingDate).forEach(b => {
      grid[b.row][b.col] = b;
    });

    return res.status(200).json({ message: 'Booking confirmed', grid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save booking.' });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
  loadData();
});