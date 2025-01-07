// src/index.js
import { ChartManager } from './chartManager.js';
import { LiveStatsService } from '../services/liveStatsService.js';

export async function displayAverageEventTimes(averageEventTimes, calculateStats) {
    console.log('Initializing displayAverageEventTimes');
    
    const chartManager = new ChartManager({ averageEventTimes });
    let liveStatsService = null;

    try {
        // Initialize the UI components
        chartManager.initializeToggleButtons();
        chartManager.updateChartVisibility();
        chartManager.renderAllCharts();

        // Set up live stats if enabled
        if (calculateStats) {
            console.log('Starting live data refresh...');
            liveStatsService = new LiveStatsService({
                onUpdate: (stats) => {
                    chartManager.updateLiveStats(stats);
                }
            });
            await liveStatsService.startPolling();
        } else {
            console.log('No live stats calculation requested, running in historical-only mode');
        }
        
        console.log('Chart initialization complete');
        
        // Return cleanup function
        return {
            cleanup: () => {
                if (liveStatsService) {
                    liveStatsService.cleanup();
                }
                chartManager.cleanup();
            }
        };
    } catch (error) {
        console.error('Error displaying average event times:', error);
        throw error;
    }
}