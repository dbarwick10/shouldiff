import { displayStats } from "../components/displayStatsComp.js";
import { calculatePlayerStats } from "../features/playerStats.js";
import { calculateTeamStats } from "../features/teamStats.js";
import { calculateEnemyTeamStats } from "../features/enemyTeamStats.js";
import { analyzeMatchTimelineForSummoner } from "../features/matchTimeline.js";

async function getPuuid() {
    const summonerName = document.getElementById('summonerName').value;
    const tagline = document.getElementById('tagLine').value;
    const region = document.getElementById('region').value;

    if (!summonerName) {
        alert('Please enter a summoner name');
        return;
    }

    try {
        const tag = tagline.replace(/[^a-zA-Z0-9 ]/g, "");
        console.log(`Fetching PUUID for ${summonerName} (${tagline}) in ${region}`);
        const puuidResponse = await fetch(`http://localhost:3000/api/puuid?summonerName=${encodeURIComponent(summonerName)}&region=${encodeURIComponent(region)}&tagline=${encodeURIComponent(tag)}`);
        
        if (!puuidResponse.ok) {
            const errorDetail = await puuidResponse.text();
            throw new Error(`Failed to fetch PUUID: ${errorDetail}`);
        }

        const puuidData = await puuidResponse.json();
        
        return puuidData.puuid;
    } catch (error) {
        console.error('Error fetching PUUID:', error);
        //document.getElementById('output').innerHTML = `<p>Error fetching PUUID: ${error.message}</p>`;
        return null;
    }
}

export async function fetchMatchStats() {
    try {
        const region = document.getElementById('region').value;
        const puuid = await getPuuid();
        if (!puuid) {
            console.error('No PUUID received');
            return;
        }

        document.getElementById('output').innerHTML = `
                <div class="saving"><strong>Fetching Previous Game Data</strong>
                <span>.</span><span>.</span><span>.</span></div>
                `;

            console.log('Fetching match stats...');
            const response = await fetch(`http://localhost:3000/api/match-stats?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`);
            console.log('Match stats fetched');

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch match stats: ${errorText}`);
        }

        const matchStats = await response.json();
        const playerStats = calculatePlayerStats(matchStats, puuid);
        const teamStats = calculateTeamStats(matchStats, puuid);
        const enemyTeamStats = calculateEnemyTeamStats(matchStats, puuid);
        
        console.log(`Found data from ${matchStats.length} matches.`)
        displayStats(playerStats, teamStats, enemyTeamStats);
        
    } catch (error) {
        console.error('Error fetching match stats:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching match stats: ${error.message}</p>`;
    }
}

export async function fetchMatchEvents() {
    try {
        const region = document.getElementById('region').value;
        const puuid = await getPuuid();
        if (!puuid) {
            console.error('No PUUID received');
            return;
        }

        console.log('Fetching match events...');
        const response = await fetch(`http://localhost:3000/api/match-events?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`);
        console.log('Match events fetched');

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

        // Wait for the analysis to complete
        const analysis = await analyzeMatchTimelineForSummoner(matchEvents, puuid);
        console.log('Match analysis completed:', analysis);

        console.log(`Found events from ${matchEvents.length} matches.`);
        return analysis;
        
    } catch (error) {
        console.error('Error fetching match events:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching match events: ${error.message}</p>`;
        throw error; // Re-throw the error to be handled by the calling code
    }
}