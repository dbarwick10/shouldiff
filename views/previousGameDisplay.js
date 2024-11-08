
function generateRow(category, section, playerStats, teamStats, enemyTeamStats) {
    const stats = section.data[category];
    let count;

    if (Array.isArray(stats)) {
        count = stats.length;
    } else {
        count = Object.keys(stats).length;
    }

    // Calculate averages for each stat and game time in minutes:seconds
    const avgKDA = calculateAverage(stats, 'kda');
    const avgLevel = calculateAverage(stats, 'level');
    const avgItemGold = calculateAverage(stats, 'itemGold');
    const avgTimeSpentDead = calculateAverage(stats, 'timeSpentDead');
    const avgTurretsKilled = calculateAverage(stats, 'turretsKilled');
    const avgInhibitorsKilled = calculateAverage(stats, 'inhibitorsKilled');
    const avgGameTimeSeconds = calculateAverage(stats, 'gameDuration');
    const avgGameTimeMinutes = Math.floor(avgGameTimeSeconds / 60);
    const avgGameTimeRemainderSeconds = Math.floor(avgGameTimeSeconds % 60);

    return `
        <tr>
            <td>${capitalize(category)}</td>
            <td>${section.name}</td>
            <td>${avgKDA.toFixed(2)}</td>
            <td>${avgLevel.toFixed(2)}</td>
            <td>${avgItemGold.toFixed(0)}</td>
            <td>${avgTimeSpentDead.toFixed(2)}</td>
            <td>${avgTurretsKilled.toFixed(2)}</td>
            <td>${avgInhibitorsKilled.toFixed(2)}</td>
        </tr>`;
}

export function displayStats(playerStats, teamStats, enemyTeamStats) {
    const summonerName = document.getElementById('summonerName').value;
    const output = document.getElementById('output'); 
    const playerSummary = document.getElementById('player-summary');
    
    // Calculate player stats summary
    const playerWins = playerStats.wins.length;
    const playerLosses = playerStats.losses.length;
    const playerSurrenderWins = playerStats.surrenderWins.length;
    const playerSurrenderLosses = playerStats.surrenderLosses.length;
    const winTime = playerStats.winTime;
    const lossTime = playerStats.lossTime;
    const surrenderWinTime = playerStats.surrenderWinTime;
    const surrenderLossTime = playerStats.surrenderLossTime;

    const summaryItems = [
        { label: "Wins", count: playerWins, time: winTime },
        { label: "Losses", count: playerLosses, time: lossTime },
        { label: "Surrender Wins", count: playerSurrenderWins, time: surrenderWinTime },
        { label: "Surrender Losses", count: playerSurrenderLosses, time: surrenderLossTime }
    ];

    // Create player summary HTML
    const playerSummaryHtml = summaryItems.map(item => 
        `<li><strong>${item.label}:</strong> ${item.count} <span class="time">(${item.time})</span></li>`
    ).join('');

    // Categories for stats display
    const categories = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];
    const statSections = [
        { name: `${summonerName}`, data: playerStats },
        { name: 'Team', data: teamStats },
        { name: 'Enemy', data: enemyTeamStats }
    ];

    const rows = categories.flatMap(category =>
        statSections.map(section => generateRow(category, section, playerStats, teamStats, enemyTeamStats))
    );

    // Update output inner HTML

    playerSummary.innerHTML = `
        <div class="player-summary">
            ${playerSummaryHtml}
        </div>
    `;
    output.innerHTML = `
        <div>
            <table>
                <tr>
                    <th>Outcome</th><th>Category</th><th>Average KDA</th><th>Average Level</th><th>Average Item Gold</th><th>Average Time Spent Dead</th><th>Average Turrets Killed</th><th>Average Inhibitors Killed</th>
                </tr>
                ${rows.join('')}
            </table>
        </div>`;
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