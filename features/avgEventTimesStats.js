export function calculateAverageEventTimes(individualGameStats) {
    console.log('Starting calculateAverageEventTimes with data:', individualGameStats);
    
    const aggregatedTimestamps = {
        playerStats: {
            kills: [],
            deaths: [],
            assists: [],
            outerTowerKills: [],
            innerTowerKills: [],
            baseTowerKills: [],
            nexusTowerKills: [],
            inhibitorKills: [],
            eliteMonsterKills: [],
            itemGold: []
        },
        teamStats: {
            kills: [],
            deaths: [],
            assists: [],
            outerTowerKills: [],
            innerTowerKills: [],
            baseTowerKills: [],
            nexusTowerKills: [],
            inhibitorKills: [],
            eliteMonsterKills: [],
            itemGold: []
        },
        enemyStats: {
            kills: [],
            deaths: [],
            assists: [],
            outerTowerKills: [],
            innerTowerKills: [],
            baseTowerKills: [],
            nexusTowerKills: [],
            inhibitorKills: [],
            eliteMonsterKills: [],
            itemGold: []
        }
    };

    individualGameStats.forEach((match, index) => {
        console.log(`Processing match ${index}:`, match);
        aggregatePlayerStats(aggregatedTimestamps.playerStats, match.playerStats);
        aggregatePlayerStats(aggregatedTimestamps.teamStats, match.teamStats);
        aggregatePlayerStats(aggregatedTimestamps.enemyStats, match.enemyStats);
    });

    console.log('After processing all matches, aggregatedTimestamps:', aggregatedTimestamps);

    const averageEventTimes = {
        playerStats: calculateAverageTimesForStats(aggregatedTimestamps.playerStats),
        teamStats: calculateAverageTimesForStats(aggregatedTimestamps.teamStats),
        enemyStats: calculateAverageTimesForStats(aggregatedTimestamps.enemyStats)
    };

    console.log('Final averageEventTimes:', averageEventTimes);
    return averageEventTimes;
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

function aggregatePlayerStats(aggregatedStats, stats) {
    if (!stats) {
        console.warn('Received null or undefined stats');
        return;
    }

    aggregateTimestamps(aggregatedStats.kills, stats.basicStats?.kills?.timestamps || []);
    aggregateTimestamps(aggregatedStats.deaths, stats.basicStats?.deaths?.timestamps || []);
    aggregateTimestamps(aggregatedStats.assists, stats.basicStats?.assists?.timestamps || []);
    aggregateTimestamps(aggregatedStats.outerTowerKills, stats.objectives?.towerKills?.outer?.timestamps || []);
    aggregateTimestamps(aggregatedStats.innerTowerKills, stats.objectives?.towerKills?.inner?.timestamps || []);
    aggregateTimestamps(aggregatedStats.baseTowerKills, stats.objectives?.towerKills?.base?.timestamps || []);
    aggregateTimestamps(aggregatedStats.nexusTowerKills, stats.objectives?.towerKills?.nexus?.timestamps || []);
    aggregateTimestamps(aggregatedStats.inhibitorKills, stats.objectives?.inhibitorKills?.timestamps || []);
    aggregateTimestamps(aggregatedStats.eliteMonsterKills, stats.objectives?.eliteMonsterKills?.timestamps || []);

    if (stats.economy?.itemGold?.history) {
        aggregateItemGold(aggregatedStats.itemGold, stats.economy.itemGold.history);
    }
}

function calculateAverageTimesForStats(aggregatedStats) {
    return {
        kills: calculateAverageTimes(aggregatedStats.kills),
        deaths: calculateAverageTimes(aggregatedStats.deaths),
        assists: calculateAverageTimes(aggregatedStats.assists),
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

// Aggregate item gold data
function aggregateItemGold(aggregatedArray, itemGoldHistory) {
    itemGoldHistory.forEach(({ amount, timestamp }) => {
        const existingEntry = aggregatedArray.find(entry => entry.timestamp === timestamp);
        if (existingEntry) {
            existingEntry.totalAmount += amount;
            existingEntry.count += 1;
        } else {
            aggregatedArray.push({ timestamp, totalAmount: amount, count: 1 });
        }
    });
}

// Calculate average item gold at each timestamp
function calculateAverageItemGold(itemGoldData) {
    return itemGoldData.map(({ timestamp, totalAmount, count }) => ({
        timestamp,
        averageAmount: totalAmount / count
    }));
}
