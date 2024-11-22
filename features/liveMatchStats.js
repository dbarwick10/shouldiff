import { getLiveData } from "../services/liveDataServices.js";

export async function calculateLiveStats() {
    console.log('Entering calculateLiveStats'); // Added logging

    try {
        const gameData = await getLiveData();
        console.log('Received game data:', gameData); // Log received data

        // Explicit, verbose null/undefined checks
        if (!gameData) {
            console.log('No game data received');
            return { 
                kills: [], 
                deaths: [], 
                assists: [],
                kda: [],
                turretKills: [],
                inhibitorKills: []
            };
        }

        if (!gameData.events || !gameData.events.Events) {
            console.log('No events found in game data');
            return { 
                kills: [], 
                deaths: [], 
                assists: [],
                kda: [],
                turretKills: [],
                inhibitorKills: []
            };
        }

        const events = gameData.events.Events;
        console.log('Events found:', events.length); // Log number of events
        
        // Track events for the active player only
        const activePlayerStats = { 
            kills: [], 
            deaths: [], 
            assists: [],
            kda: [],
            turretKills: [],
            inhibitorKills: []
        };
        
        const activePlayerName = gameData?.activePlayer?.riotIdGameName;
        console.log('Active player name:', activePlayerName);

        const allPlayers = allGameData.allPlayers;
            if (!allPlayers || !allGameData.events || !allGameData.events.Events) {
                console.error('Required data not found in game data');
                return;
            }
        const teamPlayers = allPlayers
            .filter(player => player.team === team) 
            .map(player => player.riotIdGameName); 

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

                    if (KillerName === activePlayerName || VictimName === activePlayerName || Assisters.includes(activePlayerName)) {
                        const kda = (activePlayerStats.kills.length + activePlayerStats.assists.length) / (activePlayerStats.deaths.length || 1);
                        activePlayerStats.kda.push(kda);
                    }
                }
            } else if (event.EventName === "TurretKilled") 
            {
                const { KillerName, EventTime } = event;
                
                if (activePlayerName) {
                    // Record turret kills
                    if (KillerName === activePlayerName) {
                        activePlayerStats.turretKills.push(EventTime);
                    }
                }
            } else if (event.EventName === "InhibitorKilled") 
            {
                const { KillerName, EventTime } = event;
                
                if (activePlayerName) {
                    // Record inhibitor kills
                    if (KillerName === activePlayerName) {
                        activePlayerStats.inhibitorKills.push(EventTime);
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
