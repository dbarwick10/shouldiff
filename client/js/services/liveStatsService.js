import { FETCH_INTERVAL_MS, RETRY_INTERVAL_MS } from '../config/constants.js';
import { hasValidStats } from '../utils/dataHelpers.js';

export class LiveStatsService {
    constructor(config = {}) {
        this.refreshInterval = null;
        this.retryTimeout = null;
        this.isPolling = false;
        this.currentLiveStats = null;
        this.lastValidGameData = null;
        this.gameActive = false;
        this.currentCategory = 'teamStats';
        this.onUpdate = config.onUpdate || (() => {});
    }

    async startPolling() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }

        await this.updateLiveData();
        
        if (!this.isPolling) {
            this.restartPolling(RETRY_INTERVAL_MS);
        }
    }

    restartPolling(interval) {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        if (this.retryTimeout) clearTimeout(this.retryTimeout);
        this.refreshInterval = setInterval(() => this.updateLiveData(), interval);
    }

    async updateLiveData() {
        try {
            const response = await fetch('http://127.0.0.1:3000/api/live-stats');
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('No active game found - preserving last game data');
                    if (this.gameActive) {
                        this.gameActive = false;
                        if (this.currentLiveStats) {
                            console.log('Game ended - saving current game data');
                            this.lastValidGameData = JSON.parse(JSON.stringify(this.currentLiveStats));
                        }
                    }
                    if (this.lastValidGameData) {
                        this.currentLiveStats = JSON.parse(JSON.stringify(this.lastValidGameData));
                    }
                    this.onUpdate(this.currentLiveStats);
                    return;
                }
                
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const newLiveStats = await response.json();
            
            if (!newLiveStats || newLiveStats === null) {
                if (this.gameActive && this.currentLiveStats) {
                    console.log('Game ended (null data) - saving game data');
                    this.lastValidGameData = JSON.parse(JSON.stringify(this.currentLiveStats));
                    this.gameActive = false;
                }
                if (this.lastValidGameData) {
                    this.currentLiveStats = JSON.parse(JSON.stringify(this.lastValidGameData));
                }
                this.onUpdate(this.currentLiveStats);
                return;
            }

            if (!this.isPolling) {
                this.isPolling = true;
                this.restartPolling(FETCH_INTERVAL_MS);
            }

            const isEmpty = ['kills', 'deaths', 'assists'].every(stat => 
                (newLiveStats[this.currentCategory]?.[stat]?.length || 0) === 0
            );

            if (isEmpty && this.lastValidGameData) {
                console.log('Received empty data - maintaining last valid state');
                this.currentLiveStats = JSON.parse(JSON.stringify(this.lastValidGameData));
                this.onUpdate(this.currentLiveStats);
                return;
            }

            if (!this.gameActive && hasValidStats(newLiveStats, this.currentCategory)) {
                console.log('New game starting - moving previous game data');
                if (this.lastValidGameData) {
                    console.log('Moving last game to previousGameStats');
                    this.previousGameStats = JSON.parse(JSON.stringify(this.lastValidGameData));
                    this.lastValidGameData = null;
                }
                this.gameActive = true;
                this.currentLiveStats = JSON.parse(JSON.stringify(newLiveStats));
            } else if (this.gameActive && hasValidStats(newLiveStats, this.currentCategory)) {
                this.currentLiveStats = JSON.parse(JSON.stringify(newLiveStats));
                this.lastValidGameData = JSON.parse(JSON.stringify(newLiveStats));
            }

            this.onUpdate(this.currentLiveStats);

        } catch (error) {
            console.log('Error type:', error.message);
            if (error.message.includes('ECONNREFUSED')) {
                console.log('Game ended (ECONNREFUSED)');
                if (this.gameActive && this.currentLiveStats) {
                    this.gameActive = false;
                    this.lastValidGameData = JSON.parse(JSON.stringify(this.currentLiveStats));
                }
                if (this.lastValidGameData) {
                    this.currentLiveStats = JSON.parse(JSON.stringify(this.lastValidGameData));
                }
            }

            this.onUpdate(this.currentLiveStats);
            
            if (this.isPolling) {
                this.isPolling = false;
                this.restartPolling(RETRY_INTERVAL_MS);
            }
        }
    }

    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }
    }

    setCategory(category) {
        this.currentCategory = category;
    }
}