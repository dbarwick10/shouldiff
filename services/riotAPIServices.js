// https://dashboard.render.com/web/srv-ct7mmhlumphs738velp0/env

let puuid;
const region = document.getElementById('region').value;
const loading = document.getElementById('loading');
const inputSection = document.querySelector('.input-section');

export async function getPuuid() {
    const summonerName = document.getElementById('summonerName').value;
    const tagline = document.getElementById('tagLine').value;

    if (!summonerName) {
        alert('Please enter a summoner name');
        return;
    }
    if (!tagline) {
        alert('Please enter a tagline');
        return;
    }

    try {
        const tag = tagline.replace(/[^a-zA-Z0-9 ]/g, "");
        inputSection.style.display = 'none';
        loading.innerHTML = `
        
            <strong>Fetching Player Information</strong>
            <div id="loading-circle"></div>
        
        `;
        loading.style.display = 'flex';

        // console.log(`Fetching PUUID for ${summonerName} (${tagline}) in ${region}`);
        const puuidResponse = await fetch(`https://shouldiffServer.onrender.com/api/puuid?summonerName=${encodeURIComponent(summonerName)}&region=${encodeURIComponent(region)}&tagline=${encodeURIComponent(tag)}`);
        
        if (!puuidResponse.ok) {
            const errorDetail = await puuidResponse.text();
            throw new Error(`Failed to fetch PUUID: ${errorDetail}`);
        }

        const puuidData = await puuidResponse.json();
        
        puuid = puuidData.puuid;
        return puuid;
    } catch (error) {
        console.error('Error fetching PUUID:', error);
        inputSection.style.display = 'block';
        loading.innerHTML = `<p>Error fetching PUUID</p>`;
        return null;
    }
}

export async function fetchMatchStats() {
    try {
        const gameMode = document.getElementById('gameMode').value.toUpperCase();
        loading.innerHTML = `
            
                <strong>Fetching Previous Game Data</strong>
                <div id="loading-circle"></div>
            
        `;

        const response = await fetch(`https://shouldiffServer.onrender.com/api/match-stats?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}&gameMode=${encodeURIComponent(gameMode)}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch match stats: ${errorText}`);
        }

        const matchStats = await response.json();

        // Debug log to see the structure of matchStats
        // console.log('Received match events structure:', {
        //     isArray: Array.isArray(matchStats),
        //     length: matchStats?.length,
        //     firstMatchKeys: matchStats?.[0] ? Object.keys(matchStats[0]) : 'no matches',
        //     sampleMatch: matchStats?.[0]
        // });
        return matchStats;

    } catch (error) {
        console.error('Error fetching match stats:', error);
        inputSection.style.display = 'block';
        loading.innerHTML = `<p>Error Fetching Game Data</p>`;
        throw error;
    }
}

export async function fetchMatchEvents() {
    try {
        // console.log('Fetching match events...');
        loading.innerHTML = `
            
                <strong>Preparing Previous Game Data</strong>
                <div id="loading-circle"></div>
            
        `;
        const response = await fetch(`https://shouldiffServer.onrender.com/api/match-events?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`);

        if (!response.ok) {
            const errorText = await response.text();
            inputSection.style.display = 'block';
            throw new Error(`Failed to fetch match events: ${errorText}`);
        }

        const matchEvents = await response.json();

        // Debug log to see the structure of matchEvents
        // console.log('Received match events structure:', {
        //     isArray: Array.isArray(matchEvents),
        //     length: matchEvents?.length,
        //     firstMatchKeys: matchEvents?.[0] ? Object.keys(matchEvents[0]) : 'no matches',
        //     sampleMatch: matchEvents?.[0]
        // });

        if (!Array.isArray(matchEvents)) {
            throw new Error('Expected an array of match events, received: ' + typeof matchEvents);
        }

        loading.style.display = 'none';
        inputSection.style.display = 'block';
        return matchEvents;
    } catch (error) {
        console.error('Error fetching match events:', error);
        inputSection.style.display = 'block';
        loading.innerHTML = `<p>Error Preparing Game Data</p>`;
        throw error;
    }
}
