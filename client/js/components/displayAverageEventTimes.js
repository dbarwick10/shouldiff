import { ChartManager } from './chartManager.js';
import { LiveStatsService } from '../services/liveStatsService.js';

export async function displayAverageEventTimes(averageEventTimes, calculateStats) {
    console.log('Initializing displayAverageEventTimes');
    
    const chartManager = new ChartManager({ 
        averageEventTimes: averageEventTimes === true ? null : averageEventTimes,
        currentLiveStats: null
    });
    let liveStatsService = null;

    try {
        // Initialize chart manager
        chartManager.initializeToggleButtons();
        
        if (averageEventTimes === true) {
            // Just render existing data from storage
            if (chartManager.loadDataFromStorage()) {
                chartManager.renderAllCharts();
            }
        } else {
            // Create new charts with new data
            chartManager.resetToDefaults();
            
            if (calculateStats) {
                console.log('Starting live data refresh...');
                liveStatsService = new LiveStatsService({
                    onUpdate: (stats) => {
                        chartManager.updateLiveStats(stats);
                    }
                });
                await liveStatsService.startPolling();
            }
        }
        
        console.log('Chart initialization complete');
        
        return {
            cleanup: chartManager
        };
    } catch (error) {
        console.error('Error displaying average event times:', error);
        throw error;
    }
}