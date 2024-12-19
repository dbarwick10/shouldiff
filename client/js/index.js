// import { displayStats } from './components/displayStats.js';
import { displayAverageEventTimes } from './components/displayAverageEventTimes.js';
import { LOCAL_TESTING } from "./components/config/constraints.js"; 

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('fetchStatsButton');
    const loading = document.getElementById('loading');
    const inputSection = document.querySelector('.input-section');
    const chartContainer = document.querySelector('.chart-container');
    const chartLegend = document.querySelector('.chart-legend');
    const loadingStates = [
        'Fetching player information...',
        'Gathering match statistics...',
        'Collecting match event data...',
        'Analyzing player performance...',
        'Calculating event timings...',
        'Checking live game data...',
        'Well, this is embarassing - how long should this take...',
        'Seriously? Is this still going?',
        `Well, if you're still here, might as well stay a bit longer...`
    ];
    
    let currentLoadingState = 0;
    let loadingInterval;
    let currentCleanup = null;
    let lastSuccessfulSearch = null;
    
    if (analyzeButton) {
        analyzeButton.addEventListener('click', async function() {
            try {
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

                // Check if this is the same as the last successful search
                if (lastSuccessfulSearch && 
                    formData.summonerName.toLowerCase() === lastSuccessfulSearch.summonerName.toLowerCase() &&
                    formData.tagLine.toLowerCase() === lastSuccessfulSearch.tagLine.toLowerCase() &&
                    formData.region === lastSuccessfulSearch.region &&
                    formData.gameMode === lastSuccessfulSearch.gameMode) {
                    alert('Update your summoner name, tagline or game mode and try again');
                    return;
                }

                // Clean up existing charts
                if (currentCleanup) {
                    currentCleanup();
                    currentCleanup = null;
                }

                // Hide existing content
                if (chartContainer) chartContainer.style.display = 'none';
                if (chartLegend) chartLegend.style.display = 'none';

                 // Initial loading state
                 this.disabled = true;
                 inputSection.style.display = 'none';
                 loading.style.display = 'flex';
 
                 // Start cycling through loading states
                 currentLoadingState = 0;
                 loading.innerHTML = `
                     <strong>${loadingStates[currentLoadingState]}</strong>
                     <div id="loading-circle"></div>
                 `;
 
                 // Update loading message 
                 loadingInterval = setInterval(() => {
                     currentLoadingState = (currentLoadingState + 1) % loadingStates.length;
                     loading.innerHTML = `
                         <strong>${loadingStates[currentLoadingState]}</strong>
                         <div id="loading-circle"></div>
                     `;
                 }, 23000); //every x seconds

                const localURL = 'http://127.0.0.1:3000/api/stats';
                const prodURL = 'https://https://shouldiffserver-new.onrender.com/api/stats'

                const response = await fetch(LOCAL_TESTING ? localURL : prodURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

                const data = await response.json();

                if (!data.playerStats || !data.teamStats || !data.enemyTeamStats) {
                    console.error('Invalid data structure:', data);
                    throw new Error('Invalid data received from server');
                }

                if (data.averageEventTimes) {
                    const result = await displayAverageEventTimes(data.averageEventTimes, data.liveStats);
                    currentCleanup = result.cleanup;
                }

                // Store successful search parameters
                lastSuccessfulSearch = { ...formData };

                loading.style.display = 'none';
                this.disabled = false;
                inputSection.style.display = 'block';

                // Clear input fields
                // document.getElementById('summonerName').value = '';
                // document.getElementById('tagLine').value = '';
                
                this.textContent = 'Fetch New Stats';

            } catch (error) {
                console.error('Error:', error);
                loading.innerHTML = `<p>Error fetching data: ${error.message}</p>`;
                inputSection.style.display = 'block';
                this.disabled = false;

                // Show chart container and legend again if there was an error
                if (chartContainer) chartContainer.style.display = 'grid';
                if (chartLegend) chartLegend.style.display = 'flex';
            }
        });
    }

    window.addEventListener('unload', () => {
        if (currentCleanup) {
            currentCleanup();
        }
    });
});