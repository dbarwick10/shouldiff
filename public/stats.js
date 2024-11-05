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

        document.getElementById('output').innerHTML = '<p>Loading match stats...</p>';

        const response = await fetch(`http://localhost:3000/api/match-stats?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch match stats: ${errorText}`);
        }

        const matchStats = await response.json();
        const playerStats = calculatePlayerStats(matchStats, puuid);
        const teamStats = calculateTeamStats(matchStats, puuid);
        
        displayStats(playerStats, teamStats);
        
    } catch (error) {
        console.error('Error fetching match stats:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching match stats: ${error.message}</p>`;
    }
}

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

        const gameData = {
            kda: player.challenges.kda,
            level: player.champLevel,
            itemGold: player.goldSpent,
            timeSpentDead: player.totalTimeSpentDead || 0,
            turretsKilled: player.turretKills || 0,
            inhibitorsKilled: player.inhibitorKills || 0,
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
        const teamGameData = {
            kda: playerTeam.reduce((sum, teammate) => sum + (teammate.kills + teammate.assists) / (teammate.deaths || 1), 0) / playerTeam.length,
            level: playerTeam.reduce((sum, teammate) => sum + teammate.champLevel, 0) / playerTeam.length,
            itemGold: playerTeam.reduce((sum, teammate) => sum + teammate.goldSpent, 0) / playerTeam.length,
            timeSpentDead: playerTeam.reduce((sum, teammate) => sum + teammate.totalTimeSpentDead, 0) / playerTeam.length,
            turretsKilled: playerTeam.reduce((sum, teammate) => sum + teammate.turretKills, 0),
            inhibitorsKilled: playerTeam.reduce((sum, teammate) => sum + teammate.inhibitorKills, 0),
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

function displayStats(playerStats, teamStats) {
    const output = document.getElementById('output');
    let html = `
        <h3>Previous Game Data</h3>
        <table>
            <thead>
                <tr>
                    <th>Outcome</th>
                    <th>Total Games</th>
                    <th>Player K/D/A</th>
                    <th>Player Level</th>
                    <th>Player Item Gold</th>
                    <th>Player Time Spent Dead</th>
                    <th>Player Turrets Killed</th>
                    <th>Player Inhibitors Killed</th>
                    <th>Team K/D/A</th>
                    <th>Team Level</th>
                    <th>Team Item Gold</th>
                    <th>Team Time Spent Dead</th>
                    <th>Team Turrets Killed</th>
                    <th>Team Inhibitors Killed</th>
                </tr>
            </thead>
            <tbody>
    `;

    const outcomes = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];
    outcomes.forEach(outcome => {
        const playerGameData = playerStats[outcome];
        const teamGameData = teamStats[outcome];
        
        const playerRow = playerGameData.length > 0 ? playerGameData[0] : {};
        const teamRow = teamGameData.length > 0 ? teamGameData[0] : {};

        html += `
            <tr>
                <td>${outcome.charAt(0).toUpperCase() + outcome.slice(1)}</td>
                <td>${playerGameData.length}</td>
                <td>${(playerRow.kda).toFixed(2) || 'N/A'}</td>
                <td>${(playerRow.level).toFixed(0) || 'N/A'}</td>
                <td>${(playerRow.itemGold).toFixed(0) || 'N/A'}</td>
                <td>${(playerRow.timeSpentDead).toFixed(0) || 'N/A'}</td>
                <td>${(playerRow.turretsKilled).toFixed(0) || 'N/A'}</td>
                <td>${(playerRow.inhibitorsKilled).toFixed(0) || 'N/A'}</td>
                <td>${(teamRow.kda).toFixed(2) || 'N/A'}</td>
                <td>${(teamRow.level).toFixed(0) || 'N/A'}</td>
                <td>${(teamRow.itemGold).toFixed(0) || 'N/A'}</td>
                <td>${(teamRow.timeSpentDead).toFixed(0) || 'N/A'}</td>
                <td>${(teamRow.turretsKilled).toFixed(0) || 'N/A'}</td>
                <td>${(teamRow.inhibitorsKilled).toFixed(0) || 'N/A'}</td>
            </tr>
        `;
    });

    output.innerHTML = html;
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
