// client/js/config/constants.js

// API Configuration

export const ENDPOINTS = {
    LIVE_STATS: `http://127.0.0.1:3000/api/live-stats`,
};

// Environment
export const LOCAL_TESTING = false;
export const prodURL = 'https://shouldiffserver-test.onrender.com/api/stats';
export const localURL = 'http://127.0.0.1:3001/api/stats';

// Time Intervals
export const FETCH_INTERVAL_MS = 1000;
export const RETRY_INTERVAL_MS = 120000;
export const CHART_TYPES = ['kills', 'deaths', 'assists', 'kda', 'itemPurchases', 'turrets', 'dragons', 'barons', 'elders', 'atakhans', 'inhibitors', 'deathTimers', 'hordeKills', 'riftHeralds'];
export const STAT_KEYS = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];

