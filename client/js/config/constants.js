// client/js/config/constants.js

// API Configuration

export const ENDPOINTS = {
    LIVE_STATS: `https://cors-anywhere.herokuapp.com/https://ygkp0q6qhoowpcc9x2rzsomajf2cls-rz3t--3000--d20a0a75.local-corp.webcontainer-api.io/api/live-stats`,
};

// Environment
export const LOCAL_TESTING = false;
export const prodURL = 'https://shouldiffserver-test.onrender.com/api/stats';
export const localURL = 'http://127.0.0.1:3001/api/stats';

// Time Intervals
export const FETCH_INTERVAL_MS = 1000;
export const RETRY_INTERVAL_MS = 10000;
export const CHART_TYPES = ['kills', 'deaths', 'assists', 'kda', 'itemPurchases', 'turrets', 'dragons', 'barons', 'elders', 'atakhans', 'inhibitors', 'deathTimers', 'hordeKills', 'riftHeralds'];
export const STAT_KEYS = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];

