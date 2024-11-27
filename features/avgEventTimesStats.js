export function calculateAverageEventTimes(individualGameStats) {
    console.log('Starting calculateAverageEventTimes with data:', individualGameStats);
    
    const aggregatedTimestamps = {
        playerStats: initializeStats(),
        teamStats: initializeStats(),
        enemyStats: initializeStats()
    };

    individualGameStats.forEach((match, index) => {
        // Aggregate stats based on match outcome
        const { outcome } = match.playerStats;
        const category = getOutcomeCategory(outcome.result);

        if (category) {
            aggregatePlayerStats(aggregatedTimestamps.playerStats[category], match.playerStats);
            aggregatePlayerStats(aggregatedTimestamps.teamStats[category], match.teamStats);
            aggregatePlayerStats(aggregatedTimestamps.enemyStats[category], match.enemyStats);
        }
    });

    console.log('After processing all matches, aggregatedTimestamps:', aggregatedTimestamps);

    // Calculate averages for each category
    const averageEventTimes = {
        playerStats: calculateAverageForCategories(aggregatedTimestamps.playerStats),
        teamStats: calculateAverageForCategories(aggregatedTimestamps.teamStats),
        enemyStats: calculateAverageForCategories(aggregatedTimestamps.enemyStats)
    };

    console.log('Final averageEventTimes:', averageEventTimes);
    return averageEventTimes;
}

function initializeStats() {
    return {
        wins: initializeAggregatedStats(),
        losses: initializeAggregatedStats(),
        surrenderWins: initializeAggregatedStats(),
        surrenderLosses: initializeAggregatedStats()
    };
}

function initializeAggregatedStats() {
    return {
        kills: [],
        deaths: [],
        assists: [],
        kda: [],
        turretKills: [],
        outerTowerKills: [],
        innerTowerKills: [],
        baseTowerKills: [],
        nexusTowerKills: [],
        inhibitorKills: [],
        eliteMonsterKills: [],
        itemGold: []
    };
}

function getOutcomeCategory(result) {
    switch (result) {
        case 'win':
            return 'wins';
        case 'loss':
            return 'losses';
        case 'surrenderWin':
            return 'surrenderWins';
        case 'surrenderLoss':
            return 'surrenderLosses';
        default:
            return null;
    }
}

function aggregatePlayerStats(aggregatedStats, stats) {
    if (!stats) {
        console.warn('Received null or undefined stats');
        return;
    }

    aggregateTimestamps(aggregatedStats.kills, stats.basicStats?.kills?.timestamps || []);
    aggregateTimestamps(aggregatedStats.deaths, stats.basicStats?.deaths?.timestamps || []);
    aggregateTimestamps(aggregatedStats.assists, stats.basicStats?.assists?.timestamps || []);
    aggregateTimestamps(aggregatedStats.kda, stats.basicStats?.kda?.timestamps || []);
    aggregateTimestamps(aggregatedStats.turretKills, stats.objectives?.turretKills?.timestamps || []);
    aggregateTimestamps(aggregatedStats.outerTowerKills, stats.objectives?.towerKills?.outer?.timestamps || []);
    aggregateTimestamps(aggregatedStats.innerTowerKills, stats.objectives?.towerKills?.inner?.timestamps || []);
    aggregateTimestamps(aggregatedStats.baseTowerKills, stats.objectives?.towerKills?.base?.timestamps || []);
    aggregateTimestamps(aggregatedStats.nexusTowerKills, stats.objectives?.towerKills?.nexus?.timestamps || []);
    aggregateTimestamps(aggregatedStats.inhibitorKills, stats.objectives?.inhibitorKills?.timestamps || []);
    aggregateTimestamps(aggregatedStats.eliteMonsterKills, stats.objectives?.eliteMonsterKills?.timestamps || []);
    aggregateItemGold(aggregatedStats.itemGold, stats.economy.itemGold.history.count, stats.economy.itemGold.history.timestamps);
    if (stats.basicStats?.kda?.history?.count && stats.basicStats.kda.history.timestamps) {
        aggregateKDATimestamps(aggregatedStats.kda, stats.basicStats.kda.history.count, stats.basicStats.kda.history.timestamps);
    }
    
    
}

function aggregateTimestamps(aggregatedArray, timestamps) {
    if (!Array.isArray(timestamps)) return;

    timestamps.forEach((timestamp, index) => {
        if (timestamp === undefined || timestamp === null) return;
        if (!aggregatedArray[index]) {
            aggregatedArray[index] = [];
        }
        aggregatedArray[index].push(timestamp);
    });
}

function aggregateKDATimestamps(aggregatedArray, kdaValues, timestamps) {
    if (!Array.isArray(kdaValues) || !Array.isArray(timestamps)) return;

    timestamps.forEach((timestamp, index) => {
        // Ensure both timestamp and kdaValue are valid
        if (
            timestamp === undefined || 
            timestamp === null || 
            kdaValues[index] === undefined || 
            kdaValues[index] === null ||
            isNaN(timestamp) ||
            isNaN(kdaValues[index])
        ) return;

        if (!aggregatedArray[index]) {
            aggregatedArray[index] = [];
        }
        
        aggregatedArray[index].push({
            timestamp: Number(timestamp),
            kdaValue: Number(kdaValues[index])
        });
    });
}

// Aggregate item gold data
function aggregateItemGold(aggregatedArray, amounts, timestamps) {
    console.log('aggregateItemGold called with:', { amounts, timestamps });

    if (!Array.isArray(timestamps) || !Array.isArray(amounts)) {
        console.error('Invalid data passed to aggregateItemGold:', { timestamps, amounts });
        return;
    }

    timestamps.forEach((timestamp, index) => {
        console.log('Processing timestamp and amount:', { timestamp, amount: amounts[index] });

        if (
            timestamp === undefined || 
            timestamp === null || 
            amounts[index] === undefined || 
            amounts[index] === null ||
            isNaN(timestamp) ||
            isNaN(amounts[index])
        ) {
            console.warn('Skipping invalid data:', { timestamp, amount: amounts[index] });
            return;
        }

        console.log('Adding item gold data:', { timestamp, amount: amounts[index] });
        if (!aggregatedArray[index]) {
            aggregatedArray[index] = [];
        }

        console.log('Pushing item gold data:', { timestamp, amount: amounts[index] });
        aggregatedArray[index].push({
            timestamp: Number(timestamp),
            amount: Number(amounts[index])
        });
    });

    console.log('Final aggregatedArray:', aggregatedArray);
}

function calculateAverageForCategories(categories) {
    return {
        wins: calculateAverageTimesForStats(categories.wins),
        losses: calculateAverageTimesForStats(categories.losses),
        surrenderWins: calculateAverageTimesForStats(categories.surrenderWins),
        surrenderLosses: calculateAverageTimesForStats(categories.surrenderLosses)
    };
}

function calculateAverageTimesForStats(aggregatedStats) {
    return {
        kills: calculateAverageTimes(aggregatedStats.kills),
        deaths: calculateAverageTimes(aggregatedStats.deaths),
        assists: calculateAverageTimes(aggregatedStats.assists),
        kda: calculateAverageKDATimes(aggregatedStats.kda),
        turretKills: calculateAverageTimes(aggregatedStats.turretKills),
        outerTowerKills: calculateAverageTimes(aggregatedStats.outerTowerKills),
        innerTowerKills: calculateAverageTimes(aggregatedStats.innerTowerKills),
        baseTowerKills: calculateAverageTimes(aggregatedStats.baseTowerKills),
        nexusTowerKills: calculateAverageTimes(aggregatedStats.nexusTowerKills),
        inhibitorKills: calculateAverageTimes(aggregatedStats.inhibitorKills),
        eliteMonsterKills: calculateAverageTimes(aggregatedStats.eliteMonsterKills),
        itemGold: calculateAverageItemGold(aggregatedStats.itemGold)
    };
}

function calculateAverageTimes(aggregatedArray) {
    return aggregatedArray.map(timestamps => {
        if (!timestamps || timestamps.length === 0) return null;
        const sum = timestamps.reduce((acc, timestamp) => acc + timestamp, 0);
        return sum / timestamps.length;
    });
}

function calculateAverageKDATimes(aggregatedArray) {
    return aggregatedArray.map(subArray => {
        const totalEntries = subArray.length;
        const totalTimestamp = subArray.reduce((sum, {timestamp}) => sum + timestamp, 0);
        const totalKDAValue = subArray.reduce((sum, {kdaValue}) => sum + kdaValue, 0);
        
        return {
            timestamp: totalTimestamp / totalEntries,
            kdaValue: totalKDAValue / totalEntries
        };
    });
}

function calculateAverageItemGold(itemGoldData) {
    return itemGoldData.map(({ timestamp, totalAmount, count }) => ({
        timestamp,
        averageAmount: totalAmount / count
    }));
}