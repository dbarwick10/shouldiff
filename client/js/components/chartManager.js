import { CHART_TYPES, STAT_KEYS } from '../config/constants.js';
import { colorConfig } from '../config/colorConfig.js';
import { getChartOptions } from '../config/chartOptions.js';
import { calculateTrendline, createDatasetWithMode } from '../utils/chartHelpers.js';
import { generateKDAData } from '../utils/dataHelpers.js';
import {
    toggleChartVisibility,
    updateLegendVisibility
} from '../utils/domHelpers.js';

export class ChartManager {
    constructor(config = {}) {
        this.sessionId = new Date().getTime();
        this.charts = {};
        this.currentCategory = 'teamStats';
        this.displayMode = 'both';
        this.gamePhase = 'fullGame';
        this.averageEventTimes = config.averageEventTimes || {};
        this.currentLiveStats = config.currentLiveStats || null;
        this.previousGameStats = config.previousGameStats || null;
        this.phaseRanges = {
            fullGame: { min: 0, max: Infinity },
            earlyGame: { min: 0, max: 15 },
            midGame: { min: 15, max: 30 },
            lateGame: { min: 30, max: Infinity }
        };

        // Store the complete data state
        if (config.averageEventTimes) {
            this.saveDataToStorage({
                averageEventTimes: config.averageEventTimes,
                currentLiveStats: config.currentLiveStats,
                previousGameStats: config.previousGameStats
            });
        } else {
            this.loadDataFromStorage();
        }
    }

    saveDataToStorage(data) {
        try {
            localStorage.setItem('chartData', JSON.stringify({
                timestamp: new Date().getTime(),
                data: {
                    averageEventTimes: data.averageEventTimes,
                    currentLiveStats: data.currentLiveStats,
                    previousGameStats: data.previousGameStats,
                    currentCategory: this.currentCategory,
                    displayMode: this.displayMode,
                    gamePhase: this.gamePhase,
                    lastSearch: data.lastSearch || null // Add this line
                }
            }));
            console.log('Chart data saved to storage');
        } catch (error) {
            console.error('Error saving chart data:', error);
        }
    }

    loadDataFromStorage() {
        try {
            const stored = localStorage.getItem('chartData');
            if (stored) {
                const { data } = JSON.parse(stored);
                this.averageEventTimes = data.averageEventTimes || {};
                // Explicitly set these to null if they don't exist
                this.currentLiveStats = data.currentLiveStats || null;
                this.previousGameStats = data.previousGameStats || null;
                this.currentCategory = data.currentCategory || 'teamStats';
                this.displayMode = data.displayMode || 'both';
                this.gamePhase = data.gamePhase || 'fullGame';
                console.log('Chart data loaded from storage');
                return true;
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
            // Reset to defaults on error
            this.currentLiveStats = null;
            this.previousGameStats = null;
        }
        return false;
    }

    resetToDefaults() {
        this.currentCategory = 'teamStats';
        this.displayMode = 'both';
        this.gamePhase = 'fullGame';
        this.updateChartVisibility();
        this.updateLegendVisibility();
        this.renderAllCharts();
    }
    
    initializeToggleButtons() {
        // Set initial toggle states
        document.querySelectorAll('input[name="statType"]').forEach(input => {
            if (input.value === this.currentCategory) {
                input.checked = true;
            }
            input.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.updateChartVisibility();
                // We don't need updateLegendVisibility() here as it's called in updateChartVisibility
                this.renderAllCharts();
                this.saveDataToStorage({
                    averageEventTimes: this.averageEventTimes,
                    currentLiveStats: this.currentLiveStats,
                    previousGameStats: this.previousGameStats
                });
            });
        });

        document.querySelectorAll('input[name="displayMode"]').forEach(input => {
            if (input.value === this.displayMode) {
                input.checked = true;
            }
            input.addEventListener('change', (e) => {
                this.displayMode = e.target.value;
                this.renderAllCharts();
                this.saveDataToStorage({
                    averageEventTimes: this.averageEventTimes,
                    currentLiveStats: this.currentLiveStats,
                    previousGameStats: this.previousGameStats
                });
            });
        });

        document.querySelectorAll('input[name="gamePhase"]').forEach(input => {
            if (input.value === this.gamePhase) {
                input.checked = true;
            }
            input.addEventListener('change', (e) => {
                this.gamePhase = e.target.value;
                this.renderAllCharts();
                this.saveDataToStorage({
                    averageEventTimes: this.averageEventTimes,
                    currentLiveStats: this.currentLiveStats,
                    previousGameStats: this.previousGameStats
                });
            });
        });

        // Initial render and visibility update
        if (Object.keys(this.averageEventTimes).length > 0) {
            this.updateChartVisibility(); // This will also handle legend visibility
            this.renderAllCharts();
        }
    }

    updateChartVisibility() {
        CHART_TYPES.forEach(stat => {
            const hasDataForStat = this.hasCategoryData(this.currentCategory, stat);
            toggleChartVisibility(stat, hasDataForStat);
        });
        this.updateLegendVisibility();
    }

    updateLegendVisibility() {
        updateLegendVisibility(
            this.currentCategory, 
            this.averageEventTimes, 
            this.currentLiveStats, 
            this.previousGameStats
        );
    }

    filterDataByGamePhase(dataPoints) {
        if (!dataPoints || dataPoints.length === 0) return dataPoints;
        
        const range = this.phaseRanges[this.gamePhase];
        return dataPoints.filter(point => 
            point.x >= range.min && 
            point.x < range.max
        );
    }

    hasCategoryData(category, stat) {
        if (!this.averageEventTimes || !this.averageEventTimes[category]) {
            return false;
        }
    
        if (stat === 'deathTimers') {
            const hasHistoricalData = STAT_KEYS.some(key => {
                const categoryData = this.averageEventTimes[category][key];
                return categoryData?.deaths?.length > 0 && categoryData?.timeSpentDead?.length > 0;
            });
        
            const hasLiveData = this.currentLiveStats?.[category]?.deaths?.length > 0 && 
                              this.currentLiveStats?.[category]?.timeSpentDead?.length > 0;
        
            const hasPreviousData = this.previousGameStats?.[category]?.deaths?.length > 0 && 
                                  this.previousGameStats?.[category]?.timeSpentDead?.length > 0;
        
            return hasHistoricalData || hasLiveData || hasPreviousData;
        }
    
        if (stat === 'itemPurchases') {
            const hasHistoricalData = STAT_KEYS.some(key => {
                const categoryData = this.averageEventTimes[category][key];
                return (
                    (Array.isArray(categoryData?.itemPurchases) && categoryData.itemPurchases.length > 0) ||
                    (categoryData?.economy?.itemGold?.history?.count?.length > 0 &&
                     categoryData?.economy?.itemGold?.history?.timestamps?.length > 0)
                );
            });
        
            const hasLiveData = this.currentLiveStats?.[category]?.economy?.
                itemGold?.history?.count?.length > 0;
        
            const hasPreviousData = this.previousGameStats?.[category]?.economy?.
                itemGold?.history?.count?.length > 0;
        
            return hasHistoricalData || hasLiveData || hasPreviousData;
        }
    
        const hasHistoricalData = STAT_KEYS.some(key => {
            const categoryData = this.averageEventTimes[category][key];
            return categoryData && Array.isArray(categoryData[stat]) && categoryData[stat].length > 0;
        });
    
        const hasLiveData = this.currentLiveStats?.[category] && (
            (stat === 'kda' && (
                this.currentLiveStats[category].kills?.length > 0 ||
                this.currentLiveStats[category].deaths?.length > 0 ||
                this.currentLiveStats[category].assists?.length > 0
            )) ||
            (this.currentLiveStats[category][stat]?.length > 0)
        );
    
        const hasPreviousData = this.previousGameStats?.[category] && (
            (stat === 'kda' && (
                this.previousGameStats[category].kills?.length > 0 ||
                this.previousGameStats[category].deaths?.length > 0 ||
                this.previousGameStats[category].assists?.length > 0
            )) ||
            (this.previousGameStats[category][stat]?.length > 0)
        );
    
        return hasHistoricalData || hasLiveData || hasPreviousData;
    }

    findMaxGameTime() {
        let maxGameTime = 0;
    
        CHART_TYPES.forEach(stat => {
            if (!this.hasCategoryData(this.currentCategory, stat)) return;
    
            STAT_KEYS.forEach(key => {
                const categoryData = this.averageEventTimes[this.currentCategory][key];
                if (!categoryData) return;
    
                if (stat === 'deathTimers' && categoryData.deaths?.length > 0) {
                    maxGameTime = Math.max(maxGameTime, ...categoryData.deaths);
                } else if (stat === 'kda') {
                    const allTimes = [
                        ...(categoryData.kills || []),
                        ...(categoryData.deaths || []),
                        ...(categoryData.assists || [])
                    ];
                    if (allTimes.length > 0) {
                        maxGameTime = Math.max(maxGameTime, ...allTimes);
                    }
                } else if (stat === 'itemPurchases') {
                    if (categoryData?.economy?.itemGold?.history?.timestamps?.length > 0) {
                        const timestamps = categoryData.economy.itemGold.history.timestamps;
                        if (timestamps.length > 0) {
                            maxGameTime = Math.max(maxGameTime, ...timestamps);
                        }
                    }
                } else if (Array.isArray(categoryData[stat]) && categoryData[stat].length > 0) {
                    maxGameTime = Math.max(maxGameTime, ...categoryData[stat]);
                }
            });

            if (this.currentLiveStats?.[this.currentCategory]) {
                if (stat === 'deathTimers' && this.currentLiveStats[this.currentCategory].deaths?.length > 0) {
                    maxGameTime = Math.max(maxGameTime, ...this.currentLiveStats[this.currentCategory].deaths);
                } else if (stat === 'kda') {
                    const allTimes = [
                        ...(this.currentLiveStats[this.currentCategory].kills || []),
                        ...(this.currentLiveStats[this.currentCategory].deaths || []),
                        ...(this.currentLiveStats[this.currentCategory].assists || [])
                    ];
                    if (allTimes.length > 0) {
                        maxGameTime = Math.max(maxGameTime, ...allTimes);
                    }
                } else if (Array.isArray(this.currentLiveStats[this.currentCategory][stat])) {
                    maxGameTime = Math.max(maxGameTime, ...this.currentLiveStats[this.currentCategory][stat]);
                }
            }
            
            if (this.previousGameStats?.[this.currentCategory]) {
                if (stat === 'deathTimers' && this.previousGameStats[this.currentCategory].deaths?.length > 0) {
                    maxGameTime = Math.max(maxGameTime, ...this.previousGameStats[this.currentCategory].deaths);
                } else if (stat === 'kda') {
                    const allTimes = [
                        ...(this.previousGameStats[this.currentCategory].kills || []),
                        ...(this.previousGameStats[this.currentCategory].deaths || []),
                        ...(this.previousGameStats[this.currentCategory].assists || [])
                    ];
                    if (allTimes.length > 0) {
                        maxGameTime = Math.max(maxGameTime, ...allTimes);
                    }
                } else if (Array.isArray(this.previousGameStats[this.currentCategory][stat])) {
                    maxGameTime = Math.max(maxGameTime, ...this.previousGameStats[this.currentCategory][stat]);
                }
            }
        });
    
        return Math.ceil(maxGameTime / 60);
    }

    renderAllCharts() {
        const maxTimeInMinutes = this.findMaxGameTime();
        
        CHART_TYPES.forEach(stat => {
            const canvas = document.getElementById(`${stat}Chart`);
            if (!canvas) return;
    
            // Get the chart wrapper element
            const wrapper = canvas.closest('.chart-wrapper');
            if (!wrapper) return;
    
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
                delete this.charts[stat];
            }
    
            // Check if we have data for this stat and category
            if (!this.hasCategoryData(this.currentCategory, stat)) {
                // Hide the entire wrapper if no data
                wrapper.style.display = 'none';
                return;
            }
    
            // Show the wrapper if we have data
            wrapper.style.display = 'block';
    
            const datasets = this.createDatasets(stat);
            if (datasets.length === 0) {
                wrapper.style.display = 'none';
                return;
            }
    
            const ctx = canvas.getContext('2d');
            const baseOptions = getChartOptions(stat, maxTimeInMinutes);
            
            const range = this.phaseRanges[this.gamePhase];
            const chartOptions = {
                ...baseOptions,
                scales: {
                    ...baseOptions.scales,
                    x: {
                        ...baseOptions.scales.x,
                        min: range.min,
                        max: range.max !== Infinity ? range.max : undefined,
                    }
                },
                animation: false,
                responsive: true,
                maintainAspectRatio: false
            };
                
            this.charts[stat] = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: chartOptions
            });
        });
    }


    createDatasets(stat) {
        const datasets = [];
        
        STAT_KEYS.forEach((key) => {
            const categoryData = this.averageEventTimes[this.currentCategory][key];
            if (!categoryData) return;
    
            const data = this.generateDataPoints(stat, categoryData);
    
            if (data.length > 0) {
                const baseDataset = {
                    label: `Historical ${stat} (${key})`,
                    data: data,
                    borderColor: colorConfig[key].borderColor,
                    backgroundColor: colorConfig[key].backgroundColor,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 1,
                    pointHoverRadius: 1,
                    order: 3
                };
            
                const trendlineData = calculateTrendline(data);
                const trendlineDataset = trendlineData ? {
                    label: `${key} Trendline`,
                    data: trendlineData,
                    borderColor: colorConfig[key].borderColor,
                    borderDash: [5, 5],
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    order: 2
                } : null;
            
                datasets.push(...createDatasetWithMode(baseDataset, trendlineDataset, this.displayMode));
            }
        });

        [
            { stats: this.currentLiveStats, config: colorConfig.live, label: 'Current Game' },
            { stats: this.previousGameStats, config: colorConfig.previousGame, label: 'Previous Game' }
        ].forEach(({ stats, config, label }) => {
            if (stats?.[this.currentCategory]) {
                const data = this.generateDataPoints(stat, stats[this.currentCategory]);
                if (data.length > 0) {
                    const baseDataset = {
                        label: `${label} ${stat}`,
                        data: data,
                        borderColor: config.borderColor,
                        backgroundColor: config.backgroundColor,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 1,
                        pointHoverRadius: 1,
                        order: 0
                    };

                    const trendlineData = calculateTrendline(data);
                    const trendlineDataset = trendlineData ? baseDataset : null;

                    datasets.push(...createDatasetWithMode(baseDataset, trendlineDataset, this.displayMode));
                }
            }
        });

        return datasets;
    }

    generateDataPoints(stat, categoryData) {
        if (!categoryData) return [];
        let dataPoints = [];

        switch (stat) {
            case 'deathTimers':
                if (!!categoryData.deaths) {
                    const isLiveOrPreviousData = this.currentLiveStats?.[this.currentCategory] === categoryData || 
                                            this.previousGameStats?.[this.currentCategory] === categoryData;

                    if (isLiveOrPreviousData && categoryData.totalTimeSpentDead?.length > 0) {
                        return categoryData.deaths
                            .map((deathTime, index) => ({
                                x: deathTime / 60,
                                y: categoryData.totalTimeSpentDead[index] / 60
                            }))
                            .filter(point => point.x != null && point.y != null);
                    } else if (categoryData.timeSpentDead?.length > 0) {
                        return categoryData.deaths
                            .map((deathTime, index) => ({
                                x: deathTime / 60,
                                y: categoryData.timeSpentDead[index] / 60
                            }))
                            .filter(point => point.x != null && point.y != null);
                    }
                }
                break;

            case 'kda':
                return generateKDAData(
                    categoryData.kills || [],
                    categoryData.deaths || [],
                    categoryData.assists || []
                );

                case 'itemPurchases':
                    const isLiveOrPreviousData = this.currentLiveStats?.[this.currentCategory] === categoryData || 
                                                this.previousGameStats?.[this.currentCategory] === categoryData;
                
                    if (isLiveOrPreviousData) {
                        // Handle live/previous game data
                        if (categoryData.itemGold && categoryData.itemGoldHistory?.length > 0) {
                            // Get the first timestamp as reference point
                            const startTime = categoryData.itemGoldHistory[0].timestamp;
                            
                            return categoryData.itemGoldHistory
                                .map(entry => ({
                                    // Convert to relative minutes since first item purchase
                                    x: entry.timestamp / 60,
                                    y: entry.gold
                                }))
                                .filter(point => point.x != null && point.y != null);
                        }
                    } else {
                        // Handle historical data
                        if (Array.isArray(categoryData.itemPurchases)) {
                            return categoryData.itemPurchases
                                .map(point => ({
                                    x: point.timestamp / 60,
                                    y: point.goldValue
                                }))
                                .filter(point => point.x != null && point.y != null);
                        }
                    }
                    break;

            default:
                if (Array.isArray(categoryData[stat])) {
                    return categoryData[stat].map((time, index) => ({
                        x: time / 60,
                        y: index + 1
                    }));
                }
        }

        // return [];
        // Filter data points for the current game phase
        const filteredPoints = dataPoints.filter(point => 
            point.x >= this.phaseRanges[this.gamePhase].min && 
            point.x < this.phaseRanges[this.gamePhase].max
        );
    
        // For cumulative stats, preserve the y-values relative to the full dataset
        if (stat !== 'deathTimers' && stat !== 'itemPurchases' && stat !== 'kda') {
            const baseIndex = dataPoints.findIndex(p => p.x >= this.phaseRanges[this.gamePhase].min);
            return filteredPoints.map(point => ({
                x: point.x,
                y: dataPoints.findIndex(p => p.x === point.x) + 1
            }));
        }

        return filteredPoints;
    }

    updateLiveStats(newStats) {
        this.currentLiveStats = newStats;
        this.updateChartVisibility();
        this.renderAllCharts();
        this.saveDataToStorage({
            averageEventTimes: this.averageEventTimes,
            currentLiveStats: this.currentLiveStats,
            previousGameStats: this.previousGameStats
        });
    }

    cleanup() {
        console.log('Running cleanup');
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    clearAll() {
        console.log('Running full cleanup');
        localStorage.removeItem('chartData');
        this.averageEventTimes = {};
        this.currentLiveStats = null;
        this.previousGameStats = null;
        this.cleanup();
    }
}