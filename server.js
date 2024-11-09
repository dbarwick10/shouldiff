// server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

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

const RIOT_API_KEY = process.env.RIOT_API_KEY;
if (!RIOT_API_KEY) {
    console.error('RIOT_API_KEY not found in environment variables');
    process.exit(1);
}

// Test endpoint to verify API is working
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
});

// PUUID endpoint
app.get('/api/puuid', async (req, res) => {
    console.log('Received request for PUUID:', req.query);
    const { summonerName, region, tagline } = req.query;

    if (!summonerName) {
        return res.status(400).json({ error: 'Missing summonerName parameter' });
    }

    try {
        const riotUrl = `https://${encodeURIComponent(region)}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(summonerName)}/${encodeURIComponent(tagline)}`;
        console.log('Fetching from Riot API:', riotUrl);

        const puuidResponse = await fetch(
            `${riotUrl}?api_key=${RIOT_API_KEY}`
        );

        console.log('Riot API response status:', puuidResponse.status);

        if (!puuidResponse.ok) {
            const errorText = await puuidResponse.text();
            console.error('Riot API error:', errorText);
            return res.status(puuidResponse.status).json({ 
                error: 'Riot API error', 
                details: errorText 
            });
        }

        const puuidData = await puuidResponse.json();
        console.log('PUUID data:', puuidData);
        res.json(puuidData);
    } catch (error) {
        console.error('Server error in /api/puuid:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Match stats endpoint
app.get('/api/match-stats', async (req, res) => {
    console.log('Received request for match stats:', req.query);
    const { puuid, region } = req.query;

    if (!puuid) {
        return res.status(400).json({ error: 'Missing puuid parameter' });
    }

    try {
        const matchIdsUrl = `https://${encodeURIComponent(region)}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=35&api_key=${RIOT_API_KEY}`;
        console.log('Fetching match IDs from Riot API');
        
        const matchIdsResponse = await fetch(matchIdsUrl);

        if (!matchIdsResponse.ok) {
            const errorText = await matchIdsResponse.text();
            console.error('Match IDs error:', errorText);
            return res.status(matchIdsResponse.status).json({ 
                error: 'Riot API error', 
                details: errorText 
            });
        }

        const matchIds = await matchIdsResponse.json();
        console.log(`Found ${matchIds.length} matches`);

        const matchStats = [];
        for (const matchId of matchIds) {
            try {
                const matchUrl = `https://${encodeURIComponent(region)}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
                console.log(`Fetching data for match ${matchId}`);
                
                const matchResponse = await fetch(matchUrl);

                if (!matchResponse.ok) {
                    console.error(`Failed to fetch match ${matchId}:`, await matchResponse.text());
                    continue;
                }

                const matchData = await matchResponse.json();
                matchStats.push(matchData);

                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error fetching match ${matchId}:`, error);
            }
        }

        res.json(matchStats);
    } catch (error) {
        console.error('Server error in /api/match-stats:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

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