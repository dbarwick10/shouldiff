import { getLiveData } from "../services/liveDataServices.js";

export async function calculateLiveStats() {
    console.log('Entering calculateLiveStats'); // Added logging

    try {
        const gameData = await getLiveData();
        console.log('Received game data:', gameData); // Log received data

        // Explicit, verbose null/undefined checks
        if (!gameData) {
            console.log('No game data received');
            return { kills: [], deaths: [], assists: [] };
        }

        if (!gameData.events || !gameData.events.Events) {
            console.log('No events found in game data');
            return { kills: [], deaths: [], assists: [] };
        }

        const events = gameData.events.Events;
        console.log('Events found:', events.length); // Log number of events
        
        // Track events for the active player only
        const activePlayerStats = { kills: [], deaths: [], assists: [] };
        
        const activePlayerName = gameData?.activePlayer?.riotIdGameName;
        console.log('Active player name:', activePlayerName);

        events.forEach(event => {
            if (event.EventName === "ChampionKill") {
                const { KillerName, VictimName, Assisters = [], EventTime } = event;
                
                if (activePlayerName) {
                    // Record kills
                    if (KillerName === activePlayerName) {
                        activePlayerStats.kills.push(event.EventTime);
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
        
        console.log('Calculated active player stats:', activePlayerStats);
        return activePlayerStats;
    } catch (error) {
        console.error('Complete error in calculateLiveStats:', error);
        return { kills: [], deaths: [], assists: [] };
    }
}

// let timeoutId;
// const refreshTime = 1000; // 1 second

// async function autoRefresh() {
//     const gameData = await getLiveData();

//     clearTimeout(timeoutId); 
//     // console.log("Auto-refresh triggered");
//     // console.log("Memory usage:", performance.memory.usedJSHeapSize);

//      if (gameData) {
//         calculateLiveStats; // Call your function to update stats based on new data
        
//     }
    

//     timeoutId = setTimeout(autoRefresh, refreshTime); 
// }

// autoRefresh();
