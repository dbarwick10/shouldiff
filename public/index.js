import { fetchMatchStats } from "../services/riotAPIServices.js";
import { updateAllStatsInDOM, gameInformation} from "../components/updateAllStatsComp.js";
import { getLiveData, refresh } from "../services/liveDataServices.js";

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('fetchStatsButton');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', async function() {
            this.disabled = true;  // Prevent double-clicking
            try {
                await fetchMatchStats();
            } finally {
                this.disabled = false;  // Re-enable the button
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    gameInformation();
    updateAllStatsInDOM();
});

let timeoutId;

async function autoRefresh() {
    const gameData = await getLiveData();

    clearTimeout(timeoutId); 
    // console.log("Auto-refresh triggered");
    // console.log("Memory usage:", performance.memory.usedJSHeapSize);

    if (gameData) {
        console.log('DOM elements before update:', {
            statsContainer: !!document.getElementById('compare-team-stats'),
            orderList: !!document.getElementById('order-list'),
            chaosList: !!document.getElementById('chaos-list')
        });

        await gameInformation();
        await updateAllStatsInDOM();
        
        console.log('DOM elements after update:', {
            statsContainer: document.getElementById('compare-team-stats').innerHTML,
            orderList: document.getElementById('order-list').innerHTML,
            chaosList: document.getElementById('chaos-list').innerHTML
        });
    }

    timeoutId = setTimeout(autoRefresh, refresh()); 
}

try {
    // console.log('Starting auto-refresh cycle');
    autoRefresh();
} catch (error) {
    console.error('Error starting auto-refresh:', error);
}