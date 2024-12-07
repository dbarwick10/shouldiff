// https://dashboard.render.com/web/srv-ct7mmhlumphs738velp0/env

let puuid;
const region = document.getElementById('region').value;
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
        document.getElementById('output').innerHTML = `
            <div class="saving"><strong>Fetching Player Information</strong>
            <span>.</span><span>.</span><span>.</span></div>
        `;
        console.log(`Fetching PUUID for ${summonerName} (${tagline}) in ${region}`);
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
        //document.getElementById('output').innerHTML = `<p>Error fetching PUUID: ${error.message}</p>`;
        return null;
    }
}

export async function fetchMatchStats() {
    try {
        const gameMode = document.getElementById('gameMode').value.toUpperCase();
        document.getElementById('output').innerHTML = `
            <div class="saving"><strong>Fetching Previous Game Data</strong>
            <span>.</span><span>.</span><span>.</span></div>
        `;

        const response = await fetch(`https://shouldiffServer.onrender.com/api/match-stats?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}&gameMode=${encodeURIComponent(gameMode)}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch match stats: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching match stats:', error);
        throw error;
    }
}

export async function fetchMatchEvents() {
    try {
        // console.log('Fetching match events...');
        document.getElementById('output').innerHTML = `
            <div class="saving"><strong>Preparing Previous Game Data</strong>
            <span>.</span><span>.</span><span>.</span></div>
        `;
        const response = await fetch(`https://shouldiffServer.onrender.com/api/match-events?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch match events: ${errorText}`);
        }

        const matchEvents = await response.json();

        // Debug log to see the structure of matchEvents
        console.log('Received match events structure:', {
            isArray: Array.isArray(matchEvents),
            length: matchEvents?.length,
            firstMatchKeys: matchEvents?.[0] ? Object.keys(matchEvents[0]) : 'no matches',
            sampleMatch: matchEvents?.[0]
        });

        if (!Array.isArray(matchEvents)) {
            throw new Error('Expected an array of match events, received: ' + typeof matchEvents);
        }

        return matchEvents;
    } catch (error) {
        console.error('Error fetching match events:', error);
        throw error;
    }
}
