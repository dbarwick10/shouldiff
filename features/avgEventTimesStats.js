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
            itemGold: []  // Back to array for consistency
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
        // console.log(`Match itemGold data:`, match.playerStats?.economy?.itemGold);
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
    if (!Array.isArray(timestamps)) {
        return;
    }
    timestamps.forEach((timestamp, index) => {
        if (timestamp === undefined || timestamp === null) {
            return;
        }
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

    console.log('Economy data in aggregatePlayerStats:', stats.economy);
    console.log('ItemGold data:', stats.economy?.itemGold);
    console.log('ItemGold history:', stats.economy?.itemGold?.history);
    
    if (stats.economy?.itemGold?.history) {
        // Store the length of itemGold array before and after aggregation
        const beforeLength = aggregatedStats.itemGold.length;
        console.log('ItemGold array length before aggregation:', beforeLength);
        
        aggregateItemGold(aggregatedStats.itemGold, stats.economy.itemGold.history);
        
        const afterLength = aggregatedStats.itemGold.length;
        console.log('ItemGold array length after aggregation:', afterLength);
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

function aggregateItemGold(aggregatedArray, itemGoldHistory) {
    console.log('Starting aggregateItemGold');
    console.log('Input aggregatedArray:', aggregatedArray);
    console.log('Input itemGoldHistory:', itemGoldHistory);

    // If aggregatedArray isn't an array, make it one
    if (!Array.isArray(aggregatedArray)) {
        console.warn('aggregatedArray was not an array, initializing it');
        aggregatedArray = [];
    }

    // For each item in the history, create or update an entry in the aggregated array
    itemGoldHistory.forEach((historyItem, index) => {
        // If there's no entry at this index, create one
        if (!aggregatedArray[index]) {
            aggregatedArray[index] = {
                timestamps: [],
                amounts: []
            };
        }

        console.log(`Processing history item ${index}:`, historyItem);
        console.log(`Current state of aggregatedArray[${index}]:`, aggregatedArray[index]);

        // Push the values
        aggregatedArray[index].timestamps.push(historyItem.timestamp);
        aggregatedArray[index].amounts.push(historyItem.amount);

        console.log(`After adding values, aggregatedArray[${index}]:`, aggregatedArray[index]);
    });

    console.log('Final aggregatedArray:', aggregatedArray);
    console.log('Final aggregatedArray length:', aggregatedArray.length);
    
    // Return the array explicitly
    return aggregatedArray;
}

function calculateAverageItemGold(aggregatedArray) {
    console.log('Starting calculateAverageItemGold');
    console.log('Input aggregatedArray:', aggregatedArray);

    if (!Array.isArray(aggregatedArray)) {
        console.warn('Input is not an array in calculateAverageItemGold');
        return [];
    }

    if (aggregatedArray.length === 0) {
        console.warn('Input array is empty in calculateAverageItemGold');
        return [];
    }

    const result = aggregatedArray.map((entry, index) => {
        console.log(`Processing entry ${index}:`, entry);

        if (!entry || !entry.timestamps || !entry.amounts) {
            console.warn(`Invalid entry at index ${index}`);
            return null;
        }

        if (entry.timestamps.length === 0 || entry.amounts.length === 0) {
            console.warn(`Empty timestamps or amounts at index ${index}`);
            return null;
        }

        const avgTimestamp = entry.timestamps.reduce((acc, val) => acc + val, 0) / entry.timestamps.length;
        const avgAmount = entry.amounts.reduce((acc, val) => acc + val, 0) / entry.amounts.length;

        console.log(`Calculated averages for index ${index}:`, { avgTimestamp, avgAmount });
        return { timestamp: avgTimestamp, amount: avgAmount };
    });

    console.log('Final result from calculateAverageItemGold:', result);
    return result;
}