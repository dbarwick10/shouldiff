import { displayAverageEventTimes } from './components/displayAverageEventTimes.js';
import { LOCAL_TESTING, prodURL, localURL } from "./config/constants.js"; 
import { initializeMobileMenu } from './shared.js';


function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        summonerName: params.get('summoner') || '',
        tagLine: params.get('tag') || '',
        gameMode: params.get('mode') || 'aram'
    };
}

function cleanTagline(tagline) {
    if (!tagline) return '';
    return tagline.replace(/^[#%23]/, '');
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function updateUrl(params) {
    try {
        const url = new URL(window.location.href);
        url.search = '';
        
        if (params.summonerName) url.searchParams.append('summoner', params.summonerName);
        if (params.tagLine) url.searchParams.append('tag', cleanTagline(params.tagLine));
        if (params.region) url.searchParams.append('region', params.region);
        url.searchParams.append('mode', params.gameMode || 'aram');
        
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

        if (elements.summonerName) elements.summonerName.value = params.summonerName || '';
        if (elements.tagLine) elements.tagLine.value = cleanTagline(params.tagLine || '');
        if (elements.region) elements.region.value = params.region || 'americas';
        if (elements.gameMode) elements.gameMode.value = params.gameMode || 'aram';
    } catch (error) {
        console.error('Error updating form inputs:', error);
    }
}

function initializeDOMElements() {
    const elements = {
        analyzeButton: document.getElementById('fetchStatsButton'),
        loading: document.getElementById('loading'),
        inputSection: document.querySelector('.input-section'),
        gettingStarted: document.querySelector('.getting-started.index'),
        chartContainer: document.querySelector('.chart-container'),
        chartLegend: document.querySelector('.chart-legend'),
        howToUseThis: document.querySelector('.how-to-use-this')
    };

    if (!elements.analyzeButton || !elements.loading || !elements.inputSection) {
        throw new Error('Required DOM elements not found');
    }

    if (elements.inputSection) {
        elements.inputSection.classList.remove('compact');
    }

    return elements;
}

function initializeApplication() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupApplication());
    } else {
        setupApplication();
    }
}

async function setupApplication() {
    try {
        console.log('Setting up application...');
        
        initializeMobileMenu();
        const elements = initializeDOMElements();
        
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

        setupEventHandlers(elements, state, loadingStates);
        
        // Check for stored chart data
        const storedData = localStorage.getItem('chartData');
        if (storedData) {
            console.log('Found stored chart data, restoring...');
            
            // Hide getting started and show chart containers
            if (elements.gettingStarted) {
                elements.gettingStarted.style.display = 'none';
            }
            if (elements.chartContainer) {
                elements.chartContainer.style.display = 'grid';
            }
            if (elements.chartLegend) {
                elements.chartLegend.style.display = 'flex';
            }
            if (elements.howToUseThis) {
                elements.howToUseThis.style.display = 'none';
            }
            
            // Initialize charts with stored data
            const result = await displayAverageEventTimes(true);
            state.currentCleanup = result.cleanup;
            
            // Get the stored parameters to update the form
            try {
                const { data } = JSON.parse(storedData);
                if (data.lastSearch) {
                    state.lastSuccessfulSearch = data.lastSearch;
                    elements.analyzeButton.textContent = 'Fetch New Stats';
                    elements.inputSection.classList.add('compact');
                }
            } catch (e) {
                console.error('Error parsing stored search data:', e);
            }
        } else {
            // Only show getting started if no stored data
            if (elements.gettingStarted) {
                elements.gettingStarted.style.display = 'block';
            }
            if (elements.howToUseThis) {
                elements.howToUseThis.style.display = 'block';
            }
        }
        
        const initialParams = getUrlParams();
        updateFormInputs(initialParams);
        
        // Only fetch new stats if we don't have stored data and have URL parameters
        if (!storedData && initialParams.summonerName && initialParams.tagLine) {
            await handleStats(initialParams, elements, state, loadingStates);
        }

        console.log('Application setup complete');
    } catch (error) {
        console.error('Failed to setup application:', error);
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
    elements.analyzeButton.addEventListener('click', async () => {
        const formData = {
            summonerName: document.getElementById('summonerName').value.trim(),
            tagLine: document.getElementById('tagLine').value.trim(),
            gameMode: document.getElementById('gameMode').value
        };

        if (!formData.summonerName || !formData.tagLine) {
            alert('Please enter both summoner name and tagline');
            return;
        }

        await handleStats(formData, elements, state, loadingStates);
    });

    ['summonerName', 'tagLine', 'region', 'gameMode'].forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('change', () => {
                const currentParams = {
                    summonerName: document.getElementById('summonerName')?.value || '',
                    tagLine: document.getElementById('tagLine')?.value || '',
                    gameMode: document.getElementById('gameMode')?.value || 'aram'
                };
                updateUrl(currentParams);
            });
        }
    });

    window.addEventListener('popstate', () => {
        const params = getUrlParams();
        updateFormInputs(params);
        if (params.summonerName && params.tagLine) {
            handleStats(params, elements, state, loadingStates);
        }
    });

    // window.addEventListener('unload', () => {
    //     if (state.currentCleanup) {
    //         state.currentCleanup();
    //     }
    // });
}

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

async function handleStats(formData, elements, state, loadingStates) {
    try {
        // Check if this is a duplicate search
        if (state.lastSuccessfulSearch && 
            formData.summonerName.toLowerCase() === state.lastSuccessfulSearch.summonerName.toLowerCase() &&
            formData.tagLine.toLowerCase() === state.lastSuccessfulSearch.tagLine.toLowerCase() &&
            formData.gameMode === state.lastSuccessfulSearch.gameMode) {
            alert('Update your summoner name, tagline or game mode and try again');
            return;
        }

        // Reset UI elements before making new request
        elements.analyzeButton.disabled = true;
        elements.gettingStarted.style.display = 'none';
        elements.inputSection.style.display = 'none';
        
        // Reset toggle buttons to default state
        resetToggleButtons();
        
        // Show loading state
        showLoading();
        if (elements.howToUseThis) {
            elements.howToUseThis.style.display = 'none';
        }

        state.currentLoadingState = 0;
        updateLoadingState(elements, state, loadingStates);

        state.loadingInterval = setInterval(() => {
            state.currentLoadingState = (state.currentLoadingState + 1) % loadingStates.length;
            updateLoadingState(elements, state, loadingStates);
        }, 23000);

        // Update URL with current parameters
        updateUrl(formData);

        // Make API request
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
            elements.inputSection.style.display = 'flex';
            elements.analyzeButton.disabled = false;
            return;
        }

        if (!data.playerStats || !data.teamStats || !data.enemyTeamStats) {
            throw new Error('Invalid data received from server');
        }

        // Clear previous chart data before creating new ones
        if (state.currentCleanup) {
            state.currentCleanup.clearAll();
            state.currentCleanup = null;
        }

        // Hide chart containers while generating new charts
        if (elements.chartContainer) {
            elements.chartContainer.style.display = 'none';
        }
        if (elements.chartLegend) {
            elements.chartLegend.style.display = 'none';
        }

        // Generate new charts
        if (data.averageEventTimes) {
            const result = await displayAverageEventTimes(data.averageEventTimes, data.liveStats);
            state.currentCleanup = result.cleanup;
            
            // Save the last successful search with the chart data
            if (result.cleanup && result.cleanup.saveDataToStorage) {
                result.cleanup.saveDataToStorage({
                    averageEventTimes: data.averageEventTimes,
                    currentLiveStats: data.liveStats,
                    previousGameStats: null,
                    lastSearch: formData
                });
            }
        }

        // Clean up loading state
        clearInterval(state.loadingInterval);
        state.lastSuccessfulSearch = { ...formData };
        hideLoading();

        // Update UI
        elements.analyzeButton.disabled = false;
        elements.inputSection.style.display = 'block';
        elements.inputSection.classList.add('compact');
        elements.analyzeButton.textContent = 'Fetch New Stats';

        // Show chart containers after new charts are ready
        if (elements.chartContainer) {
            elements.chartContainer.style.display = 'grid';
        }
        if (elements.chartLegend) {
            elements.chartLegend.style.display = 'flex';
        }

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

        // Clean up and show error
        displayError(elements, state, displayMessage, details);
        elements.inputSection.style.display = 'block';
        elements.inputSection.classList.remove('compact');
        elements.analyzeButton.disabled = false;

        // Keep showing charts if they exist
        const activeSession = localStorage.getItem('activeChartSession');
        if (activeSession) {
            if (elements.chartContainer) {
                elements.chartContainer.style.display = 'grid';
            }
            if (elements.chartLegend) {
                elements.chartLegend.style.display = 'flex';
            }
        }
    }
}

// Helper function to reset toggle buttons to their default state
function resetToggleButtons() {
    // Reset stat type to 'teamStats'
    const defaultStatType = document.querySelector('input[name="statType"][value="teamStats"]');
    if (defaultStatType) {
        defaultStatType.checked = true;
    }

    // Reset display mode to 'both'
    const defaultDisplayMode = document.querySelector('input[name="displayMode"][value="both"]');
    if (defaultDisplayMode) {
        defaultDisplayMode.checked = true;
    }

    // Reset game phase to 'fullGame'
    const defaultGamePhase = document.querySelector('input[name="gamePhase"][value="fullGame"]');
    if (defaultGamePhase) {
        defaultGamePhase.checked = true;
    }
}

initializeApplication();
