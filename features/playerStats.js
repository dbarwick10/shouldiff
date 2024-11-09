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