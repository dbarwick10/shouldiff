import { ChartManager } from './chartManager.js';
import { LiveStatsService } from '../services/liveStatsService.js';

let isTracking = false;
let liveStatsService = null;
let hasShownInitialNotification = false;

function showSecurityModal({ title, content, primaryButton, secondaryButton }) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'security-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>${title}</h2>
                <div class="modal-body">${content}</div>
                <div class="modal-footer">
                    <button class="primary-button">${primaryButton}</button>
                    <button class="secondary-button">${secondaryButton}</button>
                </div>
            </div>
        `;

        const primaryBtn = modal.querySelector('.primary-button');
        const secondaryBtn = modal.querySelector('.secondary-button');
        const modalBody = modal.querySelector('.modal-body');

        primaryBtn.addEventListener('click', () => {
            // Update the modal content with the command to run
            modalBody.innerHTML = `
                <ol>
                    <li>To enable live tracking, copy, paste and run the following command into your Terminal or Powershell:</li>
                    <div class="code-block">npx https://github.com/dbarwick10/ShouldiffLiveServer/releases/download/v1/shouldiff_app-1.0.0.tgz</div>
                    <li>Start a game of League of Legends</li>
                    <li>Track your live game stats compared to your historical stats</li>
                </ol>
                <p>Once complete, click "Connect" to start or "Cancel" to exit</p>
            `;

            // Change the primary button text to "OK"
            primaryBtn.textContent = 'Connect';

            // Remove previous event listeners to avoid stacking
            primaryBtn.replaceWith(primaryBtn.cloneNode(true));
            secondaryBtn.replaceWith(secondaryBtn.cloneNode(true));

            // Add new event listeners for the updated modal
            const newPrimaryBtn = modal.querySelector('.primary-button');
            const newSecondaryBtn = modal.querySelector('.secondary-button');

            newPrimaryBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true); // Resolve with true to indicate confirmation
            });

            newSecondaryBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false); // Resolve with false to indicate cancellation
            });
        });

        secondaryBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false); // Resolve with false to indicate cancellation
        });

        document.body.appendChild(modal);
    });
}

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
        <span class="button-text">Live Tracking (WIP)</span>
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

    // Allow HTML content in the notification
    notification.innerHTML = message;

    // Style the notification
    notification.style.display = 'block';
    notification.style.borderColor = isError ? '#e74c3c' : '#7289da';
    notification.style.padding = '10px';
    notification.style.backgroundColor = '#2c2f33';
    notification.style.color = '#ffffff';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 10000);  // Hide notification after 20 seconds
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
            
            const confirmed = await showSecurityModal({
                title: 'Enable Live Game Tracking',
                content: `
                    <p>To track live game stats, this webpage needs to run a local server that:</p>
                    <ul>
                        <li>Connects to the League Client API</li>
                        <li>Runs while you are in a League of Legends game</li>
                        <li>Can be stopped at any time</li>
                    </ul>
                    <p>The server code is open source and available on 
                       <a href="https://github.com/dbarwick10/ShouldiffLiveServer" target="_blank">github</a></p>
                `,
                primaryButton: 'Continue',
                secondaryButton: 'Cancel'
            });

            if (!confirmed) {
                button.classList.remove('active');
                buttonText.textContent = 'Start Live Tracking';
                return;
            }

            // if (confirmed) {
            //     showNotification(`
            //         To enable live tracking, run the following command in your terminal/Powershell:
            //         <div class="code-block">npx https://github.com/dbarwick10/shouldiff/releases/download/v0.0.1/shouldiff_app-1.0.0.tgz</div>
            //     `);
            // }
            
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
                    throw new Error('Failed to fetch');
                }
                
            } catch (error) {
                console.error('Failed to start live tracking:', error);
                
                console.log('Error caught:', error.message);
                if (error.message === 'Failed to fetch' || 
                    error.message.includes('NetworkError') ||
                    error.message.includes('ECONNREFUSED')) {
                    button.classList.remove('active');
                    buttonText.textContent = 'Learn More';
                    showNotification('Server unavailable. Click Learn More for details.', true);
                    
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