import { ChartManager } from './chartManager.js';

export class PersistentChartManager extends ChartManager {
    constructor(config = {}) {
        super(config);
        
        // Initialize persistent storage with full data preservation
        this.persistentData = {
            averageEventTimes: config.averageEventTimes || {},
            liveStats: null,
            previousGameStats: null,
            lastUpdateTimestamp: Date.now(),
            lastSummonerSearch: null // Track last successful search
        };
    }

    /**
     * Saves the complete current state to localStorage
     */
    saveState() {
        const fullState = {
            // UI State
            category: this.currentCategory,
            displayMode: this.displayMode,
            gamePhase: this.gamePhase,
            
            // Complete Data State
            averageEventTimes: this.averageEventTimes,
            currentLiveStats: this.currentLiveStats,
            previousGameStats: this.previousGameStats,
            
            // Search Context
            lastSummonerSearch: this.persistentData.lastSummonerSearch,
            lastUpdateTimestamp: Date.now()
        };

        try {
            localStorage.setItem('chartFullState', JSON.stringify(fullState));
        } catch (error) {
            console.error('Failed to save chart state:', error);
        }
    }

    /**
     * Attempts to restore the complete previous state
     */
    restoreState() {
        try {
            const savedState = localStorage.getItem('chartFullState');
            if (!savedState) return false;

            const parsedState = JSON.parse(savedState);
            
            // Restore UI state
            this.currentCategory = parsedState.category;
            this.displayMode = parsedState.displayMode;
            this.gamePhase = parsedState.gamePhase;
            
            // Restore complete data state
            this.averageEventTimes = parsedState.averageEventTimes;
            this.currentLiveStats = parsedState.currentLiveStats;
            this.previousGameStats = parsedState.previousGameStats;
            
            // Restore search context
            this.persistentData = {
                averageEventTimes: parsedState.averageEventTimes,
                liveStats: parsedState.currentLiveStats,
                previousGameStats: parsedState.previousGameStats,
                lastUpdateTimestamp: parsedState.lastUpdateTimestamp,
                lastSummonerSearch: parsedState.lastSummonerSearch
            };

            // Only refresh UI if we have data to show
            if (Object.keys(this.averageEventTimes || {}).length > 0) {
                this.updateChartVisibility();
                this.renderAllCharts();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error restoring chart state:', error);
            return false;
        }
    }

    /**
     * Updates the last successful search details
     */
    updateLastSearch(searchParams) {
        this.persistentData.lastSummonerSearch = searchParams;
        this.saveState();
    }

    /**
     * Enhanced cleanup that saves state before cleanup
     */
    cleanup() {
        this.saveState();
        super.cleanup();
    }

    /**
     * Gets the last successful search parameters
     */
    getLastSearch() {
        return this.persistentData.lastSummonerSearch;
    }
}