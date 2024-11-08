import { notInAGame, InAGame, displayTeamStats, gameInformation, shouldForfeit, updateAllStatsInDOM, updateTeamStatsInDOM } from '../models/currentGameModel';
import { getLiveData } from '../views/currentGameDisplay';
import { getActivePlayerTeam, getGameTime, getGameTimeSeconds, getStats, getGold, getTurretsKilled, getInhibitorsKilled, getDragonSoul, getDragon, getBaron, getElder, countAlivePlayers, calculateDeathTimer, multiKills,  } from './currentGameController';
import { getTeamData, calculateWinProbability, getGameEnd, analysis } from '../models/winProbability'

// Event listener to fetch data and update stats after page load
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
        await gameInformation(); // Call your function to update stats based on new data
        await updateAllStatsInDOM();
    }
    

    timeoutId = setTimeout(autoRefresh, refreshTime); 
}

autoRefresh();