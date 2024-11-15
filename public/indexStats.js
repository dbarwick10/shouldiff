import { getPuuid } from "../services/riotAPIServices.js";
import { fetchMatchData } from "../services/helperServices.js";
//import { fetchMatchEvents } from "../services/riotAPIServices.js";
import { displayStats } from "../components/displayStatsComp.js";

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('fetchStatsButton');
    if (analyzeButton) {
        console.log('DOM elements before update:', { statsButton: !!document.getElementById('fetchStatsButton') })
        analyzeButton.addEventListener('click', async function() {
            this.disabled = true;  // Prevent double-clicking
            try {
                const puuid = await getPuuid();
                const matchStats = await fetchMatchData(puuid, region);
                if (matchStats) {
                    displayStats(matchStats.playerStats, matchStats.teamStats, matchStats.enemyTeamStats);
                }
                const displayChart = matchStats.avgStats;
                const canvas = document.getElementById('averageEventTimesChart');
                if (displayChart) {
                    displayChart;
                }
                //await fetchMatchEvents();
            } finally {
                this.disabled = false;  // Re-enable the button
                console.log('DOM elements after update:', { statsButton: !!document.getElementById('fetchStatsButton') })
            }
        });
    }
});