import { analyzeMatchTimelineForSummoner } from '../features/matchTimeline.js';
import { getItemDetails } from '../features/getItemsAndPrices.js';

const destroyedItems = new Map();

function initializeStats() {
    return {
        kills: 0,
        deaths: 0,
        assists: 0,
        buildingKills: 0,
        towerKills: {
            outer: 0,
            inner: 0,
            base: 0,
            nexus: 0
        },
        inhibitorKills: 0,
        eliteMonsterKills: 0,
        itemPurchases: 0,
        itemGold: 0,
        events: []
    };
}

export async function analyzePlayerStats(matchStats, puuid) {
    try {
        
        destroyedItems.clear();
        
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

        // Initialize aggregate stats
        const aggregateStats = {
            playerStats: initializeStats(),
            teamStats: initializeStats(),
            enemyStats: initializeStats()
        };

        // Process each match
        for (const match of matchTimelines) {
            console.log('Processing match:', match.matchId);
            const { matchId, allEvents, metadata } = match;
            
            if (!allEvents || !Array.isArray(allEvents)) {
                console.warn(`Skipping match ${matchId} due to missing events`);
                continue;
            }

            // Log first few events for debugging
            console.log('First few events:', allEvents.slice(0, 5));

            // Get participant IDs for the match
            const participantInfo = getParticipantInfo(allEvents);
            if (!participantInfo) {
                console.warn(`Skipping match ${matchId} - cannot determine participant info`);
                continue;
            }

            // Determine player's participantId based on first event involving them
            const playerParticipantId = findPlayerParticipantId(allEvents);
            if (!playerParticipantId) {
                console.warn(`Skipping match ${matchId} - cannot determine player's participantId`);
                continue;
            }

            const teamParticipantIds = playerParticipantId <= 5 ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10];

            processMatchEvents(
                allEvents,
                playerParticipantId,
                teamParticipantIds,
                aggregateStats,
                matchId
            );
        }

        console.log('Aggregate player stats:', aggregateStats.playerStats);
        console.log('Aggregate team stats:', aggregateStats.teamStats);
        console.log('Aggregate enemy stats:', aggregateStats.enemyStats);

        return aggregateStats;
    } catch (error) {
        console.error('Error analyzing player stats:', error);
        return null;
    }
}

function findPlayerParticipantId(events) {
    for (const event of events) {
        if (event.participantId) {
            console.log('Found event with participantId:', event);
            return event.participantId;
        }
    }
    return null;
}

function getParticipantInfo(events) {
    const validEvent = events.find(event => 
        event.type === 'CHAMPION_KILL' || 
        event.type === 'ITEM_PURCHASED' ||
        event.type === 'SKILL_LEVEL_UP' ||
        event.type === 'LEVEL_UP'
    );

    return validEvent ? true : null;
}

function processMatchEvents(events, playerParticipantId, teamParticipantIds, stats, matchId) {
    events.forEach(event => {
        switch (event.type) {
            case 'CHAMPION_KILL':
                processChampionKill(event, playerParticipantId, teamParticipantIds, stats, matchId);
                break;
            case 'BUILDING_KILL':
                processBuildingKill(event, playerParticipantId, teamParticipantIds, stats, matchId);
                break;
            case 'ELITE_MONSTER_KILL':
                processMonsterKill(event, playerParticipantId, teamParticipantIds, stats, matchId);
                break;
            case 'ITEM_PURCHASED':
                processItemPurchase(event, playerParticipantId, teamParticipantIds, stats, matchId);
                break;
        }
    });
}

function processChampionKill(event, playerParticipantId, teamParticipantIds, stats, matchId) {
    event.matchId = matchId;

    if (event.killerId === playerParticipantId) {
        stats.playerStats.kills++;
        stats.playerStats.events.push(event);
    } else if (teamParticipantIds.includes(event.killerId)) {
        stats.teamStats.kills++;
        stats.teamStats.events.push(event);
    } else {
        stats.enemyStats.kills++;
        stats.enemyStats.events.push(event);
    }

    if (event.victimId === playerParticipantId) {
        stats.playerStats.deaths++;
    } else if (teamParticipantIds.includes(event.victimId)) {
        stats.teamStats.deaths++;
    } else {
        stats.enemyStats.deaths++;
    }

    if (event.assistingParticipantIds) {
        event.assistingParticipantIds.forEach(assisterId => {
            if (assisterId === playerParticipantId) {
                stats.playerStats.assists++;
            } else if (teamParticipantIds.includes(assisterId)) {
                stats.teamStats.assists++;
            } else {
                stats.enemyStats.assists++;
            }
        });
    }
}

function processBuildingKill(event, playerParticipantId, teamParticipantIds, stats, matchId) {
    event.matchId = matchId;

    if (event.killerId === playerParticipantId) {
        stats.playerStats.buildingKills++;
        stats.playerStats.events.push(event);
    } else if (teamParticipantIds.includes(event.killerId)) {
        stats.teamStats.buildingKills++;
        stats.teamStats.events.push(event);
    } else {
        stats.enemyStats.buildingKills++;
        stats.enemyStats.events.push(event);
    }

    if (event.buildingType === 'TOWER_BUILDING') {
        switch (event.towerType) {
            case 'OUTER_TURRET':
                if (event.killerId === playerParticipantId) {
                    stats.playerStats.towerKills.outer++;
                } else if (teamParticipantIds.includes(event.killerId)) {
                    stats.teamStats.towerKills.outer++;
                } else {
                    stats.enemyStats.towerKills.outer++;
                }
                break;
            case 'INNER_TURRET':
                if (event.killerId === playerParticipantId) {
                    stats.playerStats.towerKills.inner++;
                } else if (teamParticipantIds.includes(event.killerId)) {
                    stats.teamStats.towerKills.inner++;
                } else {
                    stats.enemyStats.towerKills.inner++;
                }
                break;
            case 'BASE_TURRET':
                if (event.killerId === playerParticipantId) {
                    stats.playerStats.towerKills.base++;
                } else if (teamParticipantIds.includes(event.killerId)) {
                    stats.teamStats.towerKills.base++;
                } else {
                    stats.enemyStats.towerKills.base++;
                }
                break;
            case 'NEXUS_TURRET':
                if (event.killerId === playerParticipantId) {
                    stats.playerStats.towerKills.nexus++;
                } else if (teamParticipantIds.includes(event.killerId)) {
                    stats.teamStats.towerKills.nexus++;
                } else {
                    stats.enemyStats.towerKills.nexus++;
                }
                break;
            default:
                break;
        }
    } else if (event.buildingType === 'INHIBITOR_BUILDING') {
        if (event.killerId === playerParticipantId) {
            stats.playerStats.inhibitorKills++;
        } else if (teamParticipantIds.includes(event.killerId)) {
            stats.teamStats.inhibitorKills++;
        } else {
            stats.enemyStats.inhibitorKills++;
        }
    }
}

function processMonsterKill(event, playerParticipantId, teamParticipantIds, stats, matchId) {
    event.matchId = matchId;
    
    if (event.killerId === playerParticipantId) {
        stats.playerStats.eliteMonsterKills++;
        stats.playerStats.events.push(event);
    } else if (teamParticipantIds.includes(event.killerId)) {
        stats.teamStats.eliteMonsterKills++;
        stats.teamStats.events.push(event);
    } else { 
        stats.enemyStats.eliteMonsterKills++;
        stats.enemyStats.events.push(event);
    }
}

// Keep track of destroyed items per participant


// Helper to track destroyed items
function trackDestroyedItem(participantId, itemId) {
    if (!destroyedItems.has(participantId)) {
        destroyedItems.set(participantId, new Set());
    }
    destroyedItems.get(participantId).add(itemId);
}

// Helper to check if item was destroyed
function wasItemDestroyed(participantId, itemId) {
    return destroyedItems.get(participantId)?.has(itemId) || false;
}

// Process item destruction events
export function processItemDestroyed(event) {
    if (event.type === 'ITEM_DESTROYED') {
        trackDestroyedItem(event.participantId, event.itemId);
    }
}

export async function processItemPurchase(event, playerParticipantId, teamParticipantIds, stats, matchId) {
    // If this isn't a purchase event, ignore it
    if (event.type !== 'ITEM_PURCHASED') {
        return stats;
    }

    event.matchId = matchId;
    
    // Check if this item was later destroyed
    if (wasItemDestroyed(event.participantId, event.itemId)) {
        return stats; // Skip processing if the item was destroyed
    }

    let itemDetails;
    try {
        if (event.itemId) {
            itemDetails = await getItemDetails(event.itemId.toString());
        }
    } catch (error) {
        console.warn(`Failed to fetch details for item ${event.itemId}, proceeding without gold calculations:`, error);
        itemDetails = { gold: { total: 0 } };
    }

    if (event.participantId === playerParticipantId) {
        stats.playerStats.itemPurchases++;
        stats.playerStats.itemGold += itemDetails?.gold?.total || 0;
        event.itemDetails = itemDetails;
        stats.playerStats.events.push(event);
    } else if (teamParticipantIds.includes(event.participantId)) {
        stats.teamStats.itemPurchases++;
        stats.teamStats.itemGold += itemDetails?.gold?.total || 0;
        event.itemDetails = itemDetails;
        stats.teamStats.events.push(event);
    } else {
        stats.enemyStats.itemPurchases++;
        stats.enemyStats.itemGold += itemDetails?.gold?.total || 0;
        event.itemDetails = itemDetails;
        stats.enemyStats.events.push(event);
    }

    return stats;
}
