import { getPlayerTeamId, getPlayerTeamMates } from "../features/playerStats.js";

export function analyzeMatchTimelineForSummoner(matchStats, puuid) {
    const analysisResult = {
        player: {
            championKills: [],
            buildingKills: [],
            eliteMonsterKills: [],
            itemPurchases: [],
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

    console.log("matchStats:", matchStats);

    // Ensure matchStats is an array and not undefined
    if (!matchStats || !Array.isArray(matchStats.matches)) {
        console.error("matchStats is not an object with a matches array or is undefined");
        return analysisResult;
    }

    // Log the structure of matchStats
    // matchStats.forEach((match, index) => {
    //     console.log(`matchStats[${index}]:`, match);
    //     if (!match.info || !match.info.participants) {
    //         console.error(`matchStats[${index}] is missing info or participants`);
    //     }
    // });

    const playerTeamId = getPlayerTeamId(matchStats, puuid);
    if (!playerTeamId) {
        console.error("Player team ID not found");
        return analysisResult;
    }

    const playerTeammates = getPlayerTeamMates(matchStats, puuid);
    if (!playerTeammates) {
        console.error("Player teammates not found");
        return analysisResult;
    }

    // Get the participantId for the given puuid
    let playerId = null;
    for (const match of matchStats) {
        const player = match.info.participants.find(p => p.puuid === puuid);
        if (player) {
            playerId = player.participantId;
            break;
        }
    }
    if (!playerId) {
        console.error("Summoner participant ID not found");
        return analysisResult;
    }

    const playerTeammateIds = playerTeammates.map(teammate => {
        const teammateParticipant = matchStats.flatMap(match => match.info.participants)
            .find(p => p.puuid === teammate.puuid);
        return teammateParticipant ? teammateParticipant.participantId : null;
    }).filter(id => id !== null);

    if (!playerTeammateIds) {
        console.error("Summoner participant ID not found");
        return analysisResult;
    }

    console.log("Processing timeline data:", matchStats);

    matchStats.forEach(match => {
        if (!match.info || !match.info.timeline || !match.info.timeline.events) {
            console.error("Match is missing timeline events");
            return;
        }

        match.info.timeline.events.forEach(event => {
            // Log the event to see its properties
            console.log("Event data:", event);

            // Ensure event is not undefined and has the expected properties
            if (!event || !event.type) {
                console.warn("Skipping invalid event", event);
                return;  // Skip invalid events
            }

            console.log("Processing event:", event);

            const participantTeamId = match.info.participants.find(p => p.participantId === event.participantId)?.teamId;

            // Check if participantTeamId is undefined
            if (participantTeamId === undefined) {
                console.warn(`Missing participantId mapping for participantId: ${event.participantId}`);
                return;  // Skip events with unknown participant ID
            }

            console.log("Participant team ID:", participantTeamId);

            switch (event.type) {
                case 'CHAMPION_KILL':
                    console.log("Processing CHAMPION_KILL event:", event);
                    if (event.killerId === playerId) {
                        console.log("Summoner is the killer:", event.killerId);
                        analysisResult.player.championKills.push({
                            victimId: event.victimId,
                            bounty: event.bounty,
                            timestamp: event.timestamp,
                            position: event.position,
                            assistingParticipantIds: event.assistingParticipantIds
                        });
                        analysisResult.player.totalChampionKills++;
                    } else if (playerTeammateIds.includes(event.killerId)) {
                        console.log("Teammate is the killer:", event.killerId);
                        analysisResult.team.championKills++;
                    } else {
                        console.log("Enemy is the killer:", event.killerId);
                        analysisResult.enemyTeam.championKills++;
                    }
                    break;

                case 'BUILDING_KILL':
                    console.log("Processing BUILDING_KILL event:", event);
                    if (event.killerId === playerId) {
                        console.log("Summoner is the killer:", event.killerId);
                        analysisResult.player.buildingKills.push({
                            buildingType: event.buildingType,
                            towerType: event.towerType,
                            laneType: event.laneType,
                            timestamp: event.timestamp,
                            position: event.position
                        });
                        analysisResult.player.totalBuildingKills++;
                    } else if (playerTeammateIds.includes(event.killerId)) {
                        console.log("Teammate is the killer:", event.killerId);
                        analysisResult.team.buildingKills++;
                    } else {
                        console.log("Enemy is the killer:", event.killerId);
                        analysisResult.enemyTeam.buildingKills++;
                    }
                    break;

                case 'ITEM_PURCHASED':
                    console.log("Processing ITEM_PURCHASED event:", event);
                    if (event.participantId === playerId) {
                        console.log("Summoner purchased an item:", event.itemId);
                        analysisResult.player.itemPurchases.push({
                            itemId: event.itemId,
                            timestamp: event.timestamp
                        });
                        analysisResult.player.totalItemsPurchased++;
                    }
                    break;

                case 'ELITE_MONSTER_KILL':
                    console.log("Processing ELITE_MONSTER_KILL event:", event);
                    if (event.killerId === playerId) {
                        console.log("Summoner is the killer:", event.killerId);
                        analysisResult.player.eliteMonsterKills.push({
                            monsterType: event.monsterType,
                            monsterSubType: event.monsterSubType || 'N/A',
                            timestamp: event.timestamp,
                            position: event.position,
                            assistingParticipantIds: event.assistingParticipantIds
                        });
                        analysisResult.player.totalEliteMonsterKills++;
                    } else if (playerTeammateIds.includes(event.killerId)) {
                        console.log("Teammate is the killer:", event.killerId);
                        analysisResult.team.eliteMonsterKills++;
                    } else {
                        console.log("Enemy is the killer:", event.killerId);
                        analysisResult.enemyTeam.eliteMonsterKills++;
                    }
                    break;

                default:
                    console.log("Unknown event type:", event.type);
            }
        });
    });

    console.log("Final analysis result:", analysisResult);

    // Ensure analysisResult is being returned correctly
    return analysisResult;
}