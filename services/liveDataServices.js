// import { notInAGame } from "../components/updateAllStatsComp.js";

let cachedGameData = null;
let lastFetchTime = null;
let refreshTime = 1000;

const FETCH_INTERVAL_MS = refreshTime;

export function refresh() {
    return refreshTime;
}

export function setRefreshTime(newTime) {
    refreshTime = newTime;
}

export async function getLiveData() {
    const currentTime = Date.now();

    // Caching logic
    // if (cachedGameData && lastFetchTime && (currentTime - lastFetchTime < FETCH_INTERVAL_MS)) {
    //     return cachedGameData; // Return cached data
    // }

    try {
        const TESTING = false; // Toggle for testing or production
        const API_URL = TESTING
            ? '/test/allgamedata.json'
            : "http://127.0.0.1:3000/liveclientdata/allgamedata";

        const response = await fetch(API_URL, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            const newData = await response.json();
            // cachedGameData = newData; // Cache new data
            // lastFetchTime = currentTime;
            // return cachedGameData;
            return newData;
        } else {
            console.error('Error fetching data:', response.status, response.statusText);
            notInAGame(); // Trigger UI update or state change
            return null;
        }
    } catch (error) {
        console.error('Request failed:', error);
        notInAGame(); // Handle the error gracefully
        return null;
    }
}

