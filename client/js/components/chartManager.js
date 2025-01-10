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
        this.charts = {};
        this.currentCategory = 'teamStats';
        this.displayMode = 'both';
        this.averageEventTimes = config.averageEventTimes || {};
        this.currentLiveStats = config.currentLiveStats || null;
        this.previousGameStats = config.previousGameStats || null;
    }

    initializeToggleButtons() {
        document.querySelectorAll('input[name="statType"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.updateChartVisibility();
                this.updateLegendVisibility();
                this.renderAllCharts();
            });
        });

        document.querySelectorAll('input[name="displayMode"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.displayMode = e.target.value;
                this.renderAllCharts();
            });
        });
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

    hasCategoryData(category, stat) {
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
                } else if (stat === 'gold') {
                    if (categoryData?.itemGold?.length > 0) {
                        const timestamps = categoryData.itemGold
                            .filter(point => point && point.timestamp != null)
                            .map(point => point.timestamp);
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
    
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
                delete this.charts[stat];
            }
    
            if (!this.hasCategoryData(this.currentCategory, stat)) {
                return;
            }
    
            const datasets = this.createDatasets(stat);
            if (datasets.length === 0) return;
    
            const ctx = canvas.getContext('2d');
            const chartOptions = {
                ...getChartOptions(stat, maxTimeInMinutes),
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                transitions: {
                    active: {
                        animation: {
                            duration: 0
                        }
                    }
                }
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
                    tension: 0.3,
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
                        tension: 0.3,
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

        switch (stat) {
            case 'deathTimers':
                if (categoryData.deaths?.length > 0 && categoryData.timeSpentDead?.length > 0) {
                    return categoryData.deaths
                        .map((deathTime, index) => ({
                            x: deathTime / 60,
                            y: categoryData.timeSpentDead[index]
                        }))
                        .filter(point => point.x != null && point.y != null);
                }
                break;

            case 'kda':
                return generateKDAData(
                    categoryData.kills || [],
                    categoryData.deaths || [],
                    categoryData.assists || []
                );

            case 'gold':
                if (categoryData?.itemGold?.length > 0) {
                    return categoryData.itemGold
                        .filter(point => point && point.gold != null && point.timestamp != null)
                        .map(point => ({
                            x: point.timestamp / 60,
                            y: point.gold
                        }));
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

        return [];
    }

    updateLiveStats(newStats) {
        this.currentLiveStats = newStats;
        this.updateChartVisibility();
        this.renderAllCharts();
    }

    cleanup() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });

        document.querySelectorAll('input[name="statType"]').forEach(input => {
            input.removeEventListener('change', () => {});
        });
        document.querySelectorAll('input[name="displayMode"]').forEach(input => {
            input.removeEventListener('change', () => {});
        });
    }
}