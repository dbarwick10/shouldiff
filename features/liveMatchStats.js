import { getLiveData } from "../services/liveDataServices.js";

export async function calculateLiveStats() {
    console.log('Entering calculateLiveStats');

    try {
        const gameData = await getLiveData();
        console.log('Received game data:', gameData);

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
        console.log('Events found:', events.length);
        
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

        // Fixed: Use gameData instead of allGameData
        const allPlayers = gameData.allPlayers;
        if (!allPlayers || !gameData.events || !gameData.events.Events) {
            console.error('Required data not found in game data');
            return activePlayerStats; // Return empty stats instead of undefined
        }

        // Note: The team filtering might not be needed if we're only tracking active player
        // But if you need it, you'll need to get the team from gameData.activePlayer
        // const team = gameData.activePlayer.team;
        // const teamPlayers = allPlayers
        //     .filter(player => player.team === team)
        //     .map(player => player.riotIdGameName);

        events.forEach(event => {
            if (event.EventName === "ChampionKill") {
                const { KillerName, VictimName, Assisters = [], EventTime } = event;
                
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

                    // Update KDA after each relevant event
                    if (KillerName === activePlayerName || VictimName === activePlayerName || Assisters.includes(activePlayerName)) {
                        const kda = (activePlayerStats.kills.length + activePlayerStats.assists.length) / 
                                    (activePlayerStats.deaths.length || 1);
                        
                        activePlayerStats.kda.push({
                            timestamp: EventTime,  // Use the current event time
                            kdaValue: parseFloat(kda.toFixed(2))  // Rounded KDA value
                        });
                    }
                }
            } else if (event.EventName === "TurretKilled") {
                const { KillerName, EventTime } = event;
                
                if (activePlayerName && KillerName === activePlayerName) {
                    activePlayerStats.turretKills.push(EventTime);
                }
            } else if (event.EventName === "InhibitorKilled") {
                const { KillerName, EventTime } = event;
                
                if (activePlayerName && KillerName === activePlayerName) {
                    activePlayerStats.inhibitorKills.push(EventTime);
                }
            }
        });
        
        console.log('Calculated active player stats:', activePlayerStats);
        return activePlayerStats;

    } catch (error) {
        console.error('Complete error in calculateLiveStats:', error);
        return { 
            kills: [], 
            deaths: [], 
            assists: [], 
            kda: [],
            turretKills: [],
            inhibitorKills: []
        };
    }
}