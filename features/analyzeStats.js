import { analyzeMatchTimelineForSummoner } from '../features/matchTimeline.js';
import { getItemDetails } from '../features/getItemsAndPrices.js';

const destroyedItems = new Map();

function initializeStats(matchId) {
    return {
        matchId,
        basicStats: {
            kills: { count: 0, timestamps: [] },
            deaths: { count: 0, timestamps: [] },
            assists: { count: 0, timestamps: [] }
        },
        objectives: {
            buildingKills: { count: 0, timestamps: [] },
            towerKills: {
                outer: { count: 0, timestamps: [] },
                inner: { count: 0, timestamps: [] },
                base: { count: 0, timestamps: [] },
                nexus: { count: 0, timestamps: [] }
            },
            inhibitorKills: { count: 0, timestamps: [] },
            eliteMonsterKills: { count: 0, timestamps: [] }
        },
        economy: {
            itemPurchases: { count: 0, timestamps: [], items: [] },
            itemGold: { 
                total: 0, 
                history: []
            }
        },
        events: []
    };
}

export async function analyzePlayerStats(matchStats, puuid) {
    try {
        destroyedItems.clear();

        // console.log('matchStats:', matchStats);
        const matches = Array.isArray(matchStats) ? matchStats : matchStats.matches;
        if (!matches || !Array.isArray(matches)) {
            console.error('Invalid matchStats structure:', matchStats);
            return null;
        }

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

            // Log the initialized stats
            // console.log('Aggregate playerStats:', aggregateStats.playerStats);
            // console.log('Aggregate teamStats:', aggregateStats.teamStats);
            // console.log('Aggregate enemyStats:', aggregateStats.enemyStats);

        for (const match of matchTimelines) {
            // console.log('Processing match:', match.matchId);
            const { matchId, allEvents, metadata } = match;
            
            if (!allEvents || !Array.isArray(allEvents)) {
                console.warn(`Skipping match ${matchId} due to missing events`);
                continue;
            }

            // Initialize stats for this match
            const gameStats = {
                playerStats: initializeStats(matchId),
                teamStats: initializeStats(matchId),
                enemyStats: initializeStats(matchId)
            };

            // Log the initialized stats for this match
            // console.log(`PlayerStats match ${matchId}:`, gameStats.playerStats);
            // console.log(`TeamStats for match ${matchId}:`, gameStats.teamStats);
            // console.log(`EnemyStats for match ${matchId}:`, gameStats.enemyStats);

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
    const timestamp = (event.timestamp / 1000);

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

    if (event.victimId === playerParticipantId) {
        stats.playerStats.basicStats.deaths.count++;
        stats.playerStats.basicStats.deaths.timestamps.push(timestamp);
        gameStats.playerStats.basicStats.deaths.count++;
        gameStats.playerStats.basicStats.deaths.timestamps.push(timestamp);
    } else if (teamParticipantIds.includes(event.victimId)) {
        stats.teamStats.basicStats.deaths.count++;
        stats.teamStats.basicStats.deaths.timestamps.push(timestamp);
        gameStats.teamStats.basicStats.deaths.count++;
        gameStats.teamStats.basicStats.deaths.timestamps.push(timestamp);
    } else {
        stats.enemyStats.basicStats.deaths.count++;
        stats.enemyStats.basicStats.deaths.timestamps.push(timestamp);
        gameStats.enemyStats.basicStats.deaths.count++;
        gameStats.enemyStats.basicStats.deaths.timestamps.push(timestamp);
    }

    if (event.assistingParticipantIds) {
        event.assistingParticipantIds.forEach(assisterId => {
            if (assisterId === playerParticipantId) {
                stats.playerStats.basicStats.assists.count++;
                stats.playerStats.basicStats.assists.timestamps.push(timestamp);
                gameStats.playerStats.basicStats.assists.count++;
                gameStats.playerStats.basicStats.assists.timestamps.push(timestamp);
            } else if (teamParticipantIds.includes(assisterId)) {
                stats.teamStats.basicStats.assists.count++;
                stats.teamStats.basicStats.assists.timestamps.push(timestamp);
                gameStats.teamStats.basicStats.assists.count++;
                gameStats.teamStats.basicStats.assists.timestamps.push(timestamp);
            } else {
                stats.enemyStats.basicStats.assists.count++;
                stats.enemyStats.basicStats.assists.timestamps.push(timestamp);
                gameStats.enemyStats.basicStats.assists.count++;
                gameStats.enemyStats.basicStats.assists.timestamps.push(timestamp);
            }
        });
    }

    //stats.events.push({ type: 'championKill', timestamp, details: event });
}

function processBuildingKill(event, playerParticipantId, teamParticipantIds, stats, gameStats, matchId) {
    event.matchId = matchId;
    const timestamp = (event.timestamp / 1000);

    if (event.killerId === playerParticipantId) {
        stats.playerStats.objectives.buildingKills.count++;
        stats.playerStats.objectives.buildingKills.timestamps.push(timestamp);
        stats.playerStats.events.push({ ...event, timestamp });
        gameStats.playerStats.objectives.buildingKills.count++;
        gameStats.playerStats.objectives.buildingKills.timestamps.push(timestamp);
    } else if (teamParticipantIds.includes(event.killerId)) {
        stats.teamStats.objectives.buildingKills.count++;
        stats.teamStats.objectives.buildingKills.timestamps.push(timestamp);
        stats.teamStats.events.push({ ...event, timestamp });
        gameStats.teamStats.objectives.buildingKills.count++;
        gameStats.teamStats.objectives.buildingKills.timestamps.push(timestamp);
    } else {
        stats.enemyStats.objectives.buildingKills.count++;
        stats.enemyStats.objectives.buildingKills.timestamps.push(timestamp);
        stats.enemyStats.events.push({ ...event, timestamp });
        gameStats.enemyStats.objectives.buildingKills.count++;
        gameStats.enemyStats.objectives.buildingKills.timestamps.push(timestamp);
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
    stats.economy.itemGold = stats.economy.itemGold || { total: 0, history: [] };
    stats.playerStats = stats.playerStats || { events: [] };
    stats.teamStats = stats.teamStats || { events: [] };
    stats.enemyStats = stats.enemyStats || { events: [] };

    if (event.participantId === playerParticipantId) {
        stats.playerStats.economy.itemPurchases.count++;
        stats.playerStats.economy.itemPurchases.timestamps.push(timestamp);
        stats.playerStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        stats.playerStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        stats.playerStats.economy.itemGold.history.push({ amount: itemDetails?.gold?.total || 0, timestamp });
        gameStats.playerStats.economy.itemPurchases.count++;
        gameStats.playerStats.economy.itemPurchases.timestamps.push(timestamp);
        gameStats.playerStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        gameStats.playerStats.economy.itemGold.history.push({ amount: itemDetails?.gold?.total || 0, timestamp });    
    } else if (teamParticipantIds.includes(event.participantId)) {
        stats.teamStats.economy.itemPurchases.count++;
        stats.teamStats.economy.itemPurchases.timestamps.push(timestamp);
        stats.teamStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        stats.teamStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        stats.teamStats.economy.itemGold.history.push({ amount: itemDetails?.gold?.total || 0, timestamp });
        stats.teamStats.events.push({ ...event, timestamp, itemDetails });
        gameStats.teamStats.economy.itemPurchases.count++;
        gameStats.teamStats.economy.itemPurchases.timestamps.push(timestamp);
        gameStats.teamStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        gameStats.teamStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        gameStats.teamStats.economy.itemGold.history.push({ amount: itemDetails?.gold?.total || 0, timestamp });
    } else {
        stats.enemyStats.economy.itemPurchases.count++;
        stats.enemyStats.economy.itemPurchases.timestamps.push(timestamp);
        stats.enemyStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        stats.enemyStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        stats.enemyStats.economy.itemGold.history.push({ amount: itemDetails?.gold?.total || 0, timestamp });
        stats.enemyStats.events.push({ ...event, timestamp, itemDetails });
        gameStats.enemyStats.economy.itemPurchases.count++;
        gameStats.enemyStats.economy.itemPurchases.timestamps.push(timestamp);
        gameStats.enemyStats.economy.itemPurchases.items.push({ itemId: event.itemId, timestamp, gold: itemDetails?.gold?.total || 0 });
        gameStats.enemyStats.economy.itemGold.total += itemDetails?.gold?.total || 0;
        gameStats.enemyStats.economy.itemGold.history.push({ amount: itemDetails?.gold?.total || 0, timestamp });
    }

    return stats;
}