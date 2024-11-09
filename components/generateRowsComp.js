export function generateRow(category, section, playerStats, teamStats, enemyTeamStats) {
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
            <td>${category}</td>
            <td>${section.name}</td>
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
