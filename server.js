// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';
import apiRoutes from './routes/api.js'; // Import the API routes

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Use API routes
app.use('/api', apiRoutes); // Use the router for all /api routes

// Serve static files - this should come after API routes
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  - GET /api/test');
    console.log('  - GET /api/puuid');
    console.log('  - GET /api/match-stats');
    console.log('  - GET /api/liveclientdata/allgamedata');
});
