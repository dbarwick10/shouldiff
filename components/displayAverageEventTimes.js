import { calculateLiveStats } from "../features/liveMatchStats.js";    

export async function displayAverageEventTimes(averageEventTimes, calculateStats) {
    console.log('Initializing displayAverageEventTimes');
    
    const FETCH_INTERVAL_MS = 1000;
    let currentLiveStats = null;
    let previousGameStats = null;
    let currentGameId = null;
    let refreshInterval;
    let charts = {};

    const statKeys = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];
    const chartsToRender = ['kills', 'deaths', 'assists', 'kda'];
    
    const colorConfig = {
        wins: { borderColor: 'rgb(46, 204, 113, .75)', backgroundColor: 'rgb(46, 204, 113, 0.1)' },
        losses: { borderColor: 'rgb(231, 76, 60, .75)', backgroundColor: 'rgb(231, 76, 60, 0.1)' },
        surrenderWins: { borderColor: 'rgb(52, 152, 219, .75)', backgroundColor: 'rgb(52, 152, 219, 0.1)' },
        surrenderLosses: { borderColor: 'rgb(230, 126, 34, .75)', backgroundColor: 'rgb(230, 126, 34, 0.1)' },
        live: { borderColor: 'rgb(155, 89, 182, .75)', backgroundColor: 'rgb(155, 89, 182, 0.1)' },
        previousGame: { borderColor: 'rgb(149, 165, 166, .75)', backgroundColor: 'rgb(149, 165, 166, 0.1)' }
    };

    const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

    // Move destroyExistingCharts function definition to the top
    function destroyExistingCharts() {
        chartsToRender.forEach(stat => {
            if (charts[stat]) {
                charts[stat].destroy();
            }
        });
    }

    // Helper function to detect if this is a new game
    function isNewGame(newStats, currentStats) {
        if (!newStats || !currentStats) return true;
        
        // Check if the number of events has decreased (indicating a new game)
        for (const stat of chartsToRender) {
            const newStatArray = newStats[stat] || [];
            const currentStatArray = currentStats[stat] || [];
            
            if (newStatArray.length < currentStatArray.length) return true;
        }
        
        return false;
    }

    // Helper function to check if live stats have changed
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
        destroyExistingCharts();
    
        const newCharts = {};
    
        chartsToRender.forEach(stat => {
            const ctx = document.getElementById(`${stat}Chart`).getContext('2d');
    
            const datasets = statKeys.map((key) => {
                let data;
                if (stat === 'kda') {
                    data = (averageEventTimes.playerStats[key][stat] || []).map((kdaEntry) => ({
                        x: kdaEntry.timestamp,
                        y: kdaEntry.kdaValue
                    }));
                } else {
                    data = (averageEventTimes.playerStats[key][stat] || []).map((time, index) => ({
                        x: time,
                        y: index + 1
                    }));
                }
    
                // console.log(`Data for ${stat} (${key}):`, data);
    
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
                const dataToAdd = stat === 'kda'
                    ? previousGameStats[stat].map((kdaEntry) => ({
                        x: kdaEntry.timestamp,
                        y: kdaEntry.kdaValue
                    }))
                    : previousGameStats[stat].map((time, index) => ({
                        x: time,
                        y: index + 1
                    }));
    
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
                const dataToAdd = stat === 'kda'
                    ? currentLiveStats[stat].map((kdaEntry) => ({
                        x: kdaEntry.timestamp,
                        y: kdaEntry.kdaValue
                    }))
                    : currentLiveStats[stat].map((time, index) => ({
                        x: time,
                        y: index + 1
                    }));
    
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
    
            const chartOptions = {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: `${capitalizeFirstLetter(stat) === 'Kda' ? 'KDA' : capitalizeFirstLetter(stat)} Over Time`,
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
                scales: stat === 'kda' 
                    ? {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: { 
                                display: true, 
                                text: 'Time' 
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
                            max: Math.max(...datasets.flatMap(d => d.data.map(point => point.y))) + 1,
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
                                text: 'Time' 
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
                    },
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
                    // Check if this is a new game
                    if (isNewGame(newLiveStats, currentLiveStats)) {
                        console.log('New game detected, storing previous game data...');
                        if (currentLiveStats) {
                            previousGameStats = JSON.parse(JSON.stringify(currentLiveStats));
                        }
                        currentLiveStats = JSON.parse(JSON.stringify(newLiveStats));
                        charts = renderAllCharts();
                    }
                    // Update current game stats if they've changed
                    else if (haveLiveStatsChanged(newLiveStats, currentLiveStats)) {
                        console.log('Live stats changed, refreshing charts...');
                        currentLiveStats = JSON.parse(JSON.stringify(newLiveStats));
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
            }
        };
    } catch (error) {
        console.error('Error displaying average event times:', error);
        throw error;
    }
}