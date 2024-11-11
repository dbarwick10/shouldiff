export function analyzeMatchTimelineForSummoner(timelineData, summonerId, participantIdToTeamIdMap) {
    const analysisResult = {
        player: {
            championKills: [],
            buildingKills: [],
            itemPurchases: [],
            eliteMonsterKills: [],
            totalGoldSpent: 0,
            totalChampionKills: 0,
            totalBuildingKills: 0,
            totalEliteMonsterKills: 0,
            totalItemsPurchased: 0
        },
        team: {
            championKills: 0,
            buildingKills: 0,
            eliteMonsterKills: 0,
            totalGoldSpent: 0,
            totalItemsPurchased: 0
        },
        enemyTeam: {
            championKills: 0,
            buildingKills: 0,
            eliteMonsterKills: 0
        }
    };

    // Ensure timelineData is an array and not undefined
    if (!Array.isArray(timelineData)) {
        console.error("Timeline data is not an array or is undefined");
        return analysisResult;
    }

    timelineData.forEach(event => {
        // Ensure event is not undefined and has the expected properties
        if (!event || !event.type) {
            console.warn("Skipping invalid event", event);
            return;  // Skip invalid events
        }

        const participantTeamId = participantIdToTeamIdMap[event.participantId];

        // Check if participantTeamId is undefined
        if (participantTeamId === undefined) {
            console.warn(`Missing participantId mapping for participantId: ${event.participantId}`);
            return;  // Skip events with unknown participant ID
        }

        switch (event.type) {
            case 'CHAMPION_KILL':
                if (event.killerId === summonerId) {
                    analysisResult.player.championKills.push({
                        victimId: event.victimId,
                        bounty: event.bounty,
                        timestamp: event.timestamp,
                        position: event.position,
                        assistingParticipantIds: event.assistingParticipantIds
                    });
                    analysisResult.player.totalChampionKills++;
                }
                if (event.killerTeamId === participantTeamId) {
                    analysisResult.team.championKills++;
                } else if (event.killerTeamId !== participantTeamId) {
                    analysisResult.enemyTeam.championKills++;
                }
                break;

            case 'BUILDING_KILL':
                if (event.killerId === summonerId) {
                    analysisResult.player.buildingKills.push({
                        buildingType: event.buildingType,
                        towerType: event.towerType,
                        laneType: event.laneType,
                        timestamp: event.timestamp,
                        position: event.position
                    });
                    analysisResult.player.totalBuildingKills++;
                }
                if (event.killerTeamId === participantTeamId) {
                    analysisResult.team.buildingKills++;
                } else if (event.killerTeamId !== participantTeamId) {
                    analysisResult.enemyTeam.buildingKills++;
                }
                break;

            case 'ITEM_PURCHASED':
                if (event.participantId === summonerId) {
                    analysisResult.player.itemPurchases.push({
                        itemId: event.itemId,
                        timestamp: event.timestamp
                    });
                    analysisResult.player.totalItemsPurchased++;
                    const itemCost = getItemCost(event.itemId);
                    analysisResult.player.totalGoldSpent += itemCost;
                }
                if (participantTeamId === summonerId) {
                    analysisResult.team.totalItemsPurchased++;
                    const itemCost = getItemCost(event.itemId);
                    analysisResult.team.totalGoldSpent += itemCost;
                }
                break;

            case 'ELITE_MONSTER_KILL':
                if (event.killerId === summonerId) {
                    analysisResult.player.eliteMonsterKills.push({
                        monsterType: event.monsterType,
                        monsterSubType: event.monsterSubType || 'N/A',
                        timestamp: event.timestamp,
                        position: event.position,
                        assistingParticipantIds: event.assistingParticipantIds
                    });
                    analysisResult.player.totalEliteMonsterKills++;
                }
                if (event.killerTeamId === participantTeamId) {
                    analysisResult.team.eliteMonsterKills++;
                } else if (event.killerTeamId !== participantTeamId) {
                    analysisResult.enemyTeam.eliteMonsterKills++;
                }
                break;

            default:
                console.log("Unknown event type:", event.type);
        }
    });

    return analysisResult;
}

// Helper function to get item cost
function getItemCost(itemId) {
    const itemDatabase = {
        1029: 3000,  // Example: itemId 1029 corresponds to an item costing 3000 gold
        // Add other item costs here
    };
    return itemDatabase[itemId] || 0; // Return 0 if item cost is not found
}
