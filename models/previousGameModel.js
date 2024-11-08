import { getPuuid, matchStats } from '../controllers/previousGameController.js';

export function calculatePlayerStats(matchStats, puuid) {
    const playerStats = {
        wins: [],
        losses: [],
        surrenderWins: [],
        surrenderLosses: [],
        winTime: [],
        lossTime: [],
        surrenderWinTime: [],
        surrenderLossTime: []
    };

    matchStats.forEach(match => {
        const player = match.info.participants.find(p => p.puuid === puuid);
        if (!player) return;

        const kda = (player.kills + player.assists) / (player.deaths || 1);
        const gameDuration = (match.info.gameEndTimestamp - match.info.gameStartTimestamp) / 1000;

        const gameData = {
            kda: kda,
            level: player.champLevel,
            itemGold: player.goldSpent,
            timeSpentDead: player.totalTimeSpentDead || 0,
            turretsKilled: player.turretKills || 0,
            inhibitorsKilled: player.inhibitorKills || 0,
            gameDuration: gameDuration
        };

        if (player.win) {
            playerStats.wins.push(gameData);
            playerStats.winTime.push(gameDuration);
        } else {
            playerStats.losses.push(gameData);
            playerStats.lossTime.push(gameDuration);
        }

        if (player.gameEndedInSurrender) {
            if (player.win) {
                playerStats.surrenderWins.push(gameData);
                playerStats.surrenderWinTime.push(gameDuration);
            } else {
                playerStats.surrenderLosses.push(gameData);
                playerStats.surrenderLossTime.push(gameDuration);
            }
        }
    });

    // Calculate average times
    const calculateAverage = (times) => {
        const sum = times.reduce((a, b) => a + b, 0);
        return (sum / times.length) || 0;
    };

    playerStats.averageWinTime = calculateAverage(playerStats.winTime);
    playerStats.averageLossTime = calculateAverage(playerStats.lossTime);
    playerStats.averageSurrenderWinTime = calculateAverage(playerStats.surrenderWinTime);
    playerStats.averageSurrenderLossTime = calculateAverage(playerStats.surrenderLossTime);

    playerStats.winTime = `${(playerStats.averageWinTime / 60).toFixed(0)}m ${(playerStats.averageWinTime % 60).toFixed(0)}s`
    playerStats.lossTime = `${(playerStats.averageLossTime / 60).toFixed(0)}m ${(playerStats.averageLossTime % 60).toFixed(0)}s`
    playerStats.surrenderWinTime = `${(playerStats.averageSurrenderWinTime / 60).toFixed(0)}m ${(playerStats.averageSurrenderWinTime % 60).toFixed(0)}s`
    playerStats.surrenderLossTime = `${(playerStats.averageSurrenderLossTime / 60).toFixed(0)}m ${(playerStats.averageSurrenderLossTime % 60).toFixed(0)}s`

    return playerStats;
}


export function calculateTeamStats(matchStats, puuid) {
    const teamStats = {
        wins: [],
        losses: [],
        surrenderWins: [],
        surrenderLosses: [],
    };

    matchStats.forEach(match => {
        const player = match.info.participants.find(p => p.puuid === puuid);
        if (!player) return;

        const playerTeam = match.info.participants.filter(p => p.teamId === player.teamId);
        const gameDuration = (match.info.gameEndTimestamp - match.info.gameStartTimestamp) / 1000

        const teamGameData = {
            kda: playerTeam.reduce((sum, teammate) => sum + (teammate.kills + teammate.assists) / (teammate.deaths || 1), 0) / playerTeam.length,
            level: playerTeam.reduce((sum, teammate) => sum + teammate.champLevel, 0) / playerTeam.length,
            itemGold: playerTeam.reduce((sum, teammate) => sum + teammate.goldSpent, 0) / playerTeam.length,
            timeSpentDead: playerTeam.reduce((sum, teammate) => sum + (teammate.totalTimeSpentDead || 0), 0) / playerTeam.length,
            turretsKilled: playerTeam.reduce((sum, teammate) => sum + (teammate.turretKills || 0), 0),
            inhibitorsKilled: playerTeam.reduce((sum, teammate) => sum + (teammate.inhibitorKills || 0), 0),
            gameDuration: gameDuration // Include game duration in seconds
        };

        const team = match.info.teams.find(t => t.teamId === player.teamId);
        if (team) {
            if (team.win) {
                teamStats.wins.push(teamGameData);
                if (player.gameEndedInSurrender) {
                    teamStats.surrenderWins.push(teamGameData);
                }
            } else {
                teamStats.losses.push(teamGameData);
                if (player.gameEndedInSurrender) {
                    teamStats.surrenderLosses.push(teamGameData);
                }
            }
        }
    });

    return teamStats;
}

export function calculateEnemyTeamStats(matchStats, puuid) {
    const enemyTeamStats = {
        wins: [],
        losses: [],
        surrenderWins: [],
        surrenderLosses: [],
    };

    matchStats.forEach(match => {
        const player = match.info.participants.find(p => p.puuid === puuid);
        if (!player) return;

        const enemyTeam = match.info.participants.filter(p => p.teamId !== player.teamId);
        const gameDuration = (match.info.gameEndTimestamp - match.info.gameStartTimestamp) / 1000

        const enemyTeamGameData = {
            kda: enemyTeam.reduce((sum, enemy) => sum + (enemy.kills + enemy.assists) / (enemy.deaths || 1), 0) / enemyTeam.length,
            level: enemyTeam.reduce((sum, enemy) => sum + enemy.champLevel, 0) / enemyTeam.length,
            itemGold: enemyTeam.reduce((sum, enemy) => sum + enemy.goldSpent, 0) / enemyTeam.length,
            timeSpentDead: enemyTeam.reduce((sum, enemy) => sum + (enemy.totalTimeSpentDead || 0), 0) / enemyTeam.length,
            turretsKilled: enemyTeam.reduce((sum, enemy) => sum + (enemy.turretKills || 0), 0),
            inhibitorsKilled: enemyTeam.reduce((sum, enemy) => sum + (enemy.inhibitorKills || 0), 0),
            gameDuration: gameDuration // Add game duration in seconds
        };

        const enemyTeamResult = match.info.teams.find(t => t.teamId !== player.teamId);
        if (enemyTeamResult) {
            if (!enemyTeamResult.win) {
                enemyTeamStats.losses.push(enemyTeamGameData);
                if (player.gameEndedInSurrender) {
                    enemyTeamStats.surrenderLosses.push(enemyTeamGameData);
                }
            } else {
                enemyTeamStats.wins.push(enemyTeamGameData);
                if (player.gameEndedInSurrender) {
                    enemyTeamStats.surrenderWins.push(enemyTeamGameData);
                }
            }
        }
    });

    return enemyTeamStats;
}