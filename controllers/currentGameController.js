import { 
    notInAGame, 
    InAGame, 
    displayTeamStats, 
    gameInformation, 
    shouldForfeit, 
    updateAllStatsInDOM
    //,updateTeamStatsInDOM 
} from '../views/currentGameDisplay.js';

import { 
    getActivePlayerTeam, 
    getGameTime, 
    getGameTimeSeconds, 
    getStats, 
    getGold, 
    getTurretsKilled, 
    getInhibitorsKilled, 
    getDragonSoul, 
    getDragon, 
    getBaron, 
    getElder, 
    countAlivePlayers, 
    calculateDeathTimer, 
    multiKills,  
    getLiveData 
} from '../models/currentGameModel.js';

import { 
    getTeamData, 
    calculateWinProbability, 
    getGameEnd, 
    analysis 
} from '../models/winProbability.js';

let refreshTime = 10000;
let timeoutId;

// Central function to initialize and refresh data
// Event listener to fetch data and update stats after page load
document.addEventListener('DOMContentLoaded', () => {
    console.log("Controller: Page loaded. Fetching initial game data...");

    initializeApp();  // Start the app once the DOM is ready
});

async function initializeApp() {
    console.log("Controller: App initialized");

    try {
        const gameData = await getLiveData();
        console.log("Controller: Game data fetched");

        if (gameData.gameData) {
            // Update game information and all stats in the DOM
            await gameInformation();  // Function to prepare data for display
            console.log("Controller: gameInformation called");

            await updateAllStatsInDOM(); // Function to update the DOM with new stats
            console.log("Controller: updateAllStatsInDOM called");

            // Example of calling additional functions if needed
            const winProbability = calculateWinProbability(gameData);
            console.log("Controller: Win probability calculated:", winProbability);

            // Display or log any other necessary data here
            displayTeamStats();  // Display team stats in the DOM
            console.log("Controller: displayTeamStats called");
        } else {
            console.log("Controller: No game data available");
            notInAGame();  // Update DOM to show that no game is active
        }
    } catch (error) {
        console.error("Controller: Error fetching or updating game data", error);
    }

    // Schedule the next refresh
    clearTimeout(timeoutId);
    timeoutId = setTimeout(initializeApp, refreshTime);
}


// Exporting functions if they need to be accessed outside the controller
export { 
    getActivePlayerTeam, 
    getGameTime, 
    getGameTimeSeconds, 
    getStats, 
    getGold, 
    getTurretsKilled, 
    getInhibitorsKilled, 
    getDragonSoul, 
    getDragon, 
    getBaron, 
    getElder, 
    countAlivePlayers, 
    calculateDeathTimer, 
    multiKills,  
    getLiveData,
    getTeamData, 
    calculateWinProbability, 
    getGameEnd, 
    analysis,
    gameInformation
};
