import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000; // Ensure we use Render's provided port

app.use(cors());

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

app.get('/liveclientdata/allgamedata', async (req, res) => {
    try {
        const response = await fetch('https://127.0.0.1:2999/liveclientdata/allgamedata', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            agent: httpsAgent,
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch game data from League client' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch game data from proxy server' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
