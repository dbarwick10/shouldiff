
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
            assists: { count: 0, timestamps: [] },
            kda: {
                total: 0,
                history: { count: 0, timestamps: [] }
            }
        },
        objectives: {
            turretKills: { count: 0, timestamps: [] },
            towerKills: {
                outer: { count: 0, timestamps: [] },
                inner: { count: 0, timestamps: [] },
                base: { count: 0, timestamps: [] },
                nexus: { count: 0, timestamps: [] }
            },
            inhibitorKills: { count: 0, timestamps: [] },
            eliteMonsterKills: { count: [], timestamps: [] }
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
        console.log('Game results for analysis:', gameResults);

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

            processMatchEvents(allEvents, playerParticipantId, teamParticipantIds, aggregateStats, gameStats, matchId);

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

function processMatchEvents(events, playerParticipantId, teamParticipantIds, stats, gameStats, matchId) {
    events.forEach(event => {
        switch (event.type) {
            case 'CHAMPION_KILL': processChampionKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId); break;
            case 'BUILDING_KILL': processBuildingKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId); break;
            case 'ELITE_MONSTER_KILL': processMonsterKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId); break;
            case 'ITEM_PURCHASED': processItemPurchase(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId); break;
        }
    });
}

function processChampionKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId) {
    event.matchId = matchId;
    const timestamp = event.timestamp / 1000;
    
    // Determine participant type
    const getParticipantType = (participantId) => {
        if (participantId === playerParticipantId) return 'playerStats';
        return teamParticipantIds.includes(participantId) ? 'teamStats' : 'enemyStats';
    };

    // Update KDA ratio
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

    // Update stats for a specific participant type
    const updateParticipantStats = (statsObj, eventType) => {
        if (!statsObj) return;
        
        // Ensure complete stats structure exists
        if (!statsObj.basicStats) {
            statsObj.basicStats = {
                kills: { count: 0, timestamps: [] },
                deaths: { count: 0, timestamps: [] },
                assists: { count: 0, timestamps: [] },
                kda: { 
                    total: 0, 
                    history: { 
                        count: [], 
                        timestamps: [],
                        raw: []
                    } 
                }
            };
        }
        
        // Ensure specific event type structure exists
        if (!statsObj.basicStats[eventType]) {
            statsObj.basicStats[eventType] = { count: 0, timestamps: [] };
        }
        
        // Update count and timestamps
        statsObj.basicStats[eventType].count++;
        statsObj.basicStats[eventType].timestamps.push(timestamp);
        
        // Update KDA for kills, assists, and deaths
        updateKDA(statsObj.basicStats);
        
        // Add event if not a death
        if (eventType !== 'deaths') {
            if (!statsObj.events) statsObj.events = [];
            statsObj.events.push({ ...event, timestamp });
        }
    };

    // Process killer
    const killerType = getParticipantType(event.killerId);
    updateParticipantStats(stats[killerType], 'kills');
    updateParticipantStats(gameStats[killerType], 'kills');

    // Process victim
    const victimType = getParticipantType(event.victimId);
    updateParticipantStats(stats[victimType], 'deaths');
    updateParticipantStats(gameStats[victimType], 'deaths');

    // Process assists
    if (event.assistingParticipantIds) {
        event.assistingParticipantIds.forEach(assisterId => {
            const assisterType = getParticipantType(assisterId);
            updateParticipantStats(stats[assisterType], 'assists');
            updateParticipantStats(gameStats[assisterType], 'assists');
        });
    }
}

function processBuildingKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId) {
    event.matchId = matchId;
    const timestamp = (event.timestamp / 1000);

    if (event.killerId === playerParticipantId) {
        stats.playerStats.objectives.turretKills.count++;
        stats.playerStats.objectives.turretKills.timestamps.push(timestamp);
        stats.playerStats.events.push({ ...event, timestamp });
        gameStats.playerStats.objectives.turretKills.count++;
        gameStats.playerStats.objectives.turretKills.timestamps.push(timestamp);
    } else if (teamParticipantIds.includes(event.killerId)) {
        stats.teamStats.objectives.turretKills.count++;
        stats.teamStats.objectives.turretKills.timestamps.push(timestamp);
        stats.teamStats.events.push({ ...event, timestamp });
        gameStats.teamStats.objectives.turretKills.count++;
        gameStats.teamStats.objectives.turretKills.timestamps.push(timestamp);
    } else {
        stats.enemyStats.objectives.turretKills.count++;
        stats.enemyStats.objectives.turretKills.timestamps.push(timestamp);
        stats.enemyStats.events.push({ ...event, timestamp });
        gameStats.enemyStats.objectives.turretKills.count++;
        gameStats.enemyStats.objectives.turretKills.timestamps.push(timestamp);
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
            stats.playerStats.objectives.inhibitorKills.count++;
            stats.playerStats.objectives.inhibitorKills.timestamps.push(timestamp);
            gameStats.playerStats.objectives.inhibitorKills.count++;
            gameStats.playerStats.objectives.inhibitorKills.timestamps.push(timestamp);
        } else if (teamParticipantIds.includes(event.killerId)) {
            stats.teamStats.objectives.inhibitorKills.count++;
            stats.teamStats.objectives.inhibitorKills.timestamps.push(timestamp);
            gameStats.teamStats.objectives.inhibitorKills.count++;
            gameStats.teamStats.objectives.inhibitorKills.timestamps.push(timestamp);
        } else {
            stats.enemyStats.objectives.inhibitorKills.count++;
            stats.enemyStats.objectives.inhibitorKills.timestamps.push(timestamp);
            gameStats.enemyStats.objectives.inhibitorKills.count++;
            gameStats.enemyStats.objectives.inhibitorKills.timestamps.push(timestamp);
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
