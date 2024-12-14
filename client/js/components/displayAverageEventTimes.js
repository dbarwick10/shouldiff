// import { calculateLiveStats } from "../features/liveMatchStats.js";
// import { cloneDeep } from 'https://cdn.skypack.dev/lodash';
import { FETCH_INTERVAL_MS, RETRY_INTERVAL_MS } from "./config/constraints.js"; 

export async function displayAverageEventTimes(averageEventTimes, calculateStats) {
    console.log('Initializing displayAverageEventTimes');
    
    // const FETCH_INTERVAL_MS = 1000; // Regular polling interval
    // const RETRY_INTERVAL_MS = 120000; // Longer interval for retrying when server is down
    let currentLiveStats = null;
    let previousGameStats = null;
    let refreshInterval;
    let retryTimeout;
    let charts = {};
    let currentCategory = 'playerStats';
    let isPolling = false;

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

    // Helper function to hide/show chart container
    function toggleChartVisibility(stat, visible) {
        const container = document.getElementById(`${stat}Chart`).parentElement;
        if (container) {
            container.style.display = visible ? 'block' : 'none';
        }

        document.querySelector('.chart-legend').style.display = 'flex';
        document.querySelector('.chart-container').style.display = 'grid';
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


    function hasCategoryData(category, stat) {
        // Special check for deathTimers
        if (stat === 'deathTimers') {
            // Check historical data
            const hasHistoricalData = statKeys.some(key => {
                const categoryData = averageEventTimes[category][key];
                return categoryData?.deaths?.length > 0 && categoryData?.timeSpentDead?.length > 0;
            });
    
            // Check live game data - Now using nested structure
            const hasLiveData = currentLiveStats?.[category]?.deaths?.length > 0 && 
                              currentLiveStats?.[category]?.timeSpentDead?.length > 0;
    
            // Check previous game data - Now using nested structure
            const hasPreviousData = previousGameStats?.[category]?.deaths?.length > 0 && 
                                  previousGameStats?.[category]?.timeSpentDead?.length > 0;
    
            return hasHistoricalData || hasLiveData || hasPreviousData;
        }
    
        // Check historical data
        const hasHistoricalData = statKeys.some(key => {
            const categoryData = averageEventTimes[category][key];
            return categoryData && Array.isArray(categoryData[stat]) && categoryData[stat].length > 0;
        });
    
        // Check live game data - Modified to handle nested structure
        const hasLiveData = currentLiveStats?.[category] && (
            (stat === 'kda' && (
                currentLiveStats[category].kills?.length > 0 ||
                currentLiveStats[category].deaths?.length > 0 ||
                currentLiveStats[category].assists?.length > 0
            )) ||
            (currentLiveStats[category][stat]?.length > 0)
        );
    
        // Check previous game data - Modified to handle nested structure
        const hasPreviousData = previousGameStats?.[category] && (
            (stat === 'kda' && (
                previousGameStats[category].kills?.length > 0 ||
                previousGameStats[category].deaths?.length > 0 ||
                previousGameStats[category].assists?.length > 0
            )) ||
            (previousGameStats[category][stat]?.length > 0)
        );
    
        return hasHistoricalData || hasLiveData || hasPreviousData;
    }
    
     // Helper function to calculate KDA at a specific timestamp
     function calculateKDAAtTime(kills, deaths, assists, timestamp) {
        const killsBeforeTime = kills.filter(time => time <= timestamp).length;
        const deathsBeforeTime = deaths.filter(time => time <= timestamp).length;
        const assistsBeforeTime = assists.filter(time => time <= timestamp).length;
        
        // Avoid division by zero
        return deathsBeforeTime === 0 ? 
            killsBeforeTime + assistsBeforeTime : 
            ((killsBeforeTime + assistsBeforeTime) / deathsBeforeTime).toFixed(2);
    }

    // Helper function to generate KDA data points from individual events
    function generateKDAData(kills, deaths, assists) {
        if (!kills?.length && !deaths?.length && !assists?.length) return [];
        
        // Combine all timestamps and sort them
        const allEvents = [
            ...(kills || []).map(time => ({ time, type: 'kill' })),
            ...(deaths || []).map(time => ({ time, type: 'death' })),
            ...(assists || []).map(time => ({ time, type: 'assist' }))
        ].sort((a, b) => a.time - b.time);

        // Generate KDA value for each event
        return allEvents.map(event => ({
            x: event.time / 60,
            y: Number(calculateKDAAtTime(kills || [], deaths || [], assists || [], event.time))
        }));
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
            if (!hasCategoryData(currentCategory, stat)) {
                return;
            }
    
            const datasets = [];
    
            // Add historical data
            statKeys.forEach((key) => {
                const categoryData = averageEventTimes[currentCategory][key];
                if (!categoryData) return;
    
                let data = [];
                
                if (stat === 'deathTimers') {
                    if (categoryData.deaths?.length > 0 && categoryData.timeSpentDead?.length > 0) {
                        data = categoryData.deaths
                            .map((deathTime, index) => ({
                                x: deathTime / 60,
                                y: categoryData.timeSpentDead[index]
                            }))
                            .filter(point => point.x != null && point.y != null);
                    }
                } else if (stat === 'kda') {
                    data = generateKDAData(
                        categoryData.kills || [],
                        categoryData.deaths || [],
                        categoryData.assists || []
                    );
                } else if (Array.isArray(categoryData[stat])) {
                    data = categoryData[stat].map((time, index) => ({
                        x: time / 60,
                        y: index + 1
                    }));
                }
    
                if (data.length > 0) {
                    datasets.push({
                        label: `Historical ${stat} (${key})`,
                        data: data,
                        borderColor: colorConfig[key].borderColor,
                        backgroundColor: colorConfig[key].backgroundColor,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 1,
                        pointHoverRadius: 1
                    });
                }
            });
    
            // Add previous game data
            if (previousGameStats) {
                let dataToAdd = [];
    
                if (stat === 'deathTimers') {
                    // console.log('Processing Death Timer Data:', {
                    //     currentCategory,
                    //     stats: currentLiveStats?.[currentCategory]
                    // });
                
                    if (currentLiveStats?.[currentCategory]?.deaths?.length > 0 && 
                        currentLiveStats?.[currentCategory]?.timeSpentDead?.length > 0) {
                        
                        // Ensure arrays are properly initialized
                        const deaths = currentLiveStats[currentCategory].deaths || [];
                        const timers = currentLiveStats[currentCategory].timeSpentDead || [];
                        
                        // console.log('Death Timer Arrays:', {
                        //     deaths,
                        //     timers,
                        //     deathsLength: deaths.length,
                        //     timersLength: timers.length
                        // });
                
                        dataToAdd = deaths
                            .map((deathTime, index) => {
                                if (timers[index] === undefined) {
                                    console.warn(`Missing timer for death at index ${index}`);
                                    return null;
                                }
                                
                                const point = {
                                    x: deathTime / 60,  // Convert to minutes
                                    y: timers[index]    // Use individual death timer
                                };
                                
                                // console.log(`Mapped point ${index}:`, point);
                                return point;
                            })
                            .filter(point => point !== null);
                        
                        // console.log('Final Death Timer Dataset:', dataToAdd);
                    } else {
                        console.log('Insufficient death timer data:', {
                            hasDeaths: Boolean(currentLiveStats?.[currentCategory]?.deaths?.length),
                            hasTimers: Boolean(currentLiveStats?.[currentCategory]?.timeSpentDead?.length)
                        });
                    }
                } else if (stat === 'kda') {
                    dataToAdd = generateKDAData(
                        previousGameStats.kills || [],
                        previousGameStats.deaths || [],
                        previousGameStats.assists || []
                    );
                } else if (Array.isArray(previousGameStats[stat])) {
                    dataToAdd = previousGameStats[stat].map((time, index) => ({
                        x: time / 60,
                        y: index + 1
                    }));
                }
    
                if (dataToAdd.length > 0) {
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
            }
    
            // Add live game data
            if (currentLiveStats?.[currentCategory]) {
                let dataToAdd = [];
            
                if (stat === 'deathTimers') {
                    // console.log('Processing Death Timers for Live Data:', {
                    //     category: currentCategory,
                    //     test: currentLiveStats?.[currentCategory],
                    //     deaths: currentLiveStats?.[currentCategory]?.deaths,
                    //     timeSpentDead: currentLiveStats?.[currentCategory]?.timeSpentDead,
                    //     totalTimeSpentDead: currentLiveStats?.[currentCategory]?.totalTimeSpentDead
                    // });

                    if (currentLiveStats[currentCategory].deaths?.length > 0 && 
                        currentLiveStats[currentCategory].totalTimeSpentDead?.length > 0) {
                        dataToAdd = currentLiveStats[currentCategory].deaths
                            .map((deathTime, index) => ({
                                x: deathTime / 60,  // Convert to minutes for x-axis
                                y: currentLiveStats[currentCategory].totalTimeSpentDead[index] // Use individual death timer
                            }))
                            .filter(point => point.x != null && point.y != null);
                    }
                    // console.log('Final Death Timer Data Points:', dataToAdd);
                } else if (stat === 'kda') {
                    dataToAdd = generateKDAData(
                        currentLiveStats[currentCategory].kills || [],
                        currentLiveStats[currentCategory].deaths || [],
                        currentLiveStats[currentCategory].assists || []
                    );
                } else if (Array.isArray(currentLiveStats[currentCategory][stat])) {
                    dataToAdd = currentLiveStats[currentCategory][stat].map((time, index) => ({
                        x: time / 60,
                        y: index + 1
                    }));
                }
            
                if (dataToAdd.length > 0) {
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
            }
    
            if (datasets.length === 0) return;
    
            const ctx = document.getElementById(`${stat}Chart`).getContext('2d');
            
            const chartOptions = {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: stat === 'deathTimers' ? 'Time Spent Dead vs Time of Death' : 
                              (stat === 'kda' ? 'KDA' : capitalizeFirstLetter(stat)) + ' Over Time',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                const time = context.parsed.x.toFixed(1);
                                if (stat === 'deathTimers') {
                                    return `${label}: ${value.toFixed(1)}s at ${time} min`;
                                } else if (stat === 'kda') {
                                    return `${label}: ${value.toFixed(2)} at ${time} min`;
                                } else {
                                    return `${label}: ${value} at ${time} min`;
                                }
                            }
                        }
                    },
                    legend: {
                        display: false,
                        position: 'top'
                    }
                },
                scales: stat === 'deathTimers' 
                    ? {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: { 
                                display: true, 
                                text: 'Time of Death (Minutes)',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                callback: value => value.toFixed(0)
                            }
                        },
                        y: { 
                            title: { 
                                display: true, 
                                text: 'Time Spent Dead (Seconds)',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            beginAtZero: true
                        }
                    }
                    : (stat === 'kda' 
                        ? {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: { 
                                    display: true, 
                                    text: 'Time (Minutes)',
                                    font: {
                                        weight: 'bold'
                                    }
                                },
                                ticks: {
                                    callback: value => value.toFixed(0)
                                }
                            },
                            y: { 
                                title: { 
                                    display: true, 
                                    text: 'KDA Ratio',
                                    font: {
                                        weight: 'bold'
                                    }
                                },
                                beginAtZero: true
                            }
                        }
                        : {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: { 
                                    display: true, 
                                    text: 'Time (Minutes)',
                                    font: {
                                        weight: 'bold'
                                    }
                                },
                                ticks: {
                                    callback: value => value.toFixed(0)
                                }
                            },
                            y: { 
                                title: { 
                                    display: true, 
                                    text: `Total ${capitalizeFirstLetter(stat)}`,
                                    font: {
                                        weight: 'bold'
                                    }
                                },
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }),
                animation: { duration: 0 }
            };
    
            newCharts[stat] = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: chartOptions
            });
        });
    
        return newCharts;
    }

    // Update the isNewGame function
    function isNewGame(newStats, currentStats) {
        if (!newStats || !currentStats) return true;
        
        const statsToCheck = [
            'kills', 'deaths', 'assists', 'kda', 'turrets', 'dragons', 'barons', 'elders', 'inhibitors', 'deathTimers'
        ];
        
        const category = currentCategory; // Use the current selected category
        
        for (const stat of statsToCheck) {
            const newStatArray = newStats[category]?.[stat] || [];
            const currentStatArray = currentStats[category]?.[stat] || [];
            
            if (newStatArray.length < currentStatArray.length) return true;
        }
        
        return false;
    }
    
    function haveLiveStatsChanged(newStats, currentStats) {
        if (!newStats || !currentStats) return true;
        
        const category = currentCategory;
        const statsToCheck = [
            'kills', 'deaths', 'assists', 'timeSpentDead', 'totalTimeSpentDead',
            'turrets', 'dragons', 'barons', 'elders', 'inhibitors'
        ];
        
        // Only compare array lengths and last values instead of deep comparison
        for (const stat of statsToCheck) {
            const newArray = newStats[category]?.[stat] || [];
            const currentArray = currentStats[category]?.[stat] || [];
            
            if (newArray.length !== currentArray.length) {
                return true;
            }
            
            // Only compare the last value if arrays have elements
            if (newArray.length > 0 && 
                newArray[newArray.length - 1] !== currentArray[currentArray.length - 1]) {
                return true;
            }
        }
        
        return false;
    }

// Update the startLiveDataRefresh function
async function startLiveDataRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    if (retryTimeout) {
        clearTimeout(retryTimeout);
    }

    async function updateLiveData() {
        try {
            const response = await fetch('https://127.0.0.1:3000/api/live-stats');
            
            if (!response.ok) {
                // If server is running but no game is active
                if (response.status === 404) {
                    console.log('No active game found');
                    return null;
                }
                
                // If server is running but live stats temporarily unavailable
                if (response.status === 503) {
                    console.log('Live stats temporarily unavailable, will retry...');
                    return null;
                }

                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const newLiveStats = await response.json();
            
            // Successfully connected - switch to regular polling interval
            if (!isPolling) {
                isPolling = true;
                restartPolling(FETCH_INTERVAL_MS);
            }
            
            if (newLiveStats) {
                if (isNewGame(newLiveStats, currentLiveStats)) {
                    if (currentLiveStats) {
                        previousGameStats = JSON.parse(JSON.stringify(currentLiveStats));
                    }
                    currentLiveStats = newLiveStats;
                }
                else if (haveLiveStatsChanged(newLiveStats, currentLiveStats)) {
                    currentLiveStats = newLiveStats;
                }
                
                updateChartVisibility();
                charts = renderAllCharts();
            }
        } catch (error) {
            // Handle connection errors (server not running)
            if (error.message.includes('Failed to fetch') || error.message.includes('HTTP error')) {
                console.log('Live stats server not available, will retry later...');
                
                // Switch to retry mode with longer interval
                if (isPolling) {
                    isPolling = false;
                    restartPolling(RETRY_INTERVAL_MS);
                }
            } else {
                console.error('Error refreshing live stats:', error);
            }
        }
    }

    function restartPolling(interval) {
        // Clear existing intervals/timeouts
        if (refreshInterval) clearInterval(refreshInterval);
        if (retryTimeout) clearTimeout(retryTimeout);
        
        // Start new polling interval
        refreshInterval = setInterval(updateLiveData, interval);
    }

    // Initial attempt
    await updateLiveData();
    
    // Start with retry interval - will switch to regular interval when connection succeeds
    if (!isPolling) {
        restartPolling(RETRY_INTERVAL_MS);
    }
}

try {
    // Add event listeners
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
            if (retryTimeout) {
                clearTimeout(retryTimeout);
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
