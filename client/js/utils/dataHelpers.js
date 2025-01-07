export function calculateKDAAtTime(kills, deaths, assists, timestamp) {
    const killsBeforeTime = kills.filter(time => time <= timestamp).length;
    const deathsBeforeTime = deaths.filter(time => time <= timestamp).length;
    const assistsBeforeTime = assists.filter(time => time <= timestamp).length;
    
    return deathsBeforeTime === 0 ? 
        killsBeforeTime + assistsBeforeTime : 
        ((killsBeforeTime + assistsBeforeTime) / deathsBeforeTime).toFixed(2);
}

export function generateKDAData(kills, deaths, assists) {
    if (!kills?.length && !deaths?.length && !assists?.length) return [];
    
    const allEvents = [
        ...(kills || []).map(time => ({ time, type: 'kill' })),
        ...(deaths || []).map(time => ({ time, type: 'death' })),
        ...(assists || []).map(time => ({ time, type: 'assist' }))
    ].sort((a, b) => a.time - b.time);

    return allEvents.map(event => ({
        x: event.time / 60,
        y: Number(calculateKDAAtTime(kills || [], deaths || [], assists || [], event.time))
    }));
}

export function hasDataForOutcome(averageEventTimes, category, outcomeType) {
    if (!averageEventTimes?.[category]?.[outcomeType]) return false;
    
    return ['kills', 'deaths', 'assists', 'turrets', 'dragons', 'barons', 'elders', 'inhibitors'].some(stat => 
        Array.isArray(averageEventTimes[category][outcomeType][stat]) && 
        averageEventTimes[category][outcomeType][stat].length > 0
    ) || (
        Array.isArray(averageEventTimes[category][outcomeType].itemGold) &&
        averageEventTimes[category][outcomeType].itemGold.length > 0
    );
}

export function hasValidStats(stats, category) {
    return ['kills', 'deaths', 'assists'].some(stat => 
        (stats[category]?.[stat]?.length || 0) > 0
    );
}
