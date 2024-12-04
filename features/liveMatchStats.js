import { getLiveData } from "../services/liveDataServices.js";
import { getItemDetails } from "../features/getItemsAndPrices.js";

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
                inhibitorKills: [],
                items: []
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
                inhibitorKills: [],
                items: []
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
            inhibitorKills: [],
            items: []
        };
        
        const activePlayerName = gameData?.activePlayer?.riotIdGameName;
        console.log('Active player name:', activePlayerName);

        const allPlayers = gameData.allPlayers;
        if (!allPlayers || !gameData.events || !gameData.events.Events) {
            console.error('Required data not found in game data');
            return activePlayerStats;
        }

        // Item Tracking Variables
        let gameStartRealTime = null;
        let gameStartGameTime = null;

        // Find the initial game start event and capture real-world time
        const gameStartEvent = events.find(event => event.EventName === 'GameStart');
        if (gameStartEvent) {
            gameStartRealTime = Date.now();
            gameStartGameTime = gameStartEvent.EventTime;
        }

        // Existing event tracking logic remains the same...
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
                            timestamp: EventTime,
                            kdaValue: parseFloat(kda.toFixed(2))
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
        
        // Calculate total item values
        const totalRawPrice = activePlayerStats.items.reduce((total, item) => total + (item.rawPrice || 0), 0);
        const totalDetailedPrice = activePlayerStats.items.reduce((total, item) => 
            total + (item.detailedPrice?.total || 0), 0);

        console.log('Calculated active player stats:', activePlayerStats);
        console.log('Total raw price:', totalRawPrice);
        console.log('Total detailed price:', totalDetailedPrice);

        return {
            ...activePlayerStats,
            totalRawPrice,
            totalDetailedPrice,
            gameStartRealTime,
            gameStartGameTime
        };

    } catch (error) {
        console.error('Complete error in calculateLiveStats:', error);
        return { 
            kills: [], 
            deaths: [], 
            assists: [], 
            kda: [],
            turretKills: [],
            inhibitorKills: [],
            items: [],
            totalRawPrice: 0,
            totalDetailedPrice: 0,
            gameStartRealTime: null,
            gameStartGameTime: null
        };
    }
}