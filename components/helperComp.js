import { fetchMatchStats } from "../services/riotAPIServices.js";
import { displayStats } from "./displayStatsComp.js";

export async function display() {
    const matchStats = await fetchMatchStats();
    if (!matchStats) {
        console.error('No match stats received');
        return;
    }

    displayStats(matchStats.playerStats, matchStats.teamStats, matchStats.enemyTeamStats);
}
