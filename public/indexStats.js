import { fetchMatchStats } from "../services/riotAPIServices.js";


document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('fetchStatsButton');
    if (analyzeButton) {
        console.log('DOM elements before update:', { statsButton: !!document.getElementById('fetchStatsButton') })
        analyzeButton.addEventListener('click', async function() {
            this.disabled = true;  // Prevent double-clicking
            try {

                await fetchMatchStats();

            } finally {
                this.disabled = false;  // Re-enable the button
                console.log('DOM elements after update:', { statsButton: !!document.getElementById('fetchStatsButton') })
            }
        });
    }
});