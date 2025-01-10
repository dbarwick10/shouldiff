import { getLiveData } from '../services/liveDataService.js';

export async function calculateLiveStats() {
    console.log('Entering calculateTeamStats');

    try {
        const gameData = await getLiveData();
        console.log('Received game data');

        if (!gameData || !gameData.events || !gameData.events.Events || !gameData.allPlayers) {
            console.log('Insufficient game data');
            return {
                playerStats: createEmptyTeamStats(),
                teamStats: createEmptyTeamStats(),
                enemyStats: createEmptyTeamStats()
            };
        }

        const events = gameData.events.Events;
        const activePlayerName = gameData?.activePlayer?.riotIdGameName;
        const allPlayers = gameData.allPlayers;

        const activePlayer = allPlayers.find(p => p.riotIdGameName === activePlayerName);
        const activePlayerTeam = activePlayer?.team;
        
        const playerTeamMembers = allPlayers
            .filter(p => p.team === activePlayerTeam)
            .map(p => p.riotIdGameName);
        const enemyTeamMembers = allPlayers
            .filter(p => p.team !== activePlayerTeam)
            .map(p => p.riotIdGameName);

        const teamStats = {
            playerStats: createEmptyTeamStats(),
            teamStats: createEmptyTeamStats(),
            enemyStats: createEmptyTeamStats()
        };

        const gameStartEvent = events.find(event => event.EventName === 'GameStart');
        const gameStartRealTime = gameStartEvent ? Date.now() : null;
        const gameStartGameTime = gameStartEvent ? gameStartEvent.EventTime : null;

        teamStats.teamStats.gameStartRealTime = gameStartRealTime;
        teamStats.teamStats.gameStartGameTime = gameStartGameTime;

        let playerTimeSpentDead = 0;
        let playerTeamTimeSpentDead = 0;
        let enemyTeamTimeSpentDead = 0;

        events.forEach(event => {
            if (event.EventName === "ChampionKill") {
                const { KillerName, VictimName, Assisters = [], EventTime } = event;
                const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName || p.summonerName === KillerName);
                const victimPlayer = allPlayers.find(p => p.riotIdGameName === VictimName || p.summonerName === VictimName);
                const isTurretKill = KillerName.includes('Turret_');
                
                if (activePlayerName) {
                    // Kills
                    if (KillerName === activePlayerName) {
                        teamStats.playerStats.kills.push(EventTime);
                    }
                    
                    // Deaths
                    if (VictimName === activePlayerName) {
                        teamStats.playerStats.deaths.push(EventTime);
                        
                        const currentMinutes = Math.floor(EventTime / 60);
                        const deathTimer = calculateDeathTimer(currentMinutes, victimPlayer?.level);
                        
                        if (!teamStats.playerStats.timeSpentDead) teamStats.playerStats.timeSpentDead = [];
                        if (!teamStats.playerStats.totalTimeSpentDead) teamStats.playerStats.totalTimeSpentDead = [];
                        
                        teamStats.playerStats.timeSpentDead.push(deathTimer);
                        playerTimeSpentDead += deathTimer;
                        teamStats.playerStats.totalTimeSpentDead.push(playerTimeSpentDead);
                    }
                    
                    // Assists
                    if (Assisters.includes(activePlayerName)) {
                        teamStats.playerStats.assists.push(EventTime);
                    }
        
                    // KDA
                    if (KillerName === activePlayerName || VictimName === activePlayerName || Assisters.includes(activePlayerName)) {
                        const currentKills = teamStats.playerStats.kills.length;
                        const currentAssists = teamStats.playerStats.assists.length;
                        const currentDeaths = Math.max(1, teamStats.playerStats.deaths.length);
                        
                        const kdaValue = (currentKills + currentAssists) / currentDeaths;
                        teamStats.playerStats.kda.push({
                            timestamp: EventTime,
                            kdaValue: parseFloat(kdaValue.toFixed(2))
                        });
                    }
                }
        
                // Team assists check
                const teamAssists = Assisters.filter(assister => playerTeamMembers.includes(assister));
                const enemyAssists = Assisters.filter(assister => enemyTeamMembers.includes(assister));
        
                // Team Stats
                if (playerTeamMembers.includes(KillerName) || 
                    (isTurretKill && teamAssists.length > 0)) {
                    teamStats.teamStats.kills.push(EventTime);
                    
                    if (teamAssists.length > 0) {
                        teamStats.teamStats.assists.push(EventTime);
                    }
                }
                
                if (playerTeamMembers.includes(VictimName)) {
                    teamStats.teamStats.deaths.push(EventTime);
                    
                    const currentMinutes = Math.floor(EventTime / 60);
                    const deathTimer = calculateDeathTimer(currentMinutes, victimPlayer?.level);
                    
                    if (!teamStats.teamStats.timeSpentDead) teamStats.teamStats.timeSpentDead = [];
                    if (!teamStats.teamStats.totalTimeSpentDead) teamStats.teamStats.totalTimeSpentDead = [];
                    
                    teamStats.teamStats.timeSpentDead.push(deathTimer);
                    playerTeamTimeSpentDead += deathTimer;
                    teamStats.teamStats.totalTimeSpentDead.push(playerTeamTimeSpentDead);
                }
        
                // Enemy Team Stats
                if (!playerTeamMembers.includes(KillerName) || 
                    (isTurretKill && enemyAssists.length > 0)) {
                    teamStats.enemyStats.kills.push(EventTime);
                    
                    if (enemyAssists.length > 0) {
                        teamStats.enemyStats.assists.push(EventTime);
                    }
                }
                
                if (!playerTeamMembers.includes(VictimName)) {
                    teamStats.enemyStats.deaths.push(EventTime);
                    
                    const currentMinutes = Math.floor(EventTime / 60);
                    const deathTimer = calculateDeathTimer(currentMinutes, victimPlayer?.level);
                    
                    if (!teamStats.enemyStats.timeSpentDead) teamStats.enemyStats.timeSpentDead = [];
                    if (!teamStats.enemyStats.totalTimeSpentDead) teamStats.enemyStats.totalTimeSpentDead = [];
                    
                    teamStats.enemyStats.timeSpentDead.push(deathTimer);
                    enemyTeamTimeSpentDead += deathTimer;
                    teamStats.enemyStats.totalTimeSpentDead.push(enemyTeamTimeSpentDead);
                }
        
                // Update KDAs
                // Team KDA
                const shouldUpdateTeamKDA = playerTeamMembers.includes(KillerName) || 
                                           playerTeamMembers.includes(VictimName) || 
                                           (isTurretKill && teamAssists.length > 0) ||
                                           teamAssists.length > 0;
        
                if (shouldUpdateTeamKDA) {
                    const currentKills = teamStats.teamStats.kills.length;
                    const currentAssists = teamStats.teamStats.assists.length;
                    const currentDeaths = Math.max(1, teamStats.teamStats.deaths.length);
                    
                    const kdaValue = (currentKills + currentAssists) / currentDeaths;
                    teamStats.teamStats.kda.push({
                        timestamp: EventTime,
                        kdaValue: parseFloat(kdaValue.toFixed(2))
                    });
                }
        
                // Enemy KDA
                const shouldUpdateEnemyKDA = !playerTeamMembers.includes(KillerName) || 
                                            !playerTeamMembers.includes(VictimName) || 
                                            (isTurretKill && enemyAssists.length > 0) ||
                                            enemyAssists.length > 0;
        
                if (shouldUpdateEnemyKDA) {
                    const currentKills = teamStats.enemyStats.kills.length;
                    const currentAssists = teamStats.enemyStats.assists.length;
                    const currentDeaths = Math.max(1, teamStats.enemyStats.deaths.length);
                    
                    const kdaValue = (currentKills + currentAssists) / currentDeaths;
                    teamStats.enemyStats.kda.push({
                        timestamp: EventTime,
                        kdaValue: parseFloat(kdaValue.toFixed(2))
                    });
                }

                } else if (event.EventName === "TurretKilled") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
                    const minionPlayerTeam = activePlayerTeam === 'ORDER' ? 'T100' : 'T200';
                    const minionEnemyTeam = activePlayerTeam === 'ORDER' ? 'T200' : 'T100';

                    // Active Player stats
                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.playerStats.turrets.push(EventTime);
                    }

                    if ((killerPlayer?.team === activePlayerTeam) || KillerName.includes(minionPlayerTeam)) {
                        teamStats.teamStats.turrets.push(EventTime);
                    }

                    // Enemy Team stats tracking
                    if ((killerPlayer?.team !== activePlayerTeam) || KillerName.includes(minionEnemyTeam)) {
                        teamStats.enemyStats.turrets.push(EventTime);
                    }

                } else if (event.EventName === "InhibKilled") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
                    const minionPlayerTeam = activePlayerTeam === 'ORDER' ? 'T100' : 'T200';
                    const minionEnemyTeam = activePlayerTeam === 'ORDER' ? 'T200' : 'T100';

                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.playerStats.inhibitors.push(EventTime);
                    }
                
                    if ((killerPlayer?.team === activePlayerTeam) || KillerName.includes(minionPlayerTeam)) {
                        teamStats.teamStats.inhibitors.push(EventTime);
                    }
                
                    // Enemy Team stats tracking
                    if ((killerPlayer?.team !== activePlayerTeam) || KillerName.includes(minionEnemyTeam)) {
                        teamStats.enemyStats.inhibitors.push(EventTime);
                    }

                } else if (event.EventName === "DragonKill") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);

                    // Active Player stats
                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.playerStats.dragons.push(EventTime);
                    }

                    if (killerPlayer?.team === activePlayerTeam) {
                        teamStats.teamStats.dragons.push(EventTime);
                    }

                    // Enemy Team stats tracking
                    if (killerPlayer?.team !== activePlayerTeam) {
                        teamStats.enemyStats.dragons.push(EventTime);
                    }
                } else if (event.EventName === "BaronKill") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);

                    // Active Player stats
                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.playerStats.barons.push(EventTime);
                    }

                    if (killerPlayer?.team === activePlayerTeam) {
                        teamStats.teamStats.barons.push(EventTime);
                    }

                    // Enemy Team stats tracking
                    if (killerPlayer?.team !== activePlayerTeam) {
                        teamStats.enemyStats.barons.push(EventTime);
                    }
                } else if (event.DragonType === "Elder") {
                    const { KillerName, EventTime } = event;
                    const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);

                    // Active Player stats
                    if (activePlayerName && KillerName === activePlayerName) {
                        teamStats.playerStats.elders.push(EventTime);
                    }

                    if (killerPlayer?.team === activePlayerTeam) {
                        teamStats.teamStats.elders.push(EventTime);
                    }

                    // Enemy Team stats tracking
                    if (killerPlayer?.team !== activePlayerTeam) {
                        teamStats.enemyStats.elders.push(EventTime);
                    }
                }     
        });

        calculateItemValues(teamStats);

        return teamStats;

    } catch (error) {
        console.error('Complete error in calculateTeamStats:', error);
        return {
            playerStats: createEmptyTeamStats(),
            teamStats: createEmptyTeamStats(),
            enemyStats: createEmptyTeamStats()
        };
    }
}

function createEmptyTeamStats() {
    return { 
        kills: [], 
        deaths: [],
        timeSpentDead: [],
        totalTimeSpentDead: [],
        assists: [],
        kda: [],
        turrets: [],      
        inhibitors: [],   
        dragons: [],      
        barons: [],       
        elders: [],       
        items: []
    };
}

function findPlayerTeam(allPlayers, activePlayerName) {
    const activePlayer = allPlayers.find(p => p.riotIdGameName === activePlayerName);
    return activePlayer ? activePlayer.team : null;
}

function calculateItemValues(teamStats) {
    ['playerStats', 'teamStats', 'enemyStats'].forEach(teamKey => {
        const items = teamStats[teamKey].items;
        teamStats[teamKey].totalRawPrice = items.reduce((total, item) => total + (item.rawPrice || 0), 0);
        teamStats[teamKey].totalDetailedPrice = items.reduce((total, item) => 
            total + (item.detailedPrice?.total || 0), 0);
    });
}

const BRW = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5];

function getTimeIncreaseFactor(currentMinutes) {
    if (currentMinutes < 15) return 0;
    if (currentMinutes < 30) {
        return Math.min(Math.ceil(2 * (currentMinutes - 15)) * 0.00425, 0.1275);
    } else if (currentMinutes < 45) {
        return Math.min(0.1275 + Math.ceil(2 * (currentMinutes - 30)) * 0.003, 0.2175);
    } else if (currentMinutes < 55) {
        return Math.min(0.2175 + Math.ceil(2 * (currentMinutes - 45)) * 0.0145, 0.50);
    }
    return 0.50;
}

function calculateDeathTimer(currentMinutes, level) {
    const baseRespawnWait = BRW[level - 1];
    const timeIncreaseFactor = getTimeIncreaseFactor(currentMinutes);
    const deathTimer = baseRespawnWait + (baseRespawnWait * timeIncreaseFactor);
    
    return deathTimer;
}