export function calculateTrendline(data) {
    if (!data || data.length < 2) return null;
    
    const n = data.length;
    const sumX = data.reduce((acc, point) => acc + point.x, 0);
    const sumY = data.reduce((acc, point) => acc + point.y, 0);
    const sumXY = data.reduce((acc, point) => acc + (point.x * point.y), 0);
    const sumXX = data.reduce((acc, point) => acc + (point.x * point.x), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY / n) - slope * (sumX / n);
    
    return [
        { x: data[0].x, y: slope * data[0].x + intercept },
        { x: data[data.length - 1].x, y: slope * data[data.length - 1].x + intercept }
    ];
}

export function calculateTrendlineStats(data) {
    if (!data || data.length < 2) return null;
    
    const n = data.length;
    const sumX = data.reduce((acc, point) => acc + point.x, 0);
    const sumY = data.reduce((acc, point) => acc + point.y, 0);
    const sumXY = data.reduce((acc, point) => acc + (point.x * point.y), 0);
    const sumXX = data.reduce((acc, point) => acc + (point.x * point.x), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY / n) - slope * (sumX / n);
    
    const yMean = sumY / n;
    
    const predictedY = data.map(point => slope * point.x + intercept);
    
    const residualSS = data.reduce((acc, point, i) => 
        acc + Math.pow(point.y - predictedY[i], 2), 0);
    
    const totalSS = data.reduce((acc, point) => 
        acc + Math.pow(point.y - yMean, 2), 0);
    
    const rSquared = 1 - (residualSS / totalSS);
    
    return { slope, intercept, rSquared };
}

export function createDatasetWithMode(baseDataset, trendlineDataset, displayMode) {
    const datasets = [];
    
    // For single data point, show larger point radius
    if (baseDataset.data.length === 1) {
        datasets.push({
            ...baseDataset,
            pointRadius: 2.5,
            pointHoverRadius: 2.5
        });
    }

    // Always show data points if there's only one point
    if (baseDataset.data.length === 1 || displayMode === 'both' || displayMode === 'data') {
        datasets.push(baseDataset);
    }
    
    // Only add trendline if we have multiple points and the mode allows it
    if (baseDataset.data.length > 1 && (displayMode === 'both' || displayMode === 'trendline') && trendlineDataset) {
        datasets.push(trendlineDataset);
    }
    
    return datasets;
}
