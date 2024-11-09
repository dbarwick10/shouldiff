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

    // Helper function to calculate averages for a game data array
    const calculateGameDataAverages = (games) => {
        // Check if games array is empty
        if (!games || !games.length) {
            return {
                kda: 0,
                level: 0,
                itemGold: 0,
                timeSpentDead: 0,
                turretsKilled: 0,
                inhibitorsKilled: 0
            };
        }

        // Calculate averages only if we have games
        return {
            kda: games.reduce((sum, game) => sum + game.kda, 0) / games.length,
            level: games.reduce((sum, game) => sum + game.level, 0) / games.length,
            itemGold: games.reduce((sum, game) => sum + game.itemGold, 0) / games.length,
            timeSpentDead: games.reduce((sum, game) => sum + game.timeSpentDead, 0) / games.length,
            turretsKilled: games.reduce((sum, game) => sum + game.turretsKilled, 0) / games.length,
            inhibitorsKilled: games.reduce((sum, game) => sum + game.inhibitorsKilled, 0) / games.length
        };
    };

    matchStats.forEach(match => {
        const player = match.info.participants.find(p => p.puuid === puuid);
        if (!player) return;

        const kda = (player.kills + player.assists) / (player.deaths || 1);
        const gameDuration = (match.info.gameEndTimestamp - match.info.gameStartTimestamp) / 1000;

        const gameData = {
            kills: player.kills,
            deaths: player.deaths,
            assists: player.assists,
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

    // Helper function to format time
    const formatTime = (seconds) => {
        if (!seconds && seconds !== 0) return "0m 0s";
        return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    };

    // Calculate average times with safety check
    const calculateAverage = (times) => {
        if (!times.length) return 0;
        const sum = times.reduce((a, b) => a + b, 0);
        return sum / times.length;
    };

    // Calculate and store all averages
    playerStats.winStats = calculateGameDataAverages(playerStats.wins);
    playerStats.lossStats = calculateGameDataAverages(playerStats.losses);
    playerStats.surrenderWinStats = calculateGameDataAverages(playerStats.surrenderWins);
    playerStats.surrenderLossStats = calculateGameDataAverages(playerStats.surrenderLosses);

    // Calculate and format all times
    playerStats.averageWinTime = calculateAverage(playerStats.winTime);
    playerStats.averageLossTime = calculateAverage(playerStats.lossTime);
    playerStats.averageSurrenderWinTime = calculateAverage(playerStats.surrenderWinTime);
    playerStats.averageSurrenderLossTime = calculateAverage(playerStats.surrenderLossTime);

    playerStats.winTime = formatTime(playerStats.averageWinTime);
    playerStats.lossTime = formatTime(playerStats.averageLossTime);
    playerStats.surrenderWinTime = formatTime(playerStats.averageSurrenderWinTime);
    playerStats.surrenderLossTime = formatTime(playerStats.averageSurrenderLossTime);

    return playerStats;
}