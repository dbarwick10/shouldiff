import { ChartManager } from './chartManager.js';
import { LiveStatsService } from '../services/liveStatsService.js';

export async function displayAverageEventTimes(averageEventTimes, calculateStats) {
    console.log('Initializing displayAverageEventTimes');
    
    const chartManager = new ChartManager({ averageEventTimes });
    let liveStatsService = null;

    try {
        // Initialize chart manager and reset to defaults
        chartManager.initializeToggleButtons();
        chartManager.resetToDefaults(); // This will handle both UI and internal state reset
        
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