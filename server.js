import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import https from 'https';

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Create an HTTPS agent that ignores SSL verification
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

// Proxy endpoint to access League client data
app.get('/liveclientdata/allgamedata', async (req, res) => {
    try {
        // Fetch data from the League client, using the HTTPS agent to ignore SSL verification
        const response = await fetch('https://127.0.0.1:2999/liveclientdata/allgamedata', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            agent: httpsAgent, // Use the agent here
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

// Start the server
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
