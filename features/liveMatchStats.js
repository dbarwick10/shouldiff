import { getLiveData } from "../services/liveDataServices.js";
import { getItemDetails } from "../features/getItemsAndPrices.js";

export async function calculateLiveStats() {
    console.log('Entering calculateTeamStats');

    try {
        const gameData = await getLiveData();
        console.log('Received game data:', gameData);

        // Comprehensive null/undefined checks
        if (!gameData || !gameData.events || !gameData.events.Events || !gameData.allPlayers) {
            console.log('Insufficient game data');
            return {
                activePlayer: createEmptyTeamStats(),
                activeTeam: createEmptyTeamStats(),
                enemyTeam: createEmptyTeamStats()
            };
        }

        const events = gameData.events.Events;
        const activePlayerName = gameData?.activePlayer?.riotIdGameName;
        const allPlayers = gameData.allPlayers;

        // Determine active player's team
        const activePlayerTeam = findPlayerTeam(allPlayers, activePlayerName);
        console.log('Active player team:', activePlayerTeam);

        // Initialize team stats
        const teamStats = {
            activePlayer: createEmptyTeamStats(),
            activeTeam: createEmptyTeamStats(),
            enemyTeam: createEmptyTeamStats()
        };

        // Find the initial game start event
        const gameStartEvent = events.find(event => event.EventName === 'GameStart');
        const gameStartRealTime = gameStartEvent ? Date.now() : null;
        const gameStartGameTime = gameStartEvent ? gameStartEvent.EventTime : null;

        // Copy game start times to active team
        teamStats.activeTeam.gameStartRealTime = gameStartRealTime;
        teamStats.activeTeam.gameStartGameTime = gameStartGameTime;

        // Track events
        events.forEach(event => {
            
                if (event.EventName === "ChampionKill") {
                    const { KillerName, VictimName, Assisters = [], EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
                    const victimPlayer = allPlayers.find(p => p.riotIdGameName === VictimName);
                    
                    if (activePlayerName) {
                        // Record kills
                        if (KillerName === activePlayerName) {
                            teamStats.activePlayer.kills.push(EventTime);
                        }
                        
                        // Record deaths
                        if (VictimName === activePlayerName) {
                            teamStats.activePlayer.deaths.push(EventTime);
                        }
                        
                        // Record assists
                        if (Assisters.includes(activePlayerName)) {
                            teamStats.activePlayer.assists.push(EventTime);
                        }

                        // Update KDA after each relevant event
                        if (KillerName === activePlayerName || VictimName === activePlayerName || Assisters.includes(activePlayerName)) {
                            const kda = (teamStats.activePlayer.kills.length + teamStats.activePlayer.assists.length) / 
                                        (teamStats.activePlayer.deaths.length || 1);
                            
                            teamStats.activePlayer.kda.push({
                                timestamp: EventTime,
                                kdaValue: parseFloat(kda.toFixed(2))
                            });
                        }
                    }
                    // Player Team stats tracking
                    if (killerPlayer && victimPlayer) {
                        // If the killer is on the same team as the active player
                        if (killerPlayer.team === activePlayerTeam) {
                            teamStats.activeTeam.kills.push(EventTime);
                        }
                        
                        // If the victim is on the same team as the active player
                        if (victimPlayer.team === activePlayerTeam) {
                            teamStats.activeTeam.deaths.push(EventTime);
                        }
                        
                        // If any assisters are on the same team as the active player
                        const teamAssists = Assisters.filter(assister => {
                            const assisterPlayer = allPlayers.find(p => p.riotIdGameName === assister);
                            return assisterPlayer && assisterPlayer.team === activePlayerTeam;
                        });
                        if (teamAssists.length > 0) {
                            teamStats.activeTeam.assists.push(EventTime);
                        }

                        // Update KDA after each relevant event
                        if (killerPlayer.team === activePlayerTeam || victimPlayer.team === activePlayerTeam || Assisters.some(assister => allPlayers.find(p => p.riotIdGameName === assister)?.team === activePlayerTeam)) {
                            const kda = (teamStats.activeTeam.kills.length + teamStats.activeTeam.assists.length) / 
                                        (teamStats.activeTeam.deaths.length || 1);
                            
                            teamStats.activeTeam.kda.push({
                                timestamp: EventTime,
                                kdaValue: parseFloat(kda.toFixed(2))
                            });
                        }
                    }
                    // Enemy Team stats tracking
                    if (killerPlayer && victimPlayer) {
                        // If the killer is on a different team from the active player
                        if (killerPlayer.team !== activePlayerTeam) {
                            teamStats.enemyTeam.kills.push(EventTime);
                        }
                        
                        // If the victim is on a different team from the active player
                        if (victimPlayer.team !== activePlayerTeam) {
                            teamStats.enemyTeam.deaths.push(EventTime);
                        }
                        
                        // If any assisters are on a different team from the active player
                        const enemyAssists = Assisters.filter(assister => {
                            const assisterPlayer = allPlayers.find(p => p.riotIdGameName === assister);
                            return assisterPlayer && assisterPlayer.team !== activePlayerTeam;
                        });
                        
                        if (enemyAssists.length > 0) {
                            teamStats.enemyTeam.assists.push(EventTime);
                        }

                        // Update KDA after each relevant event
                        if (killerPlayer.team !== activePlayerTeam || victimPlayer.team !== activePlayerTeam || Assisters.some(assister => allPlayers.find(p => p.riotIdGameName === assister)?.team !== activePlayerTeam)) {
                            const kda = (teamStats.enemyTeam.kills.length + teamStats.enemyTeam.assists.length) / 
                                        (teamStats.enemyTeam.deaths.length || 1);
                            
                            teamStats.enemyTeam.kda.push({
                                timestamp: EventTime,
                                kdaValue: parseFloat(kda.toFixed(2))
                            });
                        }
                    }

                } else if (event.EventName === "TurretKilled") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
                    const minionPlayerTeam = activePlayerTeam === 'ORDER' ? 'T100' : 'T200';
                    const minionEnemyTeam = activePlayerTeam === 'ORDER' ? 'T200' : 'T100';

                    // Active Player stats
                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.activePlayer.turretKills.push(EventTime);
                    }

                    if ((killerPlayer && killerPlayer.team === activePlayerTeam) || KillerName.includes(minionPlayerTeam)) {
                        teamStats.activeTeam.turretKills.push(EventTime);
                    }

                    // Enemy Team stats tracking
                    if ((killerPlayer && killerPlayer.team !== activePlayerTeam) || KillerName.includes(minionEnemyTeam)) {
                        teamStats.enemyTeam.turretKills.push(EventTime);
                    }

                } else if (event.EventName === "InhibKilled") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
                    const minionPlayerTeam = activePlayerTeam === 'ORDER' ? 'T100' : 'T200';
                    const minionEnemyTeam = activePlayerTeam === 'ORDER' ? 'T200' : 'T100';

                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.activePlayer.inhibitorKills.push(EventTime);
                        teamStats.activeTeam.inhibitorKills.push(EventTime);
                    }
                
                    if ((killerPlayer && killerPlayer.team === activePlayerTeam) || KillerName.includes(minionPlayerTeam)) {
                        teamStats.activeTeam.inhibitorKills.push(EventTime);
                    }
                
                    // Enemy Team stats tracking
                    if ((killerPlayer && killerPlayer.team !== activePlayerTeam) || KillerName.includes(minionEnemyTeam)) {
                        teamStats.enemyTeam.inhibitorKills.push(EventTime);
                    }

                } else if (event.EventName === "DragonKill") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);

                    // Active Player stats
                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.activePlayer.dragonKills.push(EventTime);
                    }

                    if (killerPlayer && killerPlayer.team === activePlayerTeam) {
                        teamStats.activeTeam.dragonKills.push(EventTime);
                    }

                    // Enemy Team stats tracking
                    if (killerPlayer && killerPlayer.team !== activePlayerTeam) {
                        teamStats.enemyTeam.dragonKills.push(EventTime);
                    }
                } else if (event.EventName === "BaronKill") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);

                    // Active Player stats
                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.activePlayer.baronKills.push(EventTime);
                    }

                    if (killerPlayer && killerPlayer.team === activePlayerTeam) {
                        teamStats.activeTeam.baronKills.push(EventTime);
                    }

                    // Enemy Team stats tracking
                    if (killerPlayer && killerPlayer.team !== activePlayerTeam) {
                        teamStats.enemyTeam.baronKills.push(EventTime);
                    }
                } else if (event.DragonType === "Elder") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);

                    // Active Player stats
                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.activePlayer.elderKills.push(EventTime);
                    }

                    if (killerPlayer && killerPlayer.team === activePlayerTeam) {
                        teamStats.activeTeam.elderKills.push(EventTime);
                    }

                    // Enemy Team stats tracking
                    if (killerPlayer && killerPlayer.team !== activePlayerTeam) {
                        teamStats.enemyTeam.elderKills.push(EventTime);
                    }
                }
        });

        // Calculate team-wide item values
        calculateItemValues(teamStats);

        console.log('Calculated team stats:', teamStats);

        return teamStats;

    } catch (error) {
        console.error('Complete error in calculateTeamStats:', error);
        return {
            activePlayer: createEmptyTeamStats(),
            activeTeam: createEmptyTeamStats(),
            enemyTeam: createEmptyTeamStats()
        };
    }
}

// Helper function to create an empty team stats object
function createEmptyTeamStats() {
    return { 
        kills: [], 
        deaths: [], 
        assists: [],
        kda: [],
        turretKills: [],
        inhibitorKills: [],
        dragonKills: [],
        baronKills: [],
        elderKills: [],
        items: [],
        // totalRawPrice: 0,
        // totalDetailedPrice: 0,
        // gameStartRealTime: null,
        // gameStartGameTime: null
    };
}

// Find the team of a player
function findPlayerTeam(allPlayers, activePlayerName) {
    const activePlayer = allPlayers.find(p => p.riotIdGameName === activePlayerName);
    return activePlayer ? activePlayer.team : null;
}

// Calculate item values for teams
function calculateItemValues(teamStats) {
    ['activePlayer', 'activeTeam', 'enemyTeam'].forEach(teamKey => {
        const items = teamStats[teamKey].items;
        teamStats[teamKey].totalRawPrice = items.reduce((total, item) => total + (item.rawPrice || 0), 0);
        teamStats[teamKey].totalDetailedPrice = items.reduce((total, item) => 
            total + (item.detailedPrice?.total || 0), 0);
    });
}