import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Create an HTTPS agent that ignores SSL verification
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

// Proxy endpoint to access League client data
app.get('/liveclientdata/allgamedata', async (req, res) => {
    try {
        // Note: This URL only works locally; it will fail on Render since Render can’t access your local League client.
        const response = await fetch('https://127.0.0.1:2999/liveclientdata/allgamedata', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            agent: httpsAgent,
        });

        if (!response.ok) {
            console.error('Error fetching data from League client:', response.status, response.statusText);
            return res.status(response.status).json({ error: 'Failed to fetch game data from League client' });
        }

        const data = await response.json();
        console.log('Data received from League Client:', data);

        // Send the data to the client
        res.json(data);
    } catch (error) {
        console.error('Error in proxy server:', error);
        res.status(500).json({ error: 'Failed to fetch game data from proxy server' });
    }
});

app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
});
// Middleware to serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Example route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Proxy server running on http://localhost:${port}`);
});
