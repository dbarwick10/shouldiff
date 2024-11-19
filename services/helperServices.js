import { calculatePlayerStats, getPlayerTeamId, getPlayerTeamMatesAndEnemies, getPlayerId } from "../features/playerStats.js";
import { displayStats } from "../components/displayStatsComp.js";
import { calculateTeamStats } from "../features/teamStats.js";
import { calculateEnemyTeamStats } from "../features/enemyTeamStats.js";
import { analyzeMatchTimelineForSummoner } from "../features/matchTimeline.js";
import { fetchMatchStats, fetchMatchEvents, getPuuid } from "./riotAPIServices.js";
import { analyzePlayerStats } from "../features/analyzeStats.js";
import { getItemsAndPrices, clearCacheOnStart } from "../features/getItemsAndPrices.js";
import { calculateAverageEventTimes } from "../features/avgEventTimesStats.js";
import { displayAverageEventTimes } from "../components/displayAverageEventTimes.js";
import { calculateLiveStats } from "../features/liveMatchStats.js";

export async function fetchMatchData() {
    try {
        // Fetch and cache item prices for the last three versions
        console.log('Clearing item prices cache...');
        clearCacheOnStart();
        console.log('Fetching and caching item prices...');
        const itemsAndPrices = await getItemsAndPrices();
        itemsAndPrices; // Avoid linter warning
        console.log('Item prices cached', itemsAndPrices);

        // Fetch match stats
        console.log('Fetching match stats...');
        const matchStats = await fetchMatchStats();
        const puuid = await getPuuid();
        console.log('Match stats fetched');

        // Extract necessary data from match stats
        const playerTeamId = await getPlayerTeamId(matchStats, puuid);
        const { teamMates, teammateIds, enemies } = await getPlayerTeamMatesAndEnemies(matchStats, puuid);
        const playerId = await getPlayerId(matchStats, puuid);
        const events = await analyzeMatchTimelineForSummoner();

        // Fetch match events
        console.log('Fetching match events...');
        const matchEvents = await fetchMatchEvents();
        console.log('Match events fetched');

        // Calculate and display stats
        const playerStats = await calculatePlayerStats(matchStats, puuid);
        const teamStats = await calculateTeamStats(matchStats, puuid);
        const enemyTeamStats = await calculateEnemyTeamStats(matchStats, puuid);
        displayStats(playerStats, teamStats, enemyTeamStats);

        // Analyze match timeline
        const analysis = await analyzePlayerStats(matchEvents, puuid, matchStats);
        const individualGameStats = analysis.individualGameStats;
        console.log('Match analysis completed (aggregate):', analysis.aggregateStats);
        console.log('Match analysis completed:', individualGameStats);

        // Calculate average event times
        const averageEventTimes = await calculateAverageEventTimes(individualGameStats);

        // Try to get live stats, but don't let it block the chart display if it fails
        //let liveStats;
        
            const liveStats = await calculateLiveStats();
            

        // Display the chart with or without live stats
        const avgStats = await displayAverageEventTimes(averageEventTimes, liveStats);

        return {
            matches: matchStats.matches,
            playerStats,
            teamStats,
            enemyTeamStats,
            playerTeamId,
            teamMates,
            playerId,
            analysis,
            avgStats,
            liveStats: liveStats // Only included if available
        };
    } catch (error) {
        console.error('Error fetching match data:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching match data</p>`;
        throw error;
    }
}


