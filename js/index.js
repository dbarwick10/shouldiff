// import { displayStats } from './components/displayStats.js';
import { displayAverageEventTimes } from './components/displayAverageEventTimes.js';

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('fetchStatsButton');
    const loading = document.getElementById('loading');
    const inputSection = document.querySelector('.input-section');
    
    if (analyzeButton) {
        analyzeButton.addEventListener('click', async function() {
            try {
                // Collect form data
                const formData = {
                    summonerName: document.getElementById('summonerName').value,
                    tagLine: document.getElementById('tagLine').value,
                    region: document.getElementById('region').value,
                    gameMode: document.getElementById('gameMode').value
                };

                // Validate inputs
                if (!formData.summonerName || !formData.tagLine) {
                    alert('Please enter both summoner name and tagline');
                    return;
                }

                // Show loading state
                this.disabled = true;
                inputSection.style.display = 'none';
                loading.innerHTML = `
                    <strong>Fetching Game Data</strong>
                    <div id="loading-circle"></div>
                `;
                loading.style.display = 'flex';

                // Fetch data from server
                const response = await fetch('http://localhost:3000/api/stats', {
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
                console.log('Received data:', data); // Add this debug log

                // Verify data structure before passing to display functions
                if (!data.playerStats || !data.teamStats || !data.enemyTeamStats) {
                    console.error('Invalid data structure:', data);
                    throw new Error('Invalid data received from server');
                }

                // Display the stats
                // await displayStats(data.playerStats, data.teamStats, data.enemyTeamStats);
                
                if (data.averageEventTimes) {
                    await displayAverageEventTimes(data.averageEventTimes, data.liveStats);
                }

                loading.style.display = 'none';
                this.disabled = false;
                inputSection.style.display = 'block';
                // inputSection.innerHTML = "Refresh the page if you want to change the game mode."

                // // Update UI after successful display
                // document.getElementById('summonerName').style.display = 'none';
                // document.getElementById('tagLine').style.display = 'none';
                // document.getElementById('region').style.display = 'none';
                // document.getElementById('gameMode').style.display = 'none';

                // // Add refresh button
                // const refreshButton = document.createElement('button');
                // refreshButton.textContent = 'Refresh Page To Get New Stats';
                // refreshButton.addEventListener('click', () => window.location.reload());
                // this.replaceWith(refreshButton);

            } catch (error) {
                console.error('Error:', error);
                loading.innerHTML = `<p>Error fetching data: ${error.message}</p>`;
                inputSection.style.display = 'block';
                this.disabled = false;
            }
        });
    }
});