import { ChartManager } from './chartManager.js';
import { LiveStatsService } from '../services/liveStatsService.js';

let isTracking = false;
let liveStatsService = null;
let hasShownInitialNotification = false;

function injectLiveButton() {
    // Check if live button already exists
    const existingLiveButton = document.getElementById('toggleLiveButton');
    if (existingLiveButton) {
        return existingLiveButton;
    }

    const fetchButton = document.getElementById('fetchStatsButton');
    if (!fetchButton) return;

    // Check if button group already exists
    let buttonGroup = fetchButton.parentNode;
    if (!buttonGroup.classList.contains('button-group')) {
        buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        fetchButton.parentNode.insertBefore(buttonGroup, fetchButton);
        buttonGroup.appendChild(fetchButton);
    }

    const liveButton = document.createElement('button');
    liveButton.id = 'toggleLiveButton';
    liveButton.className = 'live-button';
    liveButton.innerHTML = `
        <span class="status-indicator"></span>
        <span class="button-text">Start Live Tracking</span>
    `;
    buttonGroup.appendChild(liveButton);
    return liveButton;
}

function showNotification(message, isError = false) {
    let notification = document.querySelector('.notification-modal');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification-modal';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.borderColor = isError ? '#e74c3c' : '#7289da';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function stopTracking() {
    if (liveStatsService) {
        liveStatsService.cleanup();
        liveStatsService = null;
    }
    isTracking = false;
    hasShownInitialNotification = false;
}

async function setupLiveTracking(chartManager) {
    const button = injectLiveButton();
    if (!button) return;

    async function toggleLiveTracking() {
        const buttonText = button.querySelector('.button-text');

        if (!isTracking) {
            button.classList.add('active');
            buttonText.textContent = 'Connecting...';
            
            try {
                if (!liveStatsService) {
                    liveStatsService = new LiveStatsService({
                        onUpdate: (stats) => {
                            if (stats) {
                                if (!hasShownInitialNotification) {
                                    showNotification('Live tracking started! Your game stats will update automatically.');
                                    hasShownInitialNotification = true;
                                }
                                chartManager.updateLiveStats(stats);
                                buttonText.textContent = 'Live Tracking Active';
                            }
                        }
                    });
                }
                
                try {
                    await liveStatsService.startPolling();
                    isTracking = true;
                } catch (err) {
                    // Throw the error up to be caught by the outer catch block
                    throw new Error('Failed to fetch');
                }
                
            } catch (error) {
                console.error('Failed to start live tracking:', error);
                
                console.log('Error caught:', error.message); // Debug log
                if (error.message === 'Failed to fetch' || 
                    error.message.includes('NetworkError') ||
                    error.message.includes('ECONNREFUSED')) {
                    button.classList.remove('active');
                    buttonText.textContent = 'Learn More';
                    showNotification('Server unavailable. Click Learn More for details.', true);
                    
                    // Replace button with new one to reset event listeners
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                    newButton.addEventListener('click', () => {
                        window.location.href = 'about.html';
                    });
                    return;
                }
                
                showNotification('No active game found. Start a game and try again.', true);
                button.classList.remove('active');
                buttonText.textContent = 'Start Live Tracking';
                return;
            }
        } else {
            stopTracking();
            button.classList.remove('active');
            buttonText.textContent = 'Start Live Tracking';
            showNotification('Live tracking stopped');
        }
    }

    button.addEventListener('click', toggleLiveTracking);
    return { cleanup: stopTracking };
}

export async function displayAverageEventTimes(averageEventTimes, calculateStats) {
    console.log('Initializing displayAverageEventTimes');
    
    const chartManager = new ChartManager({ 
        averageEventTimes: averageEventTimes === true ? null : averageEventTimes,
        currentLiveStats: null
    });

    const liveTracking = await setupLiveTracking(chartManager);

    try {
        chartManager.initializeToggleButtons();
        
        if (averageEventTimes === true) {
            if (chartManager.loadDataFromStorage()) {
                chartManager.renderAllCharts();
            }
        } else {
            chartManager.resetToDefaults();
        }
        
        console.log('Chart initialization complete');
        
        return {
            cleanup: {
                clearAll: () => {
                    chartManager.clearAll();
                    if (liveTracking) liveTracking.cleanup();
                },
                saveDataToStorage: chartManager.saveDataToStorage.bind(chartManager)
            }
        };
    } catch (error) {
        console.error('Error displaying average event times:', error);
        throw error;
    }
}
