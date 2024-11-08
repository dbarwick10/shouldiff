// models/riotApiModel.js
import fetch from 'node-fetch';
import https from 'https';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
if (!RIOT_API_KEY) {
    console.error('RIOT_API_KEY not found in environment variables');
    process.exit(1);
}

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

const fetchPuuid = async (summonerName, region, tagline) => {
    const riotUrl = `https://${encodeURIComponent(region)}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(summonerName)}/${encodeURIComponent(tagline)}?api_key=${RIOT_API_KEY}`;
    const puuidResponse = await fetch(riotUrl);

    if (!puuidResponse.ok) {
        const errorText = await puuidResponse.text();
        throw new Error(`Riot API error: ${errorText}`);
    }

    return puuidResponse.json();
};

const fetchMatchStats = async (puuid, region) => {
    const matchIdsUrl = `https://${encodeURIComponent(region)}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=5&api_key=${RIOT_API_KEY}`;
    const matchIdsResponse = await fetch(matchIdsUrl);

    if (!matchIdsResponse.ok) {
        const errorText = await matchIdsResponse.text();
        throw new Error(`Riot API error: ${errorText}`);
    }

    const matchIds = await matchIdsResponse.json();
    console.log('Fetching Data From: ', matchIds);
    const matchStats = [];

    for (const matchId of matchIds) {
        try {
            const matchUrl = `https://${encodeURIComponent(region)}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
            const matchResponse = await fetch(matchUrl);

            if (matchResponse.ok) {
                const matchData = await matchResponse.json();
                matchStats.push(matchData);
            }

            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`Error fetching match ${matchId}:`, error);
        }
    }

    return matchStats;
};

const fetchLiveClientData = async () => {
    const liveClientUrl = 'https://127.0.0.1:2999/liveclientdata/allgamedata';
    const response = await fetch(liveClientUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        agent: httpsAgent,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch game data: ${errorText}`);
    }

    return response.json();
};

export default {
    fetchPuuid,
    fetchMatchStats,
    fetchLiveClientData
};
