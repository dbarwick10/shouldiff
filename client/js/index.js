// Import required functionality
import { displayAverageEventTimes } from './components/displayAverageEventTimes.js';
import { LOCAL_TESTING } from "./config/constants.js"; 

// Helper function to parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        summonerName: params.get('summoner') || '',
        tagLine: params.get('tag') || '',
        region: params.get('region') || 'americas',
        gameMode: params.get('mode') || 'all'  // Add default value
    };
}

function cleanTagline(tagline) {
    if (!tagline) return '';  // Handle null/undefined
    return tagline.replace(/^[#%23]/, '');
}

function showLoading() {
    document.getElementById('loading').classList.add('visible');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('visible');
}

function updateUrl(params) {
    try {
        const url = new URL(window.location.href);
        url.search = '';
        
        if (params.summonerName) url.searchParams.append('summoner', params.summonerName);
        if (params.tagLine) url.searchParams.append('tag', cleanTagline(params.tagLine));
        if (params.region) url.searchParams.append('region', params.region);
        url.searchParams.append('mode', params.gameMode || 'all');
        
        window.history.pushState({}, '', url);
    } catch (error) {
        console.error('Error updating URL:', error);
    }
}

function updateFormInputs(params) {
    try {
        const elements = {
            summonerName: document.getElementById('summonerName'),
            tagLine: document.getElementById('tagLine'),
            region: document.getElementById('region'),
            gameMode: document.getElementById('gameMode')
        };

        // Only update if elements exist
        if (elements.summonerName) elements.summonerName.value = params.summonerName || '';
        if (elements.tagLine) elements.tagLine.value = cleanTagline(params.tagLine || '');
        if (elements.region) elements.region.value = params.region || 'americas';
        if (elements.gameMode) elements.gameMode.value = params.gameMode || 'all';
    } catch (error) {
        console.error('Error updating form inputs:', error);
    }
}

// Initialize DOM elements after they're available
function initializeDOMElements() {
    const elements = {
        analyzeButton: document.getElementById('fetchStatsButton'),
        loading: document.getElementById('loading'),
        inputSection: document.querySelector('.input-section'),
        chartContainer: document.querySelector('.chart-container'),
        chartLegend: document.querySelector('.chart-legend'),
        howToUseThis: document.querySelector('.how-to-use-this')
    };

    // Check for required elements
    if (!elements.analyzeButton || !elements.loading || !elements.inputSection) {
        throw new Error('Required DOM elements not found');
    }

    if (elements.inputSection) {
        elements.inputSection.classList.remove('compact');
    }

    return elements;
}

// Main application initialization
function initializeApplication() {
    // Ensure DOM is loaded before proceeding
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupApplication());
    } else {
        setupApplication();
    }
}

// Main setup function
async function setupApplication() {
    try {
        console.log('Setting up application...');
        
        // Initialize DOM elements
        const elements = initializeDOMElements();
        
        // Initialize state
        const state = {
            currentLoadingState: 0,
            loadingInterval: null,
            currentCleanup: null,
            lastSuccessfulSearch: null
        };

        const loadingStates = [
            'Fetching player information...',
            'Gathering match event data...',
            'Collecting match timeline...',
            'Analyzing player performance...',
            'Calculating event timings...',
            'Checking live game data...',
            'Well, this is embarassing - how long should this take...',
            'Seriously? Is this still going?',
            `Well, if you're still here, might as well stay a bit longer...`
        ];

        // Setup handlers
        setupEventHandlers(elements, state, loadingStates);
        
        // Handle initial URL parameters
        const initialParams = getUrlParams();
        updateFormInputs(initialParams);
        
        if (initialParams.summonerName && initialParams.tagLine) {
            await handleStats(initialParams, elements, state, loadingStates);
        }

        console.log('Application setup complete');
    } catch (error) {
        console.error('Failed to setup application:', error);
        // Display user-friendly error if possible
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div class="error-message">
                    <strong>Error</strong>
                    <p>Failed to initialize application. Please refresh the page.</p>
                </div>
            `;
        }
    }
}

function setupEventHandlers(elements, state, loadingStates) {
    // Button click handler
    elements.analyzeButton.addEventListener('click', async () => {
        const formData = {
            summonerName: document.getElementById('summonerName').value.trim(),
            tagLine: document.getElementById('tagLine').value.trim(),
            region: document.getElementById('region').value,
            gameMode: document.getElementById('gameMode').value
        };

        if (!formData.summonerName || !formData.tagLine) {
            alert('Please enter both summoner name and tagline');
            return;
        }

        await handleStats(formData, elements, state, loadingStates);
    });

    // Form change handlers
    ['summonerName', 'tagLine', 'region', 'gameMode'].forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('change', () => {
                const currentParams = {
                    summonerName: document.getElementById('summonerName')?.value || '',
                    tagLine: document.getElementById('tagLine')?.value || '',
                    region: document.getElementById('region')?.value || 'americas',
                    gameMode: document.getElementById('gameMode')?.value || 'all'
                };
                updateUrl(currentParams);
            });
        }
    });

    // Browser navigation handler
    window.addEventListener('popstate', () => {
        const params = getUrlParams();
        updateFormInputs(params);
        if (params.summonerName && params.tagLine) {
            handleStats(params, elements, state, loadingStates);
        }
    });

    // Cleanup handler
    window.addEventListener('unload', () => {
        if (state.currentCleanup) {
            state.currentCleanup();
        }
    });
}

// Helper functions for loading and error states
function displayError(elements, state, message, details = '') {
    clearInterval(state.loadingInterval);
    elements.loading.innerHTML = `
        <div class="error-message">
            <strong>Error</strong>
            <p>${message}</p>
            ${details ? `<p class="error-details">${details}</p>` : ''}
        </div>
    `;
}

function updateLoadingState(elements, state, loadingStates) {
    elements.loading.innerHTML = `
        <strong>${loadingStates[state.currentLoadingState]}</strong>
        <div id="loading-circle"></div>
    `;
}

// Main stats handling function
async function handleStats(formData, elements, state, loadingStates) {
    try {
        // Prevent duplicate searches
        if (state.lastSuccessfulSearch && 
            formData.summonerName.toLowerCase() === state.lastSuccessfulSearch.summonerName.toLowerCase() &&
            formData.tagLine.toLowerCase() === state.lastSuccessfulSearch.tagLine.toLowerCase() &&
            formData.region === state.lastSuccessfulSearch.region &&
            formData.gameMode === state.lastSuccessfulSearch.gameMode) {
            alert('Update your summoner name, tagline or game mode and try again');
            return;
        }

        // Cleanup and UI preparation
        if (state.currentCleanup) {
            state.currentCleanup();
            state.currentCleanup = null;
        }

        if (elements.chartContainer) elements.chartContainer.style.display = 'none';
        if (elements.chartLegend) elements.chartLegend.style.display = 'none';

        // Initialize loading state
        elements.analyzeButton.disabled = true;
        elements.inputSection.style.display = 'none';
        showLoading();
        if (elements.howToUseThis) elements.howToUseThis.style.display = 'none';
        state.currentLoadingState = 0;
        updateLoadingState(elements, state, loadingStates);

        // Start loading message cycle
        state.loadingInterval = setInterval(() => {
            state.currentLoadingState = (state.currentLoadingState + 1) % loadingStates.length;
            updateLoadingState(elements, state, loadingStates);
        }, 23000);

        updateUrl(formData);

        // API request
        const prodURL = 'https://shouldiffserver.onrender.com/api/stats';
        const localURL = 'http://127.0.0.1:3000/api/stats';
        
        const response = await fetch(LOCAL_TESTING ? localURL : prodURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Failed to parse server response');
        }

        if (!response.ok) {
            displayError(elements, state, data.error || 'An unexpected error occurred', data.details || '');
            elements.inputSection.style.display = 'block';
            elements.analyzeButton.disabled = false;
            return;
        }

        if (!data.playerStats || !data.teamStats || !data.enemyTeamStats) {
            throw new Error('Invalid data received from server');
        }

        if (data.averageEventTimes) {
            const result = await displayAverageEventTimes(data.averageEventTimes, data.liveStats);
            state.currentCleanup = result.cleanup;
        }

        // Cleanup and UI updates
        clearInterval(state.loadingInterval);
        state.lastSuccessfulSearch = { ...formData };
        hideLoading();
        elements.analyzeButton.disabled = false;
        elements.inputSection.style.display = 'block';
        elements.inputSection.classList.add('compact');
        elements.analyzeButton.textContent = 'Fetch New Stats';

    } catch (error) {
        let displayMessage = 'An unexpected error occurred. Please try again.';
        let details = '';

        if (error.message === 'Failed to fetch') {
            displayMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (error.message.includes('Failed to fetch PUUID')) {
            try {
                const riotError = JSON.parse(error.message.split('Failed to fetch PUUID:')[1]);
                displayMessage = riotError.status.message;
            } catch (e) {
                details = error.message;
            }
        }

        displayError(elements, state, displayMessage, details);
        elements.inputSection.style.display = 'block';
        elements.inputSection.classList.remove('compact');
        elements.analyzeButton.disabled = false;

        if (elements.chartContainer) elements.chartContainer.style.display = 'grid';
        if (elements.chartLegend) elements.chartLegend.style.display = 'flex';
    }
}

// Start the application
initializeApplication();