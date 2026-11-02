import axios from 'axios';

// Base client pointing to your local Node.js server
const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;