import { calculateLiveStats } from "../features/liveMatchStats.js";    

export async function displayAverageEventTimes(averageEventTimes, calculateStats) {

    console.log('Initializing displayAverageEventTimes');
    
    const FETCH_INTERVAL_MS = 1000;
    const dropdown = document.getElementById('statSelector');
    let chart;
    let currentLiveStats = null;
    let refreshInterval;

    const statOptions = ['kills', 'deaths', 'assists'];
    const statKeys = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];
    const colorConfig = {
        wins: { borderColor: 'rgb(46, 204, 113, .75)', backgroundColor: 'rgb(46, 204, 113, 0.1)' },
        losses: { borderColor: 'rgb(231, 76, 60, .75)', backgroundColor: 'rgb(231, 76, 60, 0.1)' },
        surrenderWins: { borderColor: 'rgb(52, 152, 219, .75)', backgroundColor: 'rgb(52, 152, 219, 0.1)' },
        surrenderLosses: { borderColor: 'rgb(230, 126, 34, .75)', backgroundColor: 'rgb(230, 126, 34, 0.1)' },
        live: { borderColor: 'rgb(155, 89, 182, .75)', backgroundColor: 'rgb(155, 89, 182, 0.1)' }
    };

    const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

    // Setup dropdown
    dropdown.innerHTML = '';
    statOptions.forEach(stat => {
        const option = document.createElement('option');
        option.value = stat;
        option.textContent = capitalizeFirstLetter(stat);
        dropdown.appendChild(option);
    });

    function updateChart(selectedStat) {
        console.log(`Updating chart for ${selectedStat}...`);
        console.log('Current live stats data:', currentLiveStats);
        
        if (currentLiveStats) {
            console.log(`Live ${selectedStat} data:`, currentLiveStats[selectedStat]);
        }

        const maxEventCount = Math.max(
            ...statKeys.map(key => {
                const length = averageEventTimes.playerStats[key][selectedStat]?.length || 0;
                console.log(`Historical ${key} ${selectedStat} count:`, length);
                return length;
            }),
            currentLiveStats?.[selectedStat]?.length || 0
        );
        console.log('Maximum event count:', maxEventCount);

        const labels = Array.from(
            { length: maxEventCount },
            (_, i) => `${capitalizeFirstLetter(selectedStat)} ${i + 1}`
        );

        const datasets = statKeys.map((key) => ({
            label: `Historical ${selectedStat} (${key})`,
            data: averageEventTimes.playerStats[key][selectedStat] || [],
            borderColor: colorConfig[key].borderColor,
            backgroundColor: colorConfig[key].backgroundColor,
            fill: true,
            tension: 0.3,
        }));

        // Add live stats dataset if available
        if (currentLiveStats && currentLiveStats[selectedStat]?.length > 0) {
            console.log(`Adding live ${selectedStat} data to chart:`, currentLiveStats[selectedStat]);
            datasets.push({
                label: `Current Game ${selectedStat}`,
                data: currentLiveStats[selectedStat],
                borderColor: colorConfig.live.borderColor,
                backgroundColor: colorConfig.live.backgroundColor,
                fill: true,
                tension: 0.3,
            });
        } else {
            console.log('No live data available for', selectedStat);
        }

        const ctx = document.getElementById('averageEventTimesChart').getContext('2d');
        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { 
                        display: true, 
                        text: `Historical${currentLiveStats ? ' vs Live' : ''} ${capitalizeFirstLetter(selectedStat)} Times` 
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        title: { display: true, text: 'Time (seconds)' } 
                    }
                },
                animation: { duration: 0 }
            }
        });
        
        console.log(`Chart updated for ${selectedStat}`);
    }

    // Helper function to check if live stats have changed
    function haveLiveStatsChanged(newStats, currentStats) {
        if (!newStats || !currentStats) return true;
        
        for (const stat of statOptions) {
            const newStatArray = newStats[stat] || [];
            const currentStatArray = currentStats[stat] || [];
            
            if (newStatArray.length !== currentStatArray.length) return true;
            
            for (let i = 0; i < newStatArray.length; i++) {
                if (newStatArray[i] !== currentStatArray[i]) return true;
            }
        }
        
        return false;
    }

    // Function to start live data refresh
    async function startLiveDataRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    
        const updateLiveData = async () => {
            try {
                const newLiveStats = await calculateLiveStats();
                console.log('Refreshed live stats:', newLiveStats);
    
                if (newLiveStats && haveLiveStatsChanged(newLiveStats, currentLiveStats)) {
                    console.log('Live stats changed, refreshing chart...');
                    currentLiveStats = JSON.parse(JSON.stringify(newLiveStats)); // Create deep copy
                    updateChart(dropdown.value);
                } else {
                    console.log('No changes in live stats detected');
                }
            } catch (error) {
                console.error('Error refreshing live stats:', error);
            }
        };
    
        // Initial update
        await updateLiveData();
    
        // Set up interval for updates
        refreshInterval = setInterval(updateLiveData, FETCH_INTERVAL_MS);
    }

    try {
        // Set up dropdown change handler
        dropdown.addEventListener('change', (e) => {
            console.log('Stat selection changed to:', e.target.value);
            updateChart(e.target.value);
        });
        
        // Initial render with 'kills' and start live data refresh
        console.log('Performing initial chart render with kills');
        dropdown.value = 'kills';
        
        if (calculateStats) {
            console.log('Starting live data refresh...');
            await startLiveDataRefresh();
        } else {
            console.log('No live stats promise provided, running in historical-only mode');
            updateChart('kills');
        }
        
        console.log('Chart initialization complete');
        
        // Return cleanup function
        return {
            updateChart,
            cleanup: () => {
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                }
                if (chart) {
                    chart.destroy();
                }
            }
        };
    } catch (error) {
        console.error('Error displaying average event times:', error);
        throw error;
    }
}