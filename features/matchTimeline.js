async function analyzeMatchTimelineForSummoner(matchId, summonerName) {
    try {
        // Fetch match details first to get participant info
        const matchResponse = await fetch(`/lol/match/v5/matches/${matchId}`);
        const matchData = await matchResponse.json();
        
        // Fetch timeline data
        const timelineResponse = await fetch(`/lol/match/v5/matches/${matchId}/timeline`);
        const timelineData = await timelineResponse.json();

        // Find the target summoner's participant ID and team
        const targetParticipant = matchData.info.participants.find(
            p => p.summonerName.toLowerCase() === summonerName.toLowerCase()
        );

        if (!targetParticipant) {
            throw new Error('Summoner not found in this match');
        }

        const targetTeamId = targetParticipant.teamId;

        // Organize participants by team
        const teams = {
            playerTeam: {
                teamId: targetTeamId,
                players: {}
            },
            enemyTeam: {
                teamId: targetTeamId === 100 ? 200 : 100,
                players: {}
            }
        };

        // Initialize player data structures and organize by team
        matchData.info.participants.forEach(participant => {
            const playerData = {
                summonerName: participant.summonerName,
                championName: participant.championName,
                role: participant.teamPosition,
                stats: {
                    kills: [],
                    deaths: [],
                    assists: [],
                    levels: [],
                    itemPurchases: [],
                    deathDurations: [],
                    goldProgress: []
                }
            };

            if (participant.teamId === targetTeamId) {
                teams.playerTeam.players[participant.participantId] = playerData;
            } else {
                teams.enemyTeam.players[participant.participantId] = playerData;
            }
        });

        // Initialize objectives tracking for both teams
        const objectives = {
            playerTeam: {
                turrets: [],
                inhibitors: [],
                dragons: [],
                barons: [],
                heralds: [],
                elderDragons: []
            },
            enemyTeam: {
                turrets: [],
                inhibitors: [],
                dragons: [],
                barons: [],
                heralds: [],
                elderDragons: []
            }
        };

        // Process timeline frames
        timelineData.info.frames.forEach((frame, frameIndex) => {
            const timestamp = frame.timestamp;
            
            // Process events in each frame
            frame.events.forEach(event => {
                switch (event.type) {
                    case 'CHAMPION_KILL':
                        if (event.killerId > 0) {
                            const team = teams.playerTeam.players[event.killerId] ? 'playerTeam' : 'enemyTeam';
                            teams[team].players[event.killerId].stats.kills.push({
                                time: timestamp,
                                victim: event.victimId,
                                victimName: getParticipantName(event.victimId)
                            });
                        }

                        const victimTeam = teams.playerTeam.players[event.victimId] ? 'playerTeam' : 'enemyTeam';
                        teams[victimTeam].players[event.victimId].stats.deaths.push({
                            time: timestamp,
                            killer: event.killerId,
                            killerName: getParticipantName(event.killerId)
                        });

                        if (event.assistingParticipantIds) {
                            event.assistingParticipantIds.forEach(assistId => {
                                const assistTeam = teams.playerTeam.players[assistId] ? 'playerTeam' : 'enemyTeam';
                                teams[assistTeam].players[assistId].stats.assists.push({
                                    time: timestamp,
                                    killer: event.killerId,
                                    victim: event.victimId
                                });
                            });
                        }
                        break;

                    case 'LEVEL_UP':
                        const levelTeam = teams.playerTeam.players[event.participantId] ? 'playerTeam' : 'enemyTeam';
                        teams[levelTeam].players[event.participantId].stats.levels.push({
                            level: event.level,
                            time: timestamp
                        });
                        break;

                    case 'ITEM_PURCHASED':
                        const purchaseTeam = teams.playerTeam.players[event.participantId] ? 'playerTeam' : 'enemyTeam';
                        teams[purchaseTeam].players[event.participantId].stats.itemPurchases.push({
                            itemId: event.itemId,
                            time: timestamp,
                            cost: event.goldValue
                        });
                        break;

                    case 'BUILDING_KILL':
                        const objectiveTeam = event.teamId === targetTeamId ? 'enemyTeam' : 'playerTeam';
                        if (event.buildingType === 'TOWER_BUILDING') {
                            objectives[objectiveTeam].turrets.push({
                                killer: event.killerId,
                                killerName: getParticipantName(event.killerId),
                                position: event.position,
                                time: timestamp
                            });
                        } else if (event.buildingType === 'INHIBITOR_BUILDING') {
                            objectives[objectiveTeam].inhibitors.push({
                                killer: event.killerId,
                                killerName: getParticipantName(event.killerId),
                                position: event.position,
                                time: timestamp
                            });
                        }
                        break;

                    case 'ELITE_MONSTER_KILL':
                        const monsterTeam = event.teamId === targetTeamId ? 'playerTeam' : 'enemyTeam';
                        switch (event.monsterType) {
                            case 'DRAGON':
                                if (event.monsterSubType === 'ELDER_DRAGON') {
                                    objectives[monsterTeam].elderDragons.push({
                                        killer: event.killerId,
                                        killerName: getParticipantName(event.killerId),
                                        time: timestamp
                                    });
                                } else {
                                    objectives[monsterTeam].dragons.push({
                                        killer: event.killerId,
                                        killerName: getParticipantName(event.killerId),
                                        type: event.monsterSubType,
                                        time: timestamp
                                    });
                                }
                                break;
                            case 'RIFTHERALD':
                                objectives[monsterTeam].heralds.push({
                                    killer: event.killerId,
                                    killerName: getParticipantName(event.killerId),
                                    time: timestamp
                                });
                                break;
                            case 'BARON_NASHOR':
                                objectives[monsterTeam].barons.push({
                                    killer: event.killerId,
                                    killerName: getParticipantName(event.killerId),
                                    time: timestamp
                                });
                                break;
                        }
                        break;
                }
            });

            // Track gold progress
            frame.participantFrames && Object.entries(frame.participantFrames).forEach(([participantId, data]) => {
                const team = teams.playerTeam.players[participantId] ? 'playerTeam' : 'enemyTeam';
                teams[team].players[participantId].stats.goldProgress.push({
                    time: timestamp,
                    totalGold: data.totalGold,
                    currentGold: data.currentGold
                });
            });
        });

        // Calculate death durations for all players
        Object.values(teams).forEach(team => {
            Object.values(team.players).forEach(player => {
                player.stats.deaths.forEach((death, index) => {
                    const nextAction = [...player.stats.kills, ...player.stats.assists]
                        .filter(action => action.time > death.time)
                        .sort((a, b) => a.time - b.time)[0];
                    const deathDuration = nextAction ? nextAction.time - death.time : null;
                    player.stats.deathDurations.push({
                        deathTime: death.time,
                        duration: deathDuration
                    });
                });
            });
        });

        // Helper function to get participant name
        function getParticipantName(participantId) {
            const player = 
                teams.playerTeam.players[participantId] || 
                teams.enemyTeam.players[participantId];
            return player ? player.summonerName : 'Unknown';
        }

        return {
            targetSummoner: {
                name: summonerName,
                participantId: targetParticipant.participantId,
                championName: targetParticipant.championName,
                role: targetParticipant.teamPosition,
                stats: teams.playerTeam.players[targetParticipant.participantId].stats
            },
            teams,
            objectives,
            gameTime: timelineData.info.frames[timelineData.info.frames.length - 1].timestamp
        };
    } catch (error) {
        console.error('Error analyzing match timeline:', error);
        throw error;
    }
}

// Example usage:
try {
    const analysis = await analyzeMatchTimelineForSummoner('matchId', 'summonerName');
    console.log('Target Summoner Stats:', analysis.targetSummoner);
    console.log('Player Team:', analysis.teams.playerTeam);
    console.log('Enemy Team:', analysis.teams.enemyTeam);
    console.log('Objectives:', analysis.objectives);
} catch (error) {
    console.error('Failed to analyze match:', error);
}