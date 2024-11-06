// Main fetch functions
async function getPuuid() {
    const summonerName = document.getElementById('summonerName').value;
    const tagline = document.getElementById('tagLine').value;
    const region = document.getElementById('region').value;

    if (!summonerName) {
        alert('Please enter a summoner name');
        return;
    }

    try {
        const tag = tagline.replace(/[^a-zA-Z0-9 ]/g, "");
        console.log(`Fetching PUUID for ${summonerName} (${tagline}) in ${region}`);
        const puuidResponse = await fetch(`http://localhost:3000/api/puuid?summonerName=${encodeURIComponent(summonerName)}&region=${encodeURIComponent(region)}&tagline=${encodeURIComponent(tag)}`);
        
        if (!puuidResponse.ok) {
            const errorDetail = await puuidResponse.text();
            throw new Error(`Failed to fetch PUUID: ${errorDetail}`);
        }

        const puuidData = await puuidResponse.json();
        
        return puuidData.puuid;
    } catch (error) {
        console.error('Error fetching PUUID:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching PUUID: ${error.message}</p>`;
        return null;
    }
}

async function fetchMatchStats() {
    try {
        const region = document.getElementById('region').value;
        const puuid = await getPuuid();
        if (!puuid) {
            console.error('No PUUID received');
            return;
        }

        document.getElementById('output').innerHTML = `
                <div class="loading-indicator">Fetching Game Data
                    <span class="dot">.</span>
                    <span class="dot">.</span>
                    <span class="dot">.</span>
                </div>`;

            console.log('Fetching match stats...');
            const response = await fetch(`http://localhost:3000/api/match-stats?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`);
            // console.log('Match stats fetched:', await response.json()); // This will log the result of match stats
                
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch match stats: ${errorText}`);
        }

        const matchStats = await response.json();
        const playerStats = calculateAverages(calculatePlayerStats(matchStats, puuid));
        const teamStats = calculateAverages(calculateTeamStats(matchStats, puuid));
        const enemyTeamStats = calculateAverages(calculateEnemyTeamStats(matchStats, puuid));

        displayStats(playerStats, teamStats, enemyTeamStats);
        
    } catch (error) {
        console.error('Error fetching match stats:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching match stats: ${error.message}</p>`;
    }
}

// Function to calculate averages
function calculateAverages(stats) {
    const categories = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];
    const averagedStats = {};

    categories.forEach(category => {
        const games = stats[category];
        
        if (games.length === 0) {
            // Set default values if there are no games in this category
            averagedStats[category] = { kda: 0, level: 0, itemGold: 0, timeSpentDead: 0, turretsKilled: 0, inhibitorsKilled: 0 };
        } else {
            // Calculate averages normally if there are games
            averagedStats[category] = {
                kda: games.reduce((sum, game) => sum + game.kda, 0) / games.length,
                level: games.reduce((sum, game) => sum + game.level, 0) / games.length,
                itemGold: games.reduce((sum, game) => sum + game.itemGold, 0) / games.length,
                timeSpentDead: games.reduce((sum, game) => sum + game.timeSpentDead, 0) / games.length,
                turretsKilled: games.reduce((sum, game) => sum + game.turretsKilled, 0) / games.length,
                inhibitorsKilled: games.reduce((sum, game) => sum + game.inhibitorsKilled, 0) / games.length,
            };
        }
    });

    return averagedStats;
}

// Function to safely calculate player stats with checks and debugging logs
function calculatePlayerStats(matchStats, puuid) {
    const playerStats = {
        wins: [],
        losses: [],
        surrenderWins: [],
        surrenderLosses: [],
    };

    matchStats.forEach(match => {
        const player = match.info.participants.find(p => p.puuid === puuid);
        if (!player) return;

        // Calculate KDA as (kills + assists) / deaths
        const kda = (player.kills + player.assists) / (player.deaths || 1);

        const gameData = {
            kda: kda,
            level: player.champLevel,
            itemGold: player.goldSpent,
            timeSpentDead: player.totalTimeSpentDead || 0,
            turretsKilled: player.turretKills || 0,
            inhibitorsKilled: player.inhibitorKills || 0
        };

        if (player.win) {
            playerStats.wins.push(gameData);
        } else {
            playerStats.losses.push(gameData);
        }

        if (player.gameEndedInSurrender) {
            if (!player.win) {
                playerStats.surrenderLosses.push(gameData);
            } else {
                playerStats.surrenderWins.push(gameData);
            }
        }
    });

    return playerStats;
}

// Function to calculate team stats
function calculateTeamStats(matchStats, puuid) {
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

        // Calculate team KDA
        const teamGameData = {
            kda: playerTeam.reduce((sum, teammate) => sum + (teammate.kills + teammate.assists) / (teammate.deaths || 1), 0) / playerTeam.length,
            level: playerTeam.reduce((sum, teammate) => sum + teammate.champLevel, 0) / playerTeam.length,
            itemGold: playerTeam.reduce((sum, teammate) => sum + teammate.goldSpent, 0) / playerTeam.length,
            timeSpentDead: playerTeam.reduce((sum, teammate) => sum + (teammate.totalTimeSpentDead || 0), 0) / playerTeam.length,
            turretsKilled: playerTeam.reduce((sum, teammate) => sum + (teammate.turretKills || 0), 0),
            inhibitorsKilled: playerTeam.reduce((sum, teammate) => sum + (teammate.inhibitorKills || 0), 0),
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

// Function to calculate enemy team stats
function calculateEnemyTeamStats(matchStats, puuid) {
    const enemyTeamStats = {
        wins: [],
        losses: [],
        surrenderWins: [],
        surrenderLosses: [],
    };

    matchStats.forEach(match => {
        const player = match.info.participants.find(p => p.puuid === puuid);
        if (!player) return;

        // Find the enemy team players by selecting participants not on the player's team
        const enemyTeam = match.info.participants.filter(p => p.teamId !== player.teamId);

        // Calculate enemy team stats including KDA
        const enemyTeamGameData = {
            kda: enemyTeam.reduce((sum, enemy) => sum + (enemy.kills + enemy.assists) / (enemy.deaths || 1), 0) / enemyTeam.length,
            level: enemyTeam.reduce((sum, enemy) => sum + enemy.champLevel, 0) / enemyTeam.length,
            itemGold: enemyTeam.reduce((sum, enemy) => sum + enemy.goldSpent, 0) / enemyTeam.length,
            timeSpentDead: enemyTeam.reduce((sum, enemy) => sum + (enemy.totalTimeSpentDead || 0), 0) / enemyTeam.length,
            turretsKilled: enemyTeam.reduce((sum, enemy) => sum + (enemy.turretKills || 0), 0),
            inhibitorsKilled: enemyTeam.reduce((sum, enemy) => sum + (enemy.inhibitorKills || 0), 0),
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


// Example data extraction functions for player, team, and enemy stats (customize for your needs)
function extractPlayerStats(game, puuid) {
    return {
        kda: game.kda,
        level: game.level,
        itemGold: game.itemGold,
        timeSpentDead: game.timeSpentDead,
        turretsKilled: game.turretsKilled,
        inhibitorsKilled: game.inhibitorsKilled
    };
}

function extractTeamStats(game, puuid) {
    // Similar to extractPlayerStats but for team stats
}

function extractEnemyTeamStats(game, puuid) {
    // Similar to extractPlayerStats but for enemy team stats
}

// Display function to output results to the DOM
function displayStats(playerStats, teamStats, enemyTeamStats) {
    const output = document.getElementById('output');
    
    // Use .length to get the count of each outcome
    const winsCount = playerStats.wins.length;
    const lossesCount = playerStats.losses.length;
    const surrenderWinsCount = playerStats.surrenderWins.length;
    const surrenderLossesCount = playerStats.surrenderLosses.length;

    output.innerHTML = `
        <table>
            <tr><th>Category</th><th>Count</th><th>Player KDA</th><th>Player Level</th><th>Player Item Gold</th><th>Team KDA</th><th>Team Level</th><th>Team Item Gold</th><th>Enemy KDA</th><th>Enemy Level</th><th>Enemy Item Gold</th><th>Enemy Time Spent Dead</th><th>Enemy Turrets Killed</th><th>Enemy Inhibitors Killed</th></tr>
            
            <tr><td>Wins</td>
                <td>${winsCount}</td>
                <td>${(playerStats.wins.kda).toFixed(2)}</td><td>${(playerStats.wins.level).toFixed(1)}</td><td>${(playerStats.wins.itemGold).toFixed(0)}</td>
                <td>${(teamStats.wins.kda).toFixed(2)}</td><td>${(teamStats.wins.level).toFixed(1)}</td><td>${(teamStats.wins.itemGold).toFixed(0)}</td>
                <td>${(enemyTeamStats.wins.kda).toFixed(2)}</td><td>${(enemyTeamStats.wins.level).toFixed(1)}</td><td>${(enemyTeamStats.wins.itemGold).toFixed(0)}</td>
                <td>${(enemyTeamStats.wins.timeSpentDead).toFixed(0)}</td><td>${(enemyTeamStats.wins.turretsKilled).toFixed(0)}</td><td>${(enemyTeamStats.wins.inhibitorsKilled).toFixed(0)}</td>
            </tr>

            <tr><td>Losses</td>
                <td>${lossesCount}</td>
                <td>${(playerStats.losses.kda).toFixed(2)}</td><td>${(playerStats.losses.level).toFixed(1)}</td><td>${(playerStats.losses.itemGold).toFixed(0)}</td>
                <td>${(teamStats.losses.kda).toFixed(2)}</td><td>${(teamStats.losses.level).toFixed(1)}</td><td>${(teamStats.losses.itemGold).toFixed(0)}</td>
                <td>${(enemyTeamStats.losses.kda).toFixed(2)}</td><td>${(enemyTeamStats.losses.level).toFixed(1)}</td><td>${(enemyTeamStats.losses.itemGold).toFixed(0)}</td>
                <td>${(enemyTeamStats.losses.timeSpentDead).toFixed(0)}</td><td>${(enemyTeamStats.losses.turretsKilled).toFixed(0)}</td><td>${(enemyTeamStats.losses.inhibitorsKilled).toFixed(0)}</td>
            </tr>

            <tr><td>Surrender Wins</td>
                <td>${surrenderWinsCount}</td>
                <td>${(playerStats.surrenderWins.kda).toFixed(2)}</td><td>${(playerStats.surrenderWins.level).toFixed(1)}</td><td>${(playerStats.surrenderWins.itemGold).toFixed(0)}</td>
                <td>${(teamStats.surrenderWins.kda).toFixed(2)}</td><td>${(teamStats.surrenderWins.level).toFixed(1)}</td><td>${(teamStats.surrenderWins.itemGold).toFixed(0)}</td>
                <td>${(enemyTeamStats.surrenderWins.kda).toFixed(2)}</td><td>${(enemyTeamStats.surrenderWins.level).toFixed(1)}</td><td>${(enemyTeamStats.surrenderWins.itemGold).toFixed(0)}</td>
                <td>${(enemyTeamStats.surrenderWins.timeSpentDead).toFixed(0)}</td><td>${(enemyTeamStats.surrenderWins.turretsKilled).toFixed(0)}</td><td>${(enemyTeamStats.surrenderWins.inhibitorsKilled).toFixed(0)}</td>
            </tr>

            <tr><td>Surrender Losses</td>
                <td>${surrenderLossesCount}</td>
                <td>${(playerStats.surrenderLosses.kda).toFixed(2)}</td><td>${(playerStats.surrenderLosses.level).toFixed(1)}</td><td>${(playerStats.surrenderLosses.itemGold).toFixed(0)}</td>
                <td>${(teamStats.surrenderLosses.kda).toFixed(2)}</td><td>${(teamStats.surrenderLosses.level).toFixed(1)}</td><td>${(teamStats.surrenderLosses.itemGold).toFixed(0)}</td>
                <td>${(enemyTeamStats.surrenderLosses.kda).toFixed(2)}</td><td>${(enemyTeamStats.surrenderLosses.level).toFixed(1)}</td><td>${(enemyTeamStats.surrenderLosses.itemGold).toFixed(0)}</td>
                <td>${(enemyTeamStats.surrenderLosses.timeSpentDead).toFixed(0)}</td><td>${(enemyTeamStats.surrenderLosses.turretsKilled).toFixed(0)}</td><td>${(enemyTeamStats.surrenderLosses.inhibitorsKilled).toFixed(0)}</td>
            </tr>
        </table>
    `;
}




document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('fetchStatsButton');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', async function() {
            this.disabled = true;  // Prevent double-clicking
            try {
                await fetchMatchStats();
            } finally {
                this.disabled = false;  // Re-enable the button
            }
        });
    }
});
