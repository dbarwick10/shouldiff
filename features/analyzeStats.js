
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
            itemPurchases: { count: 0, timestamps: [], items: [] },
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

function trackDestroyedItem(participantId, itemId) {
    if (!destroyedItems.has(participantId)) {
        destroyedItems.set(participantId, new Set());
    }
    destroyedItems.get(participantId).add(itemId);
}

function wasItemDestroyed(participantId, itemId) {
    return destroyedItems.get(participantId)?.has(itemId) || false;
}

export function processItemDestroyed(event) {
    if (event.type === 'ITEM_DESTROYED') {
        trackDestroyedItem(event.participantId, event.itemId);
    }
}

export async function processItemPurchase(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId) {
    if (event.type !== 'ITEM_PURCHASED') return stats;

    event.matchId = matchId;
    if (wasItemDestroyed(event.participantId, event.itemId)) return stats;

    let itemDetails;
    try {
        if (event.itemId) {
            itemDetails = await getItemDetails(event.itemId.toString());
        }
    } catch (error) {
        console.warn(`Failed to fetch details for item ${event.itemId}, proceeding without gold calculations:`, error);
        itemDetails = { gold: { total: 0 } };
    }

    const timestamp = (event.timestamp / 1000);

    // Ensure stats object and its nested properties are initialized
    stats.economy = stats.economy || {};
    stats.economy.itemPurchases = stats.economy.itemPurchases || { count: 0, timestamps: [], items: [] };
    stats.economy.itemGold = stats.economy.itemGold || { total: 0, history: { count: 0, timestamps: [] } };
    stats.playerStats = stats.playerStats || { economy: { itemPurchases: { count: 0, timestamps: [], items: [] }, itemGold: { total: 0, history: { count: [], timestamps: [] } } }, events: [] };
    stats.teamStats = stats.teamStats || { economy: { itemPurchases: { count: 0, timestamps: [], items: [] }, itemGold: { total: 0, history: { count: [], timestamps: [] } } }, events: [] };
    stats.enemyStats = stats.enemyStats || { economy: { itemPurchases: { count: 0, timestamps: [], items: [] }, itemGold: { total: 0, history: { count: [], timestamps: [] } } }, events: [] };

    if (event.participantId === playerParticipantId) {
        stats.playerStats.economy.itemPurchases.count++;
        stats.playerStats.economy.itemPurchases.timestamps.push(timestamp);
        stats.playerStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        stats.playerStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        stats.playerStats.economy.itemGold.history.count.push(itemDetails?.gold?.total || 0);
        stats.playerStats.economy.itemGold.history.timestamps.push(timestamp);
        gameStats.playerStats.economy.itemPurchases.count++;
        gameStats.playerStats.economy.itemPurchases.timestamps.push(timestamp);
        gameStats.playerStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        gameStats.playerStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        gameStats.playerStats.economy.itemGold.history.count.push(itemDetails?.gold?.total || 0);
        gameStats.playerStats.economy.itemGold.history.timestamps.push(timestamp);
    } else if (teamParticipantIds.includes(event.participantId)) {
        stats.teamStats.economy.itemPurchases.count++;
        stats.teamStats.economy.itemPurchases.timestamps.push(timestamp);
        stats.teamStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        stats.teamStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        stats.teamStats.economy.itemGold.history.count.push(itemDetails?.gold?.total || 0);
        stats.teamStats.economy.itemGold.history.timestamps.push(timestamp);
        stats.teamStats.events.push({ ...event, timestamp, itemDetails });
        gameStats.teamStats.economy.itemPurchases.count++;
        gameStats.teamStats.economy.itemPurchases.timestamps.push(timestamp);
        gameStats.teamStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        gameStats.teamStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        gameStats.teamStats.economy.itemGold.history.count.push(itemDetails?.gold?.total || 0);
        gameStats.teamStats.economy.itemGold.history.timestamps.push(timestamp);
    } else {
        stats.enemyStats.economy.itemPurchases.count++;
        stats.enemyStats.economy.itemPurchases.timestamps.push(timestamp);
        stats.enemyStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        stats.enemyStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        stats.enemyStats.economy.itemGold.history.count.push(itemDetails?.gold?.total || 0);
        stats.enemyStats.economy.itemGold.history.timestamps.push(timestamp);
        stats.enemyStats.events.push({ ...event, timestamp, itemDetails });
        gameStats.enemyStats.economy.itemPurchases.count++;
        gameStats.enemyStats.economy.itemPurchases.timestamps.push(timestamp);
        gameStats.enemyStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        gameStats.enemyStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        gameStats.enemyStats.economy.itemGold.history.count.push(itemDetails?.gold?.total || 0);
        gameStats.enemyStats.economy.itemGold.history.timestamps.push(timestamp);
    }

    return stats;
}
