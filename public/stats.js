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
        const playerStats = calculatePlayerStats(matchStats, puuid);
        const teamStats = calculateTeamStats(matchStats, puuid);
        const enemyTeamStats = calculateEnemyTeamStats(matchStats, puuid);

        displayStats(playerStats, teamStats, enemyTeamStats);
        
    } catch (error) {
        console.error('Error fetching match stats:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching match stats: ${error.message}</p>`;
    }
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

function generateRow(category, section) {
    const stats = section.data[category];
    let count;

    if (Array.isArray(stats)) {
        count = stats.length;
    } else {
        count = Object.keys(stats).length;
    }

    // Calculate averages using the stats array or object
    const avgKDA = calculateAverage(stats, 'kda');
    const avgLevel = calculateAverage(stats, 'level');
    const avgItemGold = calculateAverage(stats, 'itemGold');
    const avgTimeSpentDead = calculateAverage(stats, 'timeSpentDead');
    const avgTurretsKilled = calculateAverage(stats, 'turretsKilled');
    const avgInhibitorsKilled = calculateAverage(stats, 'inhibitorsKilled');

    return `
        <tr>
            <td>${capitalize(category)}</td>
            <td>${section.name}</td>
            <td>${count}</td>
            <td>${avgKDA.toFixed(2)}</td>
            <td>${avgLevel.toFixed(2)}</td>
            <td>${avgItemGold.toFixed(0)}</td>
            <td>${avgTimeSpentDead.toFixed(2)}</td>
            <td>${avgTurretsKilled.toFixed(2)}</td>
            <td>${avgInhibitorsKilled.toFixed(2)}</td>
        </tr>`;
}

function calculateAverage(stats, key) {
    if (Array.isArray(stats)) {
        return stats.reduce((sum, item) => sum + item[key], 0) / stats.length;
    } else {
        return stats[key];
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function displayStats(playerStats, teamStats, enemyTeamStats) {
    const output = document.getElementById('output');
    
    const categories = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];
    const statSections = [
        { name: 'Player', data: playerStats },
        { name: 'Team', data: teamStats },
        { name: 'Enemy', data: enemyTeamStats }
    ];
    
    const rows = categories.flatMap(category =>
        statSections.map(section => generateRow(category, section))
    );
    
    output.innerHTML = `
        <table>
            <tr>
                <th>Outcome</th><th>Category</th><th>Count</th><th>KDA</th><th>Level</th><th>Item Gold</th><th>Time Spent Dead</th><th>Turrets Killed</th><th>Inhibitors Killed</th>
            </tr>
            ${rows.join('')}
        </table>`;
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