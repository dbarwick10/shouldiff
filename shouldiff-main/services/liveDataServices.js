import { notInAGame } from "../components/updateAllStatsComp.js";

let cachedGameData = null;
let lastFetchTime = null;
let refreshTime = 1000;

const FETCH_INTERVAL_MS = refreshTime;

export function refresh(){
    return refreshTime;
}

export async function getLiveData() {
    const currentTime = Date.now();
    
    if (cachedGameData && lastFetchTime && (currentTime - lastFetchTime < FETCH_INTERVAL_MS)) {
        
        return cachedGameData; // Return cached data
    }
    try {
        // Fetch the data from allgamedata.json for testing
        // const response = await fetch('/test/allgamedata.json');
        
        const response = await fetch("http://127.0.0.1:3000/liveclientdata/allgamedata", {
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            
            const newData = await response.json();
            //console.log("Fetched data:", newData); // Log the new data
            
            cachedGameData = newData;
            lastFetchTime = currentTime;
            return cachedGameData;
        } else {
            console.error('Error fetching data:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        //console.error('Request failed:', error);
        notInAGame();
        return null;
    }
}