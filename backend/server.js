import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to resolve directory paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// In-Memory Data Structure: Map for O(1) Employee Lookup
const employeeMap = new Map();

/**
 * Reads employees.json and populates the JavaScript Map data structure.
 * Satisfies the File Handling and Data Structure requirements.
 */
async function loadEmployees() {
  try {
    const filePath = path.join(__dirname, 'data', 'employees.json');
    const rawData = await fs.readFile(filePath, 'utf-8');
    const employeeArray = JSON.parse(rawData);

    // Populate Map with Employee ID as Key
    employeeArray.forEach((employee) => {
      employeeMap.set(employee.id, employee);
    });

    console.log(`[DATA] Successfully loaded ${employeeMap.size} employees into Map.`);
  } catch (error) {
    console.error('[ERROR] Failed to read employees.json file:', error);
  }
}

// -------------------------------------------------------------
// API ENDPOINT 1: POST /api/login
// Handles User Authentication & Validation
// -------------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { id, password } = req.body;

  // Input Validation: Check for missing fields
  if (!id || !password) {
    return res.status(400).json({ 
      error: 'Input error: Employee ID and Password are required.' 
    });
  }

  // Data Retrieval: Fast lookup from Map using Employee ID
  const employee = employeeMap.get(id);

  // Error Handling: Invalid credentials or unregistered ID
  if (!employee || employee.password !== password) {
    return res.status(401).json({ 
      error: 'Authentication failed: Invalid Employee ID or Password.' 
    });
  }

  // Sanitize Output: Return user profile without leaking raw password
  const { password: _, ...userProfile } = employee;

  return res.status(200).json({
    message: 'Login successful',
    user: userProfile
  });
});

// Start Server & Load Initial Data
app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
  loadEmployees();
});