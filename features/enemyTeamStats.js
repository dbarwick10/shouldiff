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