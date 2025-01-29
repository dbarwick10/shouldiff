// client/js/config/constants.js

// API Configuration
export const API_URL = window.API_BASE_URL || 'http://127.0.0.1:3000';

export const ENDPOINTS = {
    LIVE_STATS: `${API_URL}/api/live-stats`,
    STATS: `${API_URL}/api/stats`
};

// Environment
export const LOCAL_TESTING = window.API_BASE_URL ? true : false;

// Time Intervals
export const FETCH_INTERVAL_MS = 1000;
export const RETRY_INTERVAL_MS = 10000;

// Chart Configuration
export const CHART_TYPES = [
    'kills',
    'deaths',
    'assists',
    'kda',
    'itemPurchases',
    'turrets',
    'dragons',
    'barons',
    'elders',
    'atakhans',
    'inhibitors',
    'deathTimers',
    'hordeKills',
    'riftHeralds'
];

// Game Stats Configuration
export const STAT_KEYS = [
    'wins',
    'losses',
    'surrenderWins',
    'surrenderLosses'
];