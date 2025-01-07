export function calculateTrendline(data) {
    if (!data || data.length < 2) return null;
    
    const n = data.length;
    const sumX = data.reduce((acc, point) => acc + point.x, 0);
    const sumY = data.reduce((acc, point) => acc + point.y, 0);
    const sumXY = data.reduce((acc, point) => acc + (point.x * point.y), 0);
    const sumXX = data.reduce((acc, point) => acc + (point.x * point.x), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return [
        { x: data[0].x, y: slope * data[0].x + intercept },
        { x: data[data.length - 1].x, y: slope * data[data.length - 1].x + intercept }
    ];
}

export function createDatasetWithMode(baseDataset, trendlineDataset, displayMode) {
    const datasets = [];
    
    if (displayMode === 'both' || displayMode === 'data') {
        datasets.push(baseDataset);
    }
    
    if ((displayMode === 'both' || displayMode === 'trendline') && trendlineDataset) {
        datasets.push(trendlineDataset);
    }
    
    return datasets;
}

export function calculateTrendlineStats(data) {
    if (!data || data.length < 2) return null;
    
    const n = data.length;
    const sumX = data.reduce((acc, point) => acc + point.x, 0);
    const sumY = data.reduce((acc, point) => acc + point.y, 0);
    const sumXY = data.reduce((acc, point) => acc + (point.x * point.y), 0);
    const sumXX = data.reduce((acc, point) => acc + (point.x * point.x), 0);
    const sumYY = data.reduce((acc, point) => acc + (point.y * point.y), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const totalSS = sumYY - n * yMean * yMean;
    const regressionSS = slope * (sumXY - sumX * yMean);
    const rSquared = regressionSS / totalSS;
    
    return { slope, intercept, rSquared };
}
