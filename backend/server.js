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
const activeBookings = new Set(); 
let allBookings = []; 
let waitlistQueue = []; // FIFO Queue data structure for the waitlist

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

    allBookings.forEach(booking => {
      activeBookings.add(`${booking.employeeId}_${booking.date}`);
    });

    console.log(`[DATA] Loaded ${employeeMap.size} employees, ${allBookings.length} bookings, and ${waitlistQueue.length} on waitlist.`);
  } catch (error) {
    console.error('[ERROR] Failed to load data files:', error);
  }
}

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

// UPGRADED: Only returns bookings for today or in the future
app.get('/api/bookings/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const today = new Date().toISOString().split('T')[0];
  
  const userBookings = allBookings.filter(
    b => b.employeeId === employeeId && b.date >= today
  );
  res.status(200).json({ bookings: userBookings });
});

app.post('/api/book', async (req, res) => {
  const { employeeId, row, col, date } = req.body;
  const bookingDate = date || new Date().toISOString().split('T')[0];
  const bookingKey = `${employeeId}_${bookingDate}`;

  if (activeBookings.has(bookingKey)) {
    return res.status(409).json({ error: 'You already have a booking for this date.' });
  }

  const spaceTaken = allBookings.some(b => b.date === bookingDate && b.row === row && b.col === col);
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
    return res.status(500).json({ error: 'Failed to save booking.' });
  }
});

// NEW: Cancel a booking and automatically process the waitlist Queue
app.post('/api/cancel', async (req, res) => {
  const { employeeId, date } = req.body;
  const bookingKey = `${employeeId}_${date}`;

  // 1. Remove the booking
  const bookingIndex = allBookings.findIndex(b => b.employeeId === employeeId && b.date === date);
  if (bookingIndex === -1) return res.status(404).json({ error: 'Booking not found.' });

  const cancelledBooking = allBookings[bookingIndex];
  allBookings.splice(bookingIndex, 1);
  activeBookings.delete(bookingKey);

  // 2. FIFO Queue Logic: Check if anyone is waiting for this date
  const queueIndex = waitlistQueue.findIndex(w => w.date === date);
  if (queueIndex !== -1) {
    // Dequeue (shift) the first person in line
    const nextInLine = waitlistQueue.splice(queueIndex, 1)[0];
    
    // Automatically assign them the newly freed space
    const newBooking = {
      employeeId: nextInLine.employeeId,
      row: cancelledBooking.row,
      col: cancelledBooking.col,
      date: date
    };
    allBookings.push(newBooking);
    activeBookings.add(`${nextInLine.employeeId}_${date}`);
    console.log(`[QUEUE] Assigned freed space to ${nextInLine.employeeId} from waitlist.`);
  }

  // 3. Save updated arrays to ledger
  try {
    const ledgerPath = path.join(__dirname, 'data', 'ledger.json');
    const ledgerData = JSON.parse(await fs.readFile(ledgerPath, 'utf-8'));
    ledgerData.bookings = allBookings;
    ledgerData.waitlist = waitlistQueue;
    await fs.writeFile(ledgerPath, JSON.stringify(ledgerData, null, 2));

    return res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save changes.' });
  }
});

// NEW: Add a user to the waitlist Queue
app.post('/api/waitlist', async (req, res) => {
  const { employeeId, date } = req.body;
  
  if (activeBookings.has(`${employeeId}_${date}`)) {
    return res.status(409).json({ error: 'You already have a booking for this date.' });
  }
  
  const alreadyWaiting = waitlistQueue.some(w => w.employeeId === employeeId && w.date === date);
  if (alreadyWaiting) {
    return res.status(409).json({ error: 'You are already on the waitlist.' });
  }

  // Enqueue (push) to the end of the line
  waitlistQueue.push({ employeeId, date }); 

  try {
    const ledgerPath = path.join(__dirname, 'data', 'ledger.json');
    const ledgerData = JSON.parse(await fs.readFile(ledgerPath, 'utf-8'));
    ledgerData.waitlist = waitlistQueue;
    await fs.writeFile(ledgerPath, JSON.stringify(ledgerData, null, 2));
    return res.status(200).json({ message: 'Added to waitlist' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to join waitlist.' });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
  loadData();
});