
import { analyzeMatchTimelineForSummoner } from '../features/matchTimeline.js';
import { getItemDetails } from '../features/getItemsAndPrices.js';
import { gameResult } from '../features/endGameResult.js';

const destroyedItems = new Map();

function initializeStats(matchId) {
    return {
        matchId,
        basicStats: {
            kills: { count: 0, timestamps: [] },
            deaths: { count: 0, timestamps: [] },
            timeSpentDead: [],
            assists: { count: 0, timestamps: [] },
            kda: {
                total: 0,
                history: { count: 0, timestamps: [] }
            }
        },
        objectives: {
            turrets: { count: 0, timestamps: [] },
            towerKills: {
                outer: { count: 0, timestamps: [] },
                inner: { count: 0, timestamps: [] },
                base: { count: 0, timestamps: [] },
                nexus: { count: 0, timestamps: [] }
            },
            inhibitors: { count: 0, timestamps: [] },
            eliteMonsterKills: { count: 0, timestamps: [] },
            dragons: { count: 0, timestamps: [] },
            barons: { count: 0, timestamps: [] },
            elders: { count: 0, timestamps: [] }
        },
        economy: {
            itemPurchases: { 
                count: 0, 
                timestamps: [], 
                items: [] 
            },
            itemGold: { 
                total: 0, 
                history: { count: [], timestamps: [] }
            }
        },
        events: [],
        outcome: {
            result: null, // 'win', 'loss', 'surrender_win', 'surrender_loss'
            surrender: false // true if the game ended due to a surrender
        }
    };
}

export async function analyzePlayerStats(matchStats, puuid, gameResultMatches) {
    try {
        destroyedItems.clear();

        const matches = Array.isArray(matchStats) ? matchStats : matchStats.matches;
        if (!matches || !Array.isArray(matches)) {
            console.error('Invalid matchStats structure:', matchStats);
            return null;
        }

        // Get game results and add debug logging
        const gameResults = await gameResult(gameResultMatches, puuid);
        // console.log('Game results for analysis:', gameResults);

        const matchTimelines = await analyzeMatchTimelineForSummoner({ matches }, puuid);
        if (!Array.isArray(matchTimelines)) {
            console.error('Invalid matchTimelines structure:', matchTimelines);
            return null;
        }

        const matchId = matchStats.metadata?.matchId;
        const aggregateStats = {
            playerStats: initializeStats(matchId),
            teamStats: initializeStats(matchId),
            enemyStats: initializeStats(matchId)
        };

        const individualGameStats = [];

        for (const match of matchTimelines) {
            const { matchId, allEvents, metadata } = match;
            
            if (!allEvents || !Array.isArray(allEvents)) {
                console.warn(`Skipping match ${matchId} due to missing events`);
                continue;
            }

            const gameStats = {
                playerStats: initializeStats(matchId),
                teamStats: initializeStats(matchId),
                enemyStats: initializeStats(matchId)
            };

            // Debug log for specific match
            // console.log(`Processing match ${matchId} for outcome`);
            
            // Update game outcome with detailed logging
            const isWin = gameResults.results.wins.some(game => game.matchId === matchId);
            const isSurrender = gameResults.results.surrenderWins.some(game => game.matchId === matchId) ||
                              gameResults.results.surrenderLosses.some(game => game.matchId === matchId);

            // console.log(`Match ${matchId} outcome check:`, {
            //     isWin,
            //     isSurrender,
            //     inWinsArray: gameResults.results.wins.map(g => g.matchId),
            //     inLossesArray: gameResults.results.losses.map(g => g.matchId)
            // });

            gameStats.playerStats.outcome.result = isWin 
                ? (isSurrender ? 'surrenderWin' : 'win')
                : (isSurrender ? 'surrenderLoss' : 'loss');
            gameStats.playerStats.outcome.surrender = isSurrender;

            // console.log(`Final outcome for match ${matchId}:`, gameStats.playerStats.outcome);

            const participantInfo = getParticipantInfo(allEvents);
            if (!participantInfo) {
                console.warn(`Skipping match ${matchId} - cannot determine participant info`);
                continue;
            }

            const playerParticipantId = findPlayerParticipantId(allEvents);
            if (!playerParticipantId) {
                console.warn(`Skipping match ${matchId} - cannot determine player's participantId`);
                continue;
            }

            const teamParticipantIds = playerParticipantId <= 5 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10];

            processMatchEvents(allEvents, playerParticipantId, teamParticipantIds, aggregateStats, gameStats, matchId, matchStats);

            individualGameStats.push(gameStats);
        }

        return { 
            aggregateStats,
            individualGameStats
        };

    } catch (error) {
        console.error('Error analyzing player stats:', error);
        return null;
    }
}

function findPlayerParticipantId(events) {
    for (const event of events) {
        if (event.participantId) return event.participantId;
    }
    return null;
}

function getParticipantInfo(events) {
    return events.some(event => 
        event.type === 'CHAMPION_KILL' || 
        event.type === 'ITEM_PURCHASED' ||
        event.type === 'SKILL_LEVEL_UP' ||
        event.type === 'LEVEL_UP'
    );
}

function processMatchEvents(events, playerParticipantId, teamParticipantIds, stats, gameStats, matchId, matchStats) {
    events.forEach(event => {
        switch (event.type) {
            case 'CHAMPION_KILL': processChampionKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId, matchStats); break;
            case 'BUILDING_KILL': processBuildingKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId); break;
            case 'ELITE_MONSTER_KILL': processMonsterKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId); break;
            case 'ITEM_PURCHASED': processItemPurchase(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId); break;
        }
    });
}

async function processChampionKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId, matchStats) {
    event.matchId = matchId;
    const timestamp = event.timestamp / 1000;

    // Process killer
    if (event.killerId === playerParticipantId) {
        stats.playerStats.basicStats.kills.count++;
        stats.playerStats.basicStats.kills.timestamps.push(timestamp);
        stats.playerStats.events.push({ ...event, timestamp });
        gameStats.playerStats.basicStats.kills.count++;
        gameStats.playerStats.basicStats.kills.timestamps.push(timestamp);
    } else if (teamParticipantIds.includes(event.killerId)) {
        stats.teamStats.basicStats.kills.count++;
        stats.teamStats.basicStats.kills.timestamps.push(timestamp);
        stats.teamStats.events.push({ ...event, timestamp });
        gameStats.teamStats.basicStats.kills.count++;
        gameStats.teamStats.basicStats.kills.timestamps.push(timestamp);
    } else {
        stats.enemyStats.basicStats.kills.count++;
        stats.enemyStats.basicStats.kills.timestamps.push(timestamp);
        stats.enemyStats.events.push({ ...event, timestamp });
        gameStats.enemyStats.basicStats.kills.count++;
        gameStats.enemyStats.basicStats.kills.timestamps.push(timestamp);
    }

    // Process victim
    if (event.victimId === playerParticipantId) {
        stats.playerStats.basicStats.deaths.count++;
        stats.playerStats.basicStats.deaths.timestamps.push(timestamp);
        stats.playerStats.events.push({ ...event, timestamp });
        gameStats.playerStats.basicStats.deaths.count++;
        gameStats.playerStats.basicStats.deaths.timestamps.push(timestamp);
    } else if (teamParticipantIds.includes(event.victimId)) {
        stats.teamStats.basicStats.deaths.count++;
        stats.teamStats.basicStats.deaths.timestamps.push(timestamp);
        stats.teamStats.events.push({ ...event, timestamp });
        gameStats.teamStats.basicStats.deaths.count++;
        gameStats.teamStats.basicStats.deaths.timestamps.push(timestamp);
    } else {
        stats.enemyStats.basicStats.deaths.count++;
        stats.enemyStats.basicStats.deaths.timestamps.push(timestamp);
        stats.enemyStats.events.push({ ...event, timestamp });
        gameStats.enemyStats.basicStats.deaths.count++;
        gameStats.enemyStats.basicStats.deaths.timestamps.push(timestamp);
    }

    // Process assists
    if (event.assistingParticipantIds) {
        event.assistingParticipantIds.forEach(assisterId => {
            if (assisterId === playerParticipantId) {
                stats.playerStats.basicStats.assists.count++;
                stats.playerStats.basicStats.assists.timestamps.push(timestamp);
                stats.playerStats.events.push({ ...event, timestamp });
                gameStats.playerStats.basicStats.assists.count++;
                gameStats.playerStats.basicStats.assists.timestamps.push(timestamp);
            } else if (teamParticipantIds.includes(assisterId)) {
                stats.teamStats.basicStats.assists.count++;
                stats.teamStats.basicStats.assists.timestamps.push(timestamp);
                stats.teamStats.events.push({ ...event, timestamp });
                gameStats.teamStats.basicStats.assists.count++;
                gameStats.teamStats.basicStats.assists.timestamps.push(timestamp);
            } else {
                stats.enemyStats.basicStats.assists.count++;
                stats.enemyStats.basicStats.assists.timestamps.push(timestamp);
                stats.enemyStats.events.push({ ...event, timestamp });
                gameStats.enemyStats.basicStats.assists.count++;
                gameStats.enemyStats.basicStats.assists.timestamps.push(timestamp);
            }
        });
    }

    // Calculate KDA for player, team, and enemy stats
    const updateKDA = (basicStats) => {
        // Ensure all necessary structures exist
        if (!basicStats.kda) {
            basicStats.kda = { 
                total: 0, 
                history: { 
                    count: [], 
                    timestamps: [],
                    raw: [] 
                } 
            };
        }
        const kills = basicStats.kills?.count || 0;
        const assists = basicStats.assists?.count || 0;
        const deaths = basicStats.deaths?.count || 1;
        const kdaRatio = (kills + assists) / deaths;
        
        basicStats.kda.total = kdaRatio;
        
        // Ensure history arrays exist before pushing
        if (!Array.isArray(basicStats.kda.history.count)) {
            basicStats.kda.history.count = [];
        }
        if (!Array.isArray(basicStats.kda.history.timestamps)) {
            basicStats.kda.history.timestamps = [];
        }
        if (!Array.isArray(basicStats.kda.history.raw)) {
            basicStats.kda.history.raw = [];
        }
        
        // Push to raw, count, and timestamps
        basicStats.kda.history.raw.push(kdaRatio);
        basicStats.kda.history.count.push(kdaRatio);
        basicStats.kda.history.timestamps.push(timestamp);
    };

    // Update KDA for player, team, and enemy stats
    updateKDA(stats.playerStats.basicStats);
    updateKDA(stats.teamStats.basicStats);
    updateKDA(stats.enemyStats.basicStats);

    // Repeat for gameStats
    updateKDA(gameStats.playerStats.basicStats);
    updateKDA(gameStats.teamStats.basicStats);
    updateKDA(gameStats.enemyStats.basicStats);

    // Determine participant type
    const getParticipantType = (participantId) => {
        if (participantId === playerParticipantId) return 'playerStats';
        return teamParticipantIds.includes(participantId) ? 'teamStats' : 'enemyStats';
    };

    // Process time spent dead
    const updateTimeSpentDead = async (statsObj, victimId, timestamp, matchStats) => {
        if (!statsObj.basicStats) {
            statsObj.basicStats = { timeSpentDead: [] };
        }

        const currentMinutes = Math.floor(timestamp);

        // Filter the matchStats array to get the relevant match information
        const matchInfo = matchStats.find(match => match.info);

        if (!matchInfo) {
            console.warn('No match info found in matchStats:', { matchStats });
            return;
        }

        // Log matchInfo to debug
        // console.log('matchInfo:', matchInfo);

        // Log matchInfo.frames to debug
        // console.log('matchInfo.frames:', matchInfo?.info?.frames);

        // Find the participant frame that matches the event.victimId
        let participantFrame;
        let closestFrame;
        let smallestDifference = Infinity;

        for (const frame of matchInfo.info.frames) {
            for (const e of frame.events) {
                const difference = Math.abs(e.timestamp - event.timestamp);
                if (difference <= 5000 && e.victimId === victimId) {
                    participantFrame = frame.participantFrames[victimId];
                    break;
                }
                if (difference < smallestDifference) {
                    smallestDifference = difference;
                    closestFrame = frame;
                }
            }
            if (participantFrame) break;
        }

        if (!participantFrame && closestFrame) {
            participantFrame = closestFrame.participantFrames[victimId];
            // console.warn('Using closest participant frame for victimId:', { victimId, expectedTimestamp: event.timestamp, closestFrame });
        }

        if (!participantFrame) {
            console.warn('No participant frame found for victimId:', { victimId, expectedTimestamp: event.timestamp, participantFrames: matchInfo?.info?.frames });
            return;
        }

        // console.log('Found participant frame:', participantFrame);

        const level = participantFrame.level;
        // console.log('Participant level:', level);

        const deathTimer = await calculateDeathTimer(currentMinutes, level);

        const previousTotalTimeSpentDead = statsObj.basicStats.timeSpentDead.reduce((acc, death) => acc + death.expectedDeathTimer, 0);
        const totalTimeSpentDead = previousTotalTimeSpentDead + deathTimer;

        statsObj.basicStats.timeSpentDead.push({
            deathTime: timestamp,
            deathLevel: level,
            expectedDeathTimer: deathTimer,
            totalDeathTime: totalTimeSpentDead
        });
    };

    const participantType = getParticipantType(event.victimId);
    await updateTimeSpentDead(stats[participantType], event.victimId, timestamp, matchStats);
    await updateTimeSpentDead(gameStats[participantType], event.victimId, timestamp, matchStats);
}

function processBuildingKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId) {
    event.matchId = matchId;
    const timestamp = (event.timestamp / 1000);

    if (event.killerId === playerParticipantId) {
        stats.playerStats.objectives.turrets.count++;
        stats.playerStats.objectives.turrets.timestamps.push(timestamp);
        stats.playerStats.events.push({ ...event, timestamp });
        gameStats.playerStats.objectives.turrets.count++;
        gameStats.playerStats.objectives.turrets.timestamps.push(timestamp);
    } else if (teamParticipantIds.includes(event.killerId)) {
        stats.teamStats.objectives.turrets.count++;
        stats.teamStats.objectives.turrets.timestamps.push(timestamp);
        stats.teamStats.events.push({ ...event, timestamp });
        gameStats.teamStats.objectives.turrets.count++;
        gameStats.teamStats.objectives.turrets.timestamps.push(timestamp);
    } else {
        stats.enemyStats.objectives.turrets.count++;
        stats.enemyStats.objectives.turrets.timestamps.push(timestamp);
        stats.enemyStats.events.push({ ...event, timestamp });
        gameStats.enemyStats.objectives.turrets.count++;
        gameStats.enemyStats.objectives.turrets.timestamps.push(timestamp);
    }

    if (event.buildingType === 'TOWER_BUILDING') {
        const towerType = event.towerType.toLowerCase().replace('_turret', '');
        if (event.killerId === playerParticipantId) {
            stats.playerStats.objectives.towerKills[towerType].count++;
            stats.playerStats.objectives.towerKills[towerType].timestamps.push(timestamp);
            gameStats.playerStats.objectives.towerKills[towerType].count++;
            gameStats.playerStats.objectives.towerKills[towerType].timestamps.push(timestamp);
        } else if (teamParticipantIds.includes(event.killerId)) {
            stats.teamStats.objectives.towerKills[towerType].count++;
            stats.teamStats.objectives.towerKills[towerType].timestamps.push(timestamp);
            gameStats.teamStats.objectives.towerKills[towerType].count++;
            gameStats.teamStats.objectives.towerKills[towerType].timestamps.push(timestamp);
        } else {
            stats.enemyStats.objectives.towerKills[towerType].count++;
            stats.enemyStats.objectives.towerKills[towerType].timestamps.push(timestamp);
            gameStats.enemyStats.objectives.towerKills[towerType].count++;
            gameStats.enemyStats.objectives.towerKills[towerType].timestamps.push(timestamp);
        }
    } else if (event.buildingType === 'INHIBITOR_BUILDING') {
        if (event.killerId === playerParticipantId) {
            stats.playerStats.objectives.inhibitors.count++;
            stats.playerStats.objectives.inhibitors.timestamps.push(timestamp);
            gameStats.playerStats.objectives.inhibitors.count++;
            gameStats.playerStats.objectives.inhibitors.timestamps.push(timestamp);
        } else if (teamParticipantIds.includes(event.killerId)) {
            stats.teamStats.objectives.inhibitors.count++;
            stats.teamStats.objectives.inhibitors.timestamps.push(timestamp);
            gameStats.teamStats.objectives.inhibitors.count++;
            gameStats.teamStats.objectives.inhibitors.timestamps.push(timestamp);
        } else {
            stats.enemyStats.objectives.inhibitors.count++;
            stats.enemyStats.objectives.inhibitors.timestamps.push(timestamp);
            gameStats.enemyStats.objectives.inhibitors.count++;
            gameStats.enemyStats.objectives.inhibitors.timestamps.push(timestamp);
        }
    }

    //stats.events.push({ type: 'buildingKill', timestamp, details: event });
}

function processMonsterKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId) {
    event.matchId = matchId;
    const timestamp = (event.timestamp / 1000);

    if (event.killerId === playerParticipantId) {
        stats.playerStats.objectives.eliteMonsterKills.count++;
        stats.playerStats.objectives.eliteMonsterKills.timestamps.push(timestamp);
        stats.playerStats.events.push({ ...event, timestamp });
        gameStats.playerStats.objectives.eliteMonsterKills.count++;
        gameStats.playerStats.objectives.eliteMonsterKills.timestamps.push(timestamp);
    } else if (teamParticipantIds.includes(event.killerId)) {
        stats.teamStats.objectives.eliteMonsterKills.count++;
        stats.teamStats.objectives.eliteMonsterKills.timestamps.push(timestamp);
        stats.teamStats.events.push({ ...event, timestamp });
        gameStats.teamStats.objectives.eliteMonsterKills.count++;
        gameStats.teamStats.objectives.eliteMonsterKills.timestamps.push(timestamp);
    } else {
        stats.enemyStats.objectives.eliteMonsterKills.count++;
        stats.enemyStats.objectives.eliteMonsterKills.timestamps.push(timestamp);
        stats.enemyStats.events.push({ ...event, timestamp });
        gameStats.enemyStats.objectives.eliteMonsterKills.count++;
        gameStats.enemyStats.objectives.eliteMonsterKills.timestamps.push(timestamp);
    }

    if (event.monsterType === 'DRAGON') {
        if (event.killerId === playerParticipantId) {
            stats.playerStats.objectives.dragons.count++;
            stats.playerStats.objectives.dragons.timestamps.push(timestamp);
            stats.playerStats.events.push({ ...event, timestamp });
            gameStats.playerStats.objectives.dragons.count++;
            gameStats.playerStats.objectives.dragons.timestamps.push(timestamp);
        } else if (teamParticipantIds.includes(event.killerId)) {
            stats.teamStats.objectives.dragons.count++;
            stats.teamStats.objectives.dragons.timestamps.push(timestamp);
            stats.teamStats.events.push({ ...event, timestamp });
            gameStats.teamStats.objectives.dragons.count++;
            gameStats.teamStats.objectives.dragons.timestamps.push(timestamp);
        } else {
            stats.enemyStats.objectives.dragons.count++;
            stats.enemyStats.objectives.dragons.timestamps.push(timestamp);
            stats.enemyStats.events.push({ ...event, timestamp });
            gameStats.enemyStats.objectives.dragons.count++;
            gameStats.enemyStats.objectives.dragons.timestamps.push(timestamp);
        }

    } else if (event.monsterType === 'BARON_NASHOR') {
        if (event.killerId === playerParticipantId) {
            stats.playerStats.objectives.barons.count++;
            stats.playerStats.objectives.barons.timestamps.push(timestamp);
            stats.playerStats.events.push({ ...event, timestamp });
            gameStats.playerStats.objectives.barons.count++;
            gameStats.playerStats.objectives.barons.timestamps.push(timestamp);
        } else if (teamParticipantIds.includes(event.killerId)) {
            stats.teamStats.objectives.barons.count++;
            stats.teamStats.objectives.barons.timestamps.push(timestamp);
            stats.teamStats.events.push({ ...event, timestamp });
            gameStats.teamStats.objectives.barons.count++;
            gameStats.teamStats.objectives.barons.timestamps.push(timestamp);
        } else {
            stats.enemyStats.objectives.barons.count++;
            stats.enemyStats.objectives.barons.timestamps.push(timestamp);
            stats.enemyStats.events.push({ ...event, timestamp });
            gameStats.enemyStats.objectives.barons.count++;
            gameStats.enemyStats.objectives.barons.timestamps.push(timestamp);
        }

    } else if (event.monsterType === 'ELDER_DRAGON') {
        if (event.killerId === playerParticipantId) {
            stats.playerStats.objectives.elders.count++;
            stats.playerStats.objectives.elders.timestamps.push(timestamp);
            stats.playerStats.events.push({ ...event, timestamp });
            gameStats.playerStats.objectives.elders.count++;
            gameStats.playerStats.objectives.elders.timestamps.push(timestamp);
        } else if (teamParticipantIds.includes(event.killerId)) {
            stats.teamStats.objectives.elders.count++;
            stats.teamStats.objectives.elders.timestamps.push(timestamp);
            stats.teamStats.events.push({ ...event, timestamp });
            gameStats.teamStats.objectives.elders.count++;
            gameStats.teamStats.objectives.elders.timestamps.push(timestamp);
        } else {
            stats.enemyStats.objectives.elders.count++;
            stats.enemyStats.objectives.elders.timestamps.push(timestamp);
            stats.enemyStats.events.push({ ...event, timestamp });
            gameStats.enemyStats.objectives.elders.count++;
            gameStats.enemyStats.objectives.elders.timestamps.push(timestamp);
        }
    }
    //stats.events.push({ type: 'monsterKill', timestamp, details: event });
}



// Helper function to initialize economy stats
function initializeEconomyStats(target) {
    target.economy = target.economy || {};
    target.economy.itemPurchases = target.economy.itemPurchases || { count: 0, timestamps: [], items: [] };
    target.economy.itemGold = target.economy.itemGold || { total: 0, history: { count: [], timestamps: [] } };
    target.events = target.events || [];
}

// Helper function to update stats
function updateStats(target, event, itemDetails, timestamp) {
    // Add running total to item purchases
    const itemGold = itemDetails?.gold?.base || 0;
    const lastTotal = target.economy.itemPurchases.items.length > 0 
    ? target.economy.itemPurchases.items[target.economy.itemPurchases.items.length - 1].totalGold 
    : 0;
    const totalGold = lastTotal + itemGold;

    target.economy.itemPurchases.count++;
    target.economy.itemPurchases.timestamps.push(timestamp);
    target.economy.itemPurchases.items.push({
        itemName: itemDetails.name || 'Unknown',
        itemId: event.itemId,
        timestamp,
        gold: itemDetails.gold.base || 0,
        totalGold: totalGold
    });
    target.economy.itemGold.total += itemDetails.gold.base || 0;
    target.economy.itemGold.history.count.push(itemDetails.gold.base || 0);
    target.economy.itemGold.history.timestamps.push(timestamp);
    target.events.push({ ...event, timestamp, itemDetails });
}

// Track destroyed items, including multiple instances of the same item
function trackDestroyedItems(participantId, componentIds) {
    if (!destroyedItems.has(participantId)) {
        destroyedItems.set(participantId, new Map());
    }
    const participantDestroyedItems = destroyedItems.get(participantId);

    componentIds.forEach(itemId => {
        participantDestroyedItems.set(
            itemId,
            (participantDestroyedItems.get(itemId) || 0) + 1
        );
    });
}

// Check if an item is destroyed and reduce its count if so
function wasItemDestroyed(participantId, itemId) {
    const participantDestroyedItems = destroyedItems.get(participantId);
    if (!participantDestroyedItems || !participantDestroyedItems.has(itemId)) {
        return false;
    }
    const count = participantDestroyedItems.get(itemId);
    if (count > 1) {
        participantDestroyedItems.set(itemId, count - 1);
    } else {
        participantDestroyedItems.delete(itemId);
    }
    return true;
}

// Process when an item is destroyed explicitly
export function processItemDestroyed(event) {
    if (event.type === 'ITEM_DESTROYED') {
        trackDestroyedItems(event.participantId, [event.itemId]);
    }
}

// Process item purchase with component tracking
export async function processItemPurchase(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId) {
    if (event.type !== 'ITEM_PURCHASED') return stats;

    event.matchId = matchId;

    // Fetch item details
    let itemDetails = { gold: { total: 0 }, from: [] };
    try {
        if (event.itemId) {
            itemDetails = await getItemDetails(event.itemId.toString());
        }
    } catch (error) {
        console.warn(`Failed to fetch details for item ${event.itemId}, proceeding without component logic:`, error);
    }

    const timestamp = event.timestamp / 1000;

    // Check if the item is built from components
    if (itemDetails.from && itemDetails.from.length > 0) {
        const components = [...itemDetails.from];
        const destroyed = [];
        for (const component of components) {
            if (!wasItemDestroyed(event.participantId, component)) {
                destroyed.push(component);
            }
        }
        // Track components used for the new item
        trackDestroyedItems(event.participantId, destroyed);
    }

    // Prevent processing if the item itself was already destroyed
    if (wasItemDestroyed(event.participantId, event.itemId)) return stats;

    // Initialize stats objects
    [stats, gameStats].forEach(target => {
        initializeEconomyStats(target.playerStats || {});
        initializeEconomyStats(target.teamStats || {});
        initializeEconomyStats(target.enemyStats || {});
    });

    if (event.participantId === playerParticipantId) {
        updateStats(stats.playerStats, event, itemDetails, timestamp);
        updateStats(gameStats.playerStats, event, itemDetails, timestamp);
    } else if (teamParticipantIds.includes(event.participantId)) {
        updateStats(stats.teamStats, event, itemDetails, timestamp);
        updateStats(gameStats.teamStats, event, itemDetails, timestamp);
    } else {
        updateStats(stats.enemyStats, event, itemDetails, timestamp);
        updateStats(gameStats.enemyStats, event, itemDetails, timestamp);
    }

    return stats;
}

const BRW = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5];

async function getTimeIncreaseFactor(currentMinutes) {
    if (currentMinutes < 15) return 0;
    if (currentMinutes < 30) {
        return Math.min(Math.ceil(2 * (currentMinutes - 15)) * 0.00425, 0.1275);
    } else if (currentMinutes < 45) {
        return Math.min(0.1275 + Math.ceil(2 * (currentMinutes - 30)) * 0.003, 0.2175);
    } else if (currentMinutes < 55) {
        return Math.min(0.2175 + Math.ceil(2 * (currentMinutes - 45)) * 0.0145, 0.50);
    }
    return 0.50; // Cap at 50%
}

async function calculateDeathTimer(currentMinutes, level) {
    
    const baseRespawnWait = BRW[level - 1];
    const timeIncreaseFactor = await getTimeIncreaseFactor(currentMinutes);
    const deathTimer = baseRespawnWait + (baseRespawnWait * timeIncreaseFactor);

    // console.log(`Player: ${activePlayerName}, Level: ${level}, Minute: ${currentMinutes}, Base Respawn: ${baseRespawnWait}, Factor: ${timeIncreaseFactor}, Death Timer: ${deathTimer}`);
    
    return deathTimer;
}