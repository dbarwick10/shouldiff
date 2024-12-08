import { calculateLiveStats } from "../features/liveMatchStats.js";    

export async function displayAverageEventTimes(averageEventTimes, calculateStats) {
    console.log('Initializing displayAverageEventTimes');
    
    const FETCH_INTERVAL_MS = 1000;
    let currentLiveStats = null;
    let previousGameStats = null;
    let currentGameId = null;
    let refreshInterval;
    let charts = {};
    let currentCategory = 'playerStats';

    const statKeys = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];
    const chartsToRender = ['kills', 'deaths', 'assists', 'kda', 'turrets', 'dragons', 'barons', 'elders', 'inhibitors', 'deathTimers'];
    
    const colorConfig = {
        wins: { borderColor: 'rgb(46, 204, 113, .75)', backgroundColor: 'rgb(46, 204, 113, 0.1)' },
        losses: { borderColor: 'rgb(231, 76, 60, .75)', backgroundColor: 'rgb(231, 76, 60, 0.1)' },
        surrenderWins: { borderColor: 'rgb(52, 152, 219, .75)', backgroundColor: 'rgb(52, 152, 219, 0.1)' },
        surrenderLosses: { borderColor: 'rgb(230, 126, 34, .75)', backgroundColor: 'rgb(230, 126, 34, 0.1)' },
        live: { borderColor: 'rgb(155, 89, 182, .75)', backgroundColor: 'rgb(155, 89, 182, 0.1)' },
        previousGame: { borderColor: 'rgb(149, 165, 166, .75)', backgroundColor: 'rgb(149, 165, 166, 0.1)' }
    };

    // Helper function to check if a dataset has any data points
    function hasData(datasets) {
        return datasets.some(dataset => dataset.data && dataset.data.length > 0);
    }

    // Helper function to check if a category has data for a specific stat
    function hasCategoryData(category, stat) {
        // Check historical data
        const hasHistoricalData = statKeys.some(key => {
            const categoryData = averageEventTimes[category][key];
            return categoryData && categoryData[stat] && categoryData[stat].length > 0;
        });

        // Check live game data
        const hasLiveData = currentLiveStats && currentLiveStats[stat] && currentLiveStats[stat].length > 0;

        // Check previous game data
        const hasPreviousData = previousGameStats && previousGameStats[stat] && previousGameStats[stat].length > 0;

        return hasHistoricalData || hasLiveData || hasPreviousData;
    }

    // Helper function to hide/show chart container
    function toggleChartVisibility(stat, visible) {
        const container = document.getElementById(`${stat}Chart`).parentElement;
        if (container) {
            container.style.display = visible ? 'block' : 'none';
        }
    }

    // Update chart visibility for current category
    function updateChartVisibility() {
        chartsToRender.forEach(stat => {
            const hasDataForStat = hasCategoryData(currentCategory, stat);
            toggleChartVisibility(stat, hasDataForStat);
        });
    }

    function toggleStats(category) {
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.style.backgroundColor = '#e0e0e0';
            btn.style.color = 'black';
        });
        document.getElementById(`${category}Btn`).style.backgroundColor = '#3498db';
        document.getElementById(`${category}Btn`).style.color = 'white';
        
        currentCategory = category;
        updateChartVisibility();
        charts = renderAllCharts();
    }

    const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

    function isNewGame(newStats, currentStats) {
        if (!newStats || !currentStats) return true;
        
        for (const stat of chartsToRender) {
            const newStatArray = newStats[stat] || [];
            const currentStatArray = currentStats[stat] || [];
            
            if (newStatArray.length < currentStatArray.length) return true;
        }
        
        return false;
    }

    function haveLiveStatsChanged(newStats, currentStats) {
        if (!newStats || !currentStats) return true;
        
        for (const stat of chartsToRender) {
            const newStatArray = newStats[stat] || [];
            const currentStatArray = currentStats[stat] || [];
            
            if (newStatArray.length !== currentStatArray.length) return true;
            
            for (let i = 0; i < newStatArray.length; i++) {
                if (newStatArray[i] !== currentStatArray[i]) return true;
            }
        }
        
        return false;
    }

    function renderAllCharts() {
        chartsToRender.forEach(stat => {
            const canvas = document.getElementById(`${stat}Chart`);
            if (canvas) {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            }
        });
    
        const newCharts = {};
    
        chartsToRender.forEach(stat => {
            // Skip rendering if there's no data for this stat in the current category
            if (!hasCategoryData(currentCategory, stat)) {
                return;
            }

            const datasets = statKeys.map((key) => {
                let data;
                const categoryData = averageEventTimes[currentCategory][key];
                
                if (stat === 'deathTimers') {
                    const deaths = categoryData.deaths || [];
                    const timeSpentDead = categoryData.timeSpentDead || [];
                    
                    data = deaths.map((deathTime, index) => ({
                        x: deathTime,
                        y: timeSpentDead[index] || 0
                    })).filter(point => point.x != null && point.y != null);
                } else if (stat === 'kda') {
                    data = (categoryData[stat] || []).map((kdaEntry) => ({
                        x: kdaEntry.timestamp,
                        y: kdaEntry.kdaValue
                    }));
                } else {
                    data = (categoryData[stat] || []).map((time, index) => ({
                        x: time,
                        y: index + 1
                    }));
                }
    
                return {
                    label: `Historical ${stat} (${key})`,
                    data: data,
                    borderColor: colorConfig[key].borderColor,
                    backgroundColor: colorConfig[key].backgroundColor,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 1,
                    pointHoverRadius: 1
                };
            });
    
            if (previousGameStats && previousGameStats[stat]?.length > 0) {
                let dataToAdd;
                if (stat === 'deathTimers') {
                    const deaths = previousGameStats.deaths || [];
                    const timeSpentDead = previousGameStats.timeSpentDead || [];
                    
                    dataToAdd = deaths.map((deathTime, index) => ({
                        x: deathTime,
                        y: timeSpentDead[index] || 0
                    })).filter(point => point.x != null && point.y != null);
                } else if (stat === 'kda') {
                    dataToAdd = previousGameStats[stat].map((kdaEntry) => ({
                        x: kdaEntry.timestamp,
                        y: kdaEntry.kdaValue
                    }));
                } else {
                    dataToAdd = previousGameStats[stat].map((time, index) => ({
                        x: time,
                        y: index + 1
                    }));
                }
    
                datasets.push({
                    label: `Previous Game ${stat}`,
                    data: dataToAdd,
                    borderColor: colorConfig.previousGame.borderColor,
                    backgroundColor: colorConfig.previousGame.backgroundColor,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 1,
                    pointHoverRadius: 1
                });
            }
    
            if (currentLiveStats && currentLiveStats[stat]?.length > 0) {
                let dataToAdd;
                if (stat === 'deathTimers') {
                    const deaths = currentLiveStats.deaths || [];
                    const timeSpentDead = currentLiveStats.timeSpentDead || [];
                    
                    dataToAdd = deaths.map((deathTime, index) => ({
                        x: deathTime,
                        y: timeSpentDead[index] || 0
                    })).filter(point => point.x != null && point.y != null);
                } else if (stat === 'kda') {
                    dataToAdd = currentLiveStats[stat].map((kdaEntry) => ({
                        x: kdaEntry.timestamp,
                        y: kdaEntry.kdaValue
                    }));
                } else {
                    dataToAdd = currentLiveStats[stat].map((time, index) => ({
                        x: time,
                        y: index + 1
                    }));
                }
    
                datasets.push({
                    label: `Current Game ${stat}`,
                    data: dataToAdd,
                    borderColor: colorConfig.live.borderColor,
                    backgroundColor: colorConfig.live.backgroundColor,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 1,
                    pointHoverRadius: 1
                });
            }

            const ctx = document.getElementById(`${stat}Chart`).getContext('2d');
    
            const chartOptions = {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: stat === 'deathTimers' ? 'Total Time Spent Dead' : 
                              (stat === 'kda' ? 'KDA' : capitalizeFirstLetter(stat)) + ' Over Time',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        enabled: false
                    },
                    legend: {
                        display: false
                    }
                },
                scales: stat === 'deathTimers' 
                    ? {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: { 
                                display: true, 
                                text: 'Time of Death (Minutes)' 
                            },
                            ticks: {
                                stepSize: 5,
                                display: true
                            }
                        },
                        y: { 
                            title: { 
                                display: true, 
                                text: 'Time Spent Dead (Seconds)' 
                            },
                            ticks: {
                                stepSize: 5,
                                display: true
                            }
                        }
                    }
                    : (stat === 'kda' 
                        ? {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: { 
                                    display: true, 
                                    text: 'Time (Minutes)' 
                                },
                                ticks: {
                                    display: true
                                }
                            },
                            y: { 
                                title: { 
                                    display: true, 
                                    text: 'KDA' 
                                },
                                min: Math.floor(0, Math.min(...datasets.flatMap(d => d.data.map(point => point.y))) - 1),
                                max: Math.round(Math.max(...datasets.flatMap(d => d.data.map(point => point.y))) + 1),
                                ticks: {
                                    stepSize: 1,
                                    display: true
                                }
                            }
                        }
                        : {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: { 
                                    display: true, 
                                    text: 'Time (Minutes)' 
                                },
                                ticks: {
                                    display: true
                                }
                            },
                            y: { 
                                title: { 
                                    display: true, 
                                    text: `${capitalizeFirstLetter(stat)}`
                                },
                                ticks: {
                                    stepSize: 5,
                                    display: true
                                }
                            }
                        }),
                animation: { duration: 0 }
            };
    
            newCharts[stat] = new Chart(ctx, {
                type: 'line',
                data: { 
                    datasets 
                },
                options: chartOptions
            });
        });
    
        return newCharts;
    }

    async function startLiveDataRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    
        const updateLiveData = async () => {
            try {
                const newLiveStats = await calculateLiveStats();
                console.log('Refreshed live stats:', newLiveStats);
    
                if (newLiveStats) {
                    if (isNewGame(newLiveStats, currentLiveStats)) {
                        console.log('New game detected, storing previous game data...');
                        if (currentLiveStats) {
                            previousGameStats = JSON.parse(JSON.stringify(currentLiveStats));
                        }
                        currentLiveStats = JSON.parse(JSON.stringify(newLiveStats));
                        updateChartVisibility();
                        charts = renderAllCharts();
                    }
                    else if (haveLiveStatsChanged(newLiveStats, currentLiveStats)) {
                        console.log('Live stats changed, refreshing charts...');
                        currentLiveStats = JSON.parse(JSON.stringify(newLiveStats));
                        updateChartVisibility();
                        charts = renderAllCharts();
                    } else {
                        console.log('No changes in live stats detected');
                    }
                }
            } catch (error) {
                console.error('Error refreshing live stats:', error);
            }
        };
    
        await updateLiveData();
        refreshInterval = setInterval(updateLiveData, FETCH_INTERVAL_MS);
    }

    try {
        document.getElementById('playerStatsBtn').addEventListener('click', () => toggleStats('playerStats'));
        document.getElementById('teamStatsBtn').addEventListener('click', () => toggleStats('teamStats'));
        document.getElementById('enemyStatsBtn').addEventListener('click', () => toggleStats('enemyStats'));
            
        updateChartVisibility();
        charts = renderAllCharts();
        
        if (calculateStats) {
            console.log('Starting live data refresh...');
            await startLiveDataRefresh();
        } else {
            console.log('No live stats promise provided, running in historical-only mode');
        }
        
        console.log('Chart initialization complete');
        
        return {
            cleanup: () => {
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                }
                Object.values(charts).forEach(chart => chart.destroy());
                
                document.getElementById('playerStatsBtn').removeEventListener('click', () => toggleStats('playerStats'));
                document.getElementById('teamStatsBtn').removeEventListener('click', () => toggleStats('teamStats'));
                document.getElementById('enemyStatsBtn').removeEventListener('click', () => toggleStats('enemyStats'));
            }
        };
    } catch (error) {
        console.error('Error displaying average event times:', error);
        throw error;
    }
}