import { getLiveData } from "../services/liveDataServices.js";

export async function calculateLiveStats() {
    const gameData = await getLiveData();
    const events = gameData.events;
    if (!events) return { kills: [], deaths: [], assists: [] };
    
    // Track events for the active player only
    const activePlayerStats = { kills: [], deaths: [], assists: [] };
    
    events.forEach(event => {
        if (event.EventName === "ChampionKill") {
            const { KillerName, VictimName, Assisters = [], EventTime } = event;
            
            // Get active player name from the game data
            const activePlayerName = cachedGameData?.activePlayer?.summonerName;
            
            if (activePlayerName) {
                // Record kills
                if (KillerName === activePlayerName) {
                    activePlayerStats.kills.push(EventTime);
                }
                
                // Record deaths
                if (VictimName === activePlayerName) {
                    activePlayerStats.deaths.push(EventTime);
                }
                
                // Record assists
                if (Assisters.includes(activePlayerName)) {
                    activePlayerStats.assists.push(EventTime);
                }
            }
        }
    });
    
    return activePlayerStats;
}