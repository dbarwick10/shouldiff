import { webContainerManager } from './webcontainer-setup.js';

export const files = {
  'package.json': {
    file: {
      contents: JSON.stringify({
        "name": "shouldiff_app",
        "version": "1.0.0",
        "type": "module",
        "scripts": {
          "start": "node server.js",
          "dev": "node server.js"
        },
        "dependencies": {
          "cors": "^2.8.5",
          "dotenv": "^16.4.7",
          "express": "^4.18.2",
          "node-fetch": "^3.3.2"
        }
      }, null, 2)
    }
  },
  'routes.js': {
    file: {
      contents: `
      import express from 'express';
      import { calculateLiveStats } from './liveMatchStats.js';
      
      const router = express.Router();
      
      function clearObject(obj) {
          if (!obj) return;
          for (const key in obj) {
              if (Array.isArray(obj[key])) {
                  obj[key].length = 0;
              } else if (typeof obj[key] === 'object') {
                  clearObject(obj[key]);
              }
              obj[key] = null;
          }
      }
      
      function runGC() {
          if (global.gc) {
              try {
                  global.gc();
              } catch (e) {
                  console.error('GC failed:', e);
              }
          }
      }
      
      router.get('/live-stats', async (req, res) => {
          try {
              const liveStats = await calculateLiveStats();
              console.log('Live stats data');
      
              if (!liveStats) {
                  return res.status(404).json({ error: 'No live game found' });
              }
              res.json(liveStats);
          } catch (error) {
              console.error('Server error in /api/live-stats:', error);
              res.status(500).json({ 
                  error: 'Internal server error', 
                  details: error.message 
              });
          }
      });
      
      export default router;`
    }
  },
  'constants.js': {
    file: {
      contents: `
      export const MATCH_COUNT = 5;
export const DELAY_BETWEEN_REQUESTS = 0;

export const QUEUE_MAPPINGS = {
    'aram': 450,       // ARAM
    'normal': 400,     // Normal 5v5 Draft Pick
    'blind': 430,      // Normal 5v5 Blind Pick
    'ranked': 420,     // Ranked Solo/Duo
    'flex': 440,       // Ranked Flex
    'urf': 1020,       // Ultra Rapid Fire
    'ultbook': 1400,   // Ultimate Spellbook
    'all': null        // All queues
};

export const LIVE_POLLING_RATE = 1000;
export const LIVE_STATS_ENABLED = true;`
    }
  },
  'getItemsAndPrices.js': {
    file: {
      contents: `
      const cache = {
    versions: [],
    items: new Map(),
    lastFetch: null,
    itemDetails: new Map(), // New cache specifically for processed item details
    ttl: 1000 * 60 * 60 * 24 // 24 hour cache
};

// Initialize cache at start
export async function initializeCache() {
    if (cache.versions.length === 0 || isStale()) {
        await getVersions();
        await getItemsAndPrices();
    }
}

function isStale() {
    return !cache.lastFetch || (Date.now() - cache.lastFetch) > cache.ttl;
}

async function getVersions() {
    if (cache.versions.length > 0 && !isStale()) {
        return cache.versions;
    }

    try {
        const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await response.json();
        cache.versions = versions.slice(0, 3);
        cache.lastFetch = Date.now();
        return cache.versions;
    } catch (error) {
        console.error('Error fetching versions:', error);
        if (cache.versions.length > 0) {
            return cache.versions;
        }
        throw error;
    }
}

async function fetchItemData(version) {
    if (!cache.items.has(version)) {
        console.log('Fetching item data for version: ' + version);
        const response = await fetch('https://ddragon.leagueoflegends.com/cdn/' + version + '/data/en_US/item.json');
        const itemData = await response.json();
        cache.items.set(version, itemData.data);
    }
    return cache.items.get(version);
}

async function getItemsAndPrices() {
    if (cache.items.size > 0 && !isStale()) {
        return cache.items;
    }

    const versions = await getVersions();
    for (const version of versions) {
        await fetchItemData(version);
    }
    return cache.items;
}

export async function getItemDetails(itemId) {
    try {
        const itemsCache = await getItemsAndPrices();
        // console.log('Cache state when getting item details:', {
        //     itemId,
        //     cacheSize: itemsCache.size,
        //     versions: Array.from(itemsCache.keys())
        // });

        for (const [version, items] of itemsCache) {
            if (items[itemId]) {
                const item = items[itemId];
                // console.log('Found item \${itemId} in version \${version}:'', {
                //     name: item.name,
                //     goldInfo: item.gold
                // });
                return {
                    id: itemId,
                    name: item.name,
                    gold: item.gold, // This contains {base, purchasable, total, sell}
                    description: item.description,
                    stats: item.stats,
                };
            }
        }

        console.warn('Item  not found in any version');
        return null;
    } catch (error) {
        console.error('Error in getItemDetails:', error);
        throw error;
    }
}

export function clearCache() {
    cache.versions = [];
    cache.items.clear();
    cache.itemDetails.clear();
    cache.lastFetch = null;
}

export function getCacheStats() {
    return {
        currentVersions: cache.versions,
        lastFetched: cache.lastFetch,
        cachedItemsCount: cache.items.size,
        cachedItemDetailsCount: cache.itemDetails.size,
        cachedItems: Array.from(cache.items.keys()),
        isStale: isStale()
    };
}  `
    }
  },
  'liveDataService.js': {
    file: {
      contents: `
      import fetch from 'node-fetch';
      import https from 'https';
      import { LIVE_POLLING_RATE, LIVE_STATS_ENABLED } from './constants.js';
      
      const httpsAgent = new https.Agent({
          rejectUnauthorized: false
      });
      
      let cachedData = null;
      let pollingInterval = null;
      
      export async function getLiveData() {
          if (!LIVE_STATS_ENABLED) {
              console.log('Live stats are disabled');
              return null;
          }
      
          try {
              if (!pollingInterval) {
                  await fetchLiveGameData().then(data => {
                      cachedData = data;
                  });
                  startPolling();
              }
              
              return cachedData;
          } catch (error) {
              console.error('Error in getLiveData:', error);
              return null;
          }
      }
      
      async function fetchLiveGameData() {
          if (!LIVE_STATS_ENABLED) {
              return null;
          }
          try {
              const USE_TEST_DATA = false;
              const TEST_DATA_PATH = '/test/allgamedata.json';
              const API_ENDPOINT = 'https://127.0.0.1:2999/liveclientdata/allgamedata';
      
              const response = await fetch(USE_TEST_DATA ? TEST_DATA_PATH : API_ENDPOINT, {
                  method: 'GET',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  agent: httpsAgent
              });
      
              if (!response.ok) {
                  console.error('Error fetching from League client:', response.status, response.statusText);
                  stopPolling();
                  return null;
              }
      
              return await response.json();
          } catch (error) {
              console.error('Error fetching live game data:', error);
              stopPolling();
              return null;
          }
      }
      
      function startPolling() {
          if (!LIVE_STATS_ENABLED) {
              console.log('Live stats are disabled - polling not started');
              return;
          }
      
          console.log('Starting live game data polling...');
          
          fetchLiveGameData().then(data => {
              cachedData = data;
          });
      
          pollingInterval = setInterval(async () => {
              const newData = await fetchLiveGameData();
              if (newData) {
                  cachedData = newData;
                  console.log('Live game data updated');
              }
          }, LIVE_POLLING_RATE);
      }
      
      function stopPolling() {
          if (pollingInterval) {
              console.log('Stopping live game data polling...');
              clearInterval(pollingInterval);
              pollingInterval = null;
              cachedData = null;
          }
      }
      
      process.on('SIGTERM', stopPolling);
      process.on('SIGINT', stopPolling);
        `
    }
  },
  'liveMatchStats.js': {
    file: {
      contents: `
      import { getLiveData } from './liveDataService.js';
      import { getItemDetails } from './getItemsAndPrices.js';
      
      export async function calculateLiveStats() {
          console.log('Entering calculateTeamStats');
      
          try {
              const gameData = await getLiveData();
              console.log('Received game data');
      
              if (!gameData || !gameData.events || !gameData.events.Events || !gameData.allPlayers) {
                  console.log('Insufficient game data');
                  return {
                      playerStats: createEmptyTeamStats(),
                      teamStats: createEmptyTeamStats(),
                      enemyStats: createEmptyTeamStats()
                  };
              }
      
              const events = gameData.events.Events;
              const activePlayerName = gameData?.activePlayer?.riotIdGameName;
              const allPlayers = gameData.allPlayers;
      
              const activePlayer = allPlayers.find(p => p.riotIdGameName === activePlayerName);
              const activePlayerTeam = activePlayer?.team;
              
              const playerTeamMembers = allPlayers
                  .filter(p => p.team === activePlayerTeam)
                  .map(p => p.riotIdGameName);
              const enemyTeamMembers = allPlayers
                  .filter(p => p.team !== activePlayerTeam)
                  .map(p => p.riotIdGameName);
      
              const teamStats = {
                  playerStats: createEmptyTeamStats(),
                  teamStats: createEmptyTeamStats(),
                  enemyStats: createEmptyTeamStats()
              };
      
              const gameStartEvent = events.find(event => event.EventName === 'GameStart');
              const gameStartRealTime = gameStartEvent ? Date.now() : null;
              const gameStartGameTime = gameStartEvent ? gameStartEvent.EventTime : null;
      
              teamStats.teamStats.gameStartRealTime = gameStartRealTime;
              teamStats.teamStats.gameStartGameTime = gameStartGameTime;
      
              let playerTimeSpentDead = 0;
              let playerTeamTimeSpentDead = 0;
              let enemyTeamTimeSpentDead = 0;
      
              events.forEach(event => {
                  if (event.EventName === "ChampionKill") {
          const { KillerName, VictimName, Assisters = [], EventTime } = event;
          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName || p.summonerName === KillerName);
          const victimPlayer = allPlayers.find(p => p.riotIdGameName === VictimName || p.summonerName === VictimName);
          
          // Determine enemy team
          const enemyTeam = activePlayerTeam === 'ORDER' ? 'CHAOS' : 'ORDER';
          
          // Track deaths and time spent dead
          if (victimPlayer) {
              const currentMinutes = Math.floor(EventTime / 60);
              const deathTimer = calculateDeathTimer(currentMinutes, victimPlayer?.level);
      
              // Player death
              if (VictimName === activePlayerName) {
                  teamStats.playerStats.deaths.push(EventTime);
                  
                  if (!teamStats.playerStats.timeSpentDead) teamStats.playerStats.timeSpentDead = [];
                  if (!teamStats.playerStats.totalTimeSpentDead) teamStats.playerStats.totalTimeSpentDead = [];
                  
                  teamStats.playerStats.timeSpentDead.push(deathTimer);
                  playerTimeSpentDead += deathTimer;
                  teamStats.playerStats.totalTimeSpentDead.push(playerTimeSpentDead);
      
                  const currentKills = teamStats.playerStats.kills.length;
                  const currentAssists = teamStats.playerStats.assists.length;
                  const currentDeaths = teamStats.playerStats.deaths.length;
                  
                  const kdaValue = (currentKills + currentAssists) / Math.max(1, currentDeaths);
                  teamStats.playerStats.kda.push({
                      timestamp: EventTime,
                      kdaValue: parseFloat(kdaValue.toFixed(2))
                  });
              }
      
              // Team death
              if (victimPlayer.team === activePlayerTeam) {
                  teamStats.teamStats.deaths.push(EventTime);
                  
                  if (!teamStats.teamStats.timeSpentDead) teamStats.teamStats.timeSpentDead = [];
                  if (!teamStats.teamStats.totalTimeSpentDead) teamStats.teamStats.totalTimeSpentDead = [];
                  
                  teamStats.teamStats.timeSpentDead.push(deathTimer);
                  playerTeamTimeSpentDead += deathTimer;
                  teamStats.teamStats.totalTimeSpentDead.push(playerTeamTimeSpentDead);
      
                  const currentKills = teamStats.teamStats.kills.length;
                  const currentAssists = teamStats.teamStats.assists.length;
                  const currentDeaths = teamStats.teamStats.deaths.length;
                  
                  const kdaValue = (currentKills + currentAssists) / Math.max(1, currentDeaths);
                  teamStats.teamStats.kda.push({
                      timestamp: EventTime,
                      kdaValue: parseFloat(kdaValue.toFixed(2))
                  });
              }
      
              // Enemy team death
              if (victimPlayer.team === enemyTeam) {
                  teamStats.enemyStats.deaths.push(EventTime);
                  
                  if (!teamStats.enemyStats.timeSpentDead) teamStats.enemyStats.timeSpentDead = [];
                  if (!teamStats.enemyStats.totalTimeSpentDead) teamStats.enemyStats.totalTimeSpentDead = [];
                  
                  teamStats.enemyStats.timeSpentDead.push(deathTimer);
                  enemyTeamTimeSpentDead += deathTimer;
                  teamStats.enemyStats.totalTimeSpentDead.push(enemyTeamTimeSpentDead);
      
                  const currentKills = teamStats.enemyStats.kills.length;
                  const currentAssists = teamStats.enemyStats.assists.length;
                  const currentDeaths = teamStats.enemyStats.deaths.length;
                  
                  const kdaValue = (currentKills + currentAssists) / Math.max(1, currentDeaths);
                  teamStats.enemyStats.kda.push({
                      timestamp: EventTime,
                      kdaValue: parseFloat(kdaValue.toFixed(2))
                  });
              }
          }
      
          // Only proceed with kill attribution if the killer is an actual player
          if (!killerPlayer) {
              return; // Early return for non-player kills (turrets, minions, etc.)
          }
      
          // Handle enemy team kills
          if (killerPlayer.team === enemyTeam) {
              teamStats.enemyStats.kills.push(EventTime);
              
              if (enemyAssists.length > 0) {
                  teamStats.enemyStats.assists.push(EventTime);
              }
      
              // Update Enemy KDA
              const currentKills = teamStats.enemyStats.kills.length;
              const currentAssists = teamStats.enemyStats.assists.length;
              const currentDeaths = Math.max(1, teamStats.enemyStats.deaths.length);
              
              const kdaValue = (currentKills + currentAssists) / currentDeaths;
              teamStats.enemyStats.kda.push({
                  timestamp: EventTime,
                  kdaValue: parseFloat(kdaValue.toFixed(2))
              });
          }
          
          // Handle player team kills
          if (killerPlayer.team === activePlayerTeam) {
              teamStats.teamStats.kills.push(EventTime);
              
              if (teamAssists.length > 0) {
                  teamStats.teamStats.assists.push(EventTime);
              }
      
              // Update Team KDA
              const currentKills = teamStats.teamStats.kills.length;
              const currentAssists = teamStats.teamStats.assists.length;
              const currentDeaths = Math.max(1, teamStats.teamStats.deaths.length);
              
              const kdaValue = (currentKills + currentAssists) / currentDeaths;
              teamStats.teamStats.kda.push({
                  timestamp: EventTime,
                  kdaValue: parseFloat(kdaValue.toFixed(2))
              });
          }
      
          // Track player kills and assists
          if (activePlayerName) {
              if (KillerName === activePlayerName) {
                  teamStats.playerStats.kills.push(EventTime);
              }
              
              if (Assisters.includes(activePlayerName)) {
                  teamStats.playerStats.assists.push(EventTime);
              }
      
              // Update player KDA on kill or assist
              if (KillerName === activePlayerName || Assisters.includes(activePlayerName)) {
                  const currentKills = teamStats.playerStats.kills.length;
                  const currentAssists = teamStats.playerStats.assists.length;
                  const currentDeaths = Math.max(1, teamStats.playerStats.deaths.length);
                  
                  const kdaValue = (currentKills + currentAssists) / currentDeaths;
                  teamStats.playerStats.kda.push({
                      timestamp: EventTime,
                      kdaValue: parseFloat(kdaValue.toFixed(2))
                  });
              }
          }
      } else if (event.EventName === "TurretKilled") {
                          const { KillerName, EventTime } = event;
                          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
                          const minionPlayerTeam = activePlayerTeam === 'ORDER' ? 'T100' : 'T200';
                          const minionEnemyTeam = activePlayerTeam === 'ORDER' ? 'T200' : 'T100';
      
                          // Active Player stats
                          if (activePlayerName && KillerName === activePlayerName) {
                              teamStats.playerStats.turrets.push(EventTime);
                          }
                          if ((killerPlayer?.team === activePlayerTeam) || KillerName.includes(minionPlayerTeam)) {
                              teamStats.teamStats.turrets.push(EventTime);
                          }
                          // Enemy Team stats tracking
                          if ((killerPlayer?.team !== activePlayerTeam) || KillerName.includes(minionEnemyTeam)) {
                              teamStats.enemyStats.turrets.push(EventTime);
                          }
      
                      } else if (event.EventName === "InhibKilled") {
                          const { KillerName, EventTime } = event;
                          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
                          const minionPlayerTeam = activePlayerTeam === 'ORDER' ? 'T100' : 'T200';
                          const minionEnemyTeam = activePlayerTeam === 'ORDER' ? 'T200' : 'T100';
      
                          if (activePlayerName && KillerName === activePlayerName) {
                              teamStats.playerStats.inhibitors.push(EventTime);
                          }
                          if ((killerPlayer?.team === activePlayerTeam) || KillerName.includes(minionPlayerTeam)) {
                              teamStats.teamStats.inhibitors.push(EventTime);
                          }
                          // Enemy Team stats tracking
                          if ((killerPlayer?.team !== activePlayerTeam) || KillerName.includes(minionEnemyTeam)) {
                              teamStats.enemyStats.inhibitors.push(EventTime);
                          }
      
                      } else if (event.EventName === "HordeKill") {
                          const { KillerName, EventTime } = event;
                          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
      
                          // Active Player stats
                          if (activePlayerName && KillerName === activePlayerName) {
                              teamStats.playerStats.hordeKill.push(EventTime);
                          }
                          if (killerPlayer?.team === activePlayerTeam) {
                              teamStats.teamStats.hordeKill.push(EventTime);
                          }
                          // Enemy Team stats tracking
                          if (killerPlayer?.team !== activePlayerTeam) {
                              teamStats.enemyStats.hordeKill.push(EventTime);
                          }
      
                      } else if (event.EventName === "HeraldKill") {
                          const { KillerName, EventTime } = event;
                          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
      
                          // Active Player stats
                          if (activePlayerName && KillerName === activePlayerName) {
                              teamStats.playerStats.heraldKills.push(EventTime);
                          }
                          if (killerPlayer?.team === activePlayerTeam) {
                              teamStats.teamStats.heraldKills.push(EventTime);
                          }
                          // Enemy Team stats tracking
                          if (killerPlayer?.team !== activePlayerTeam) {
                              teamStats.enemyStats.heraldKills.push(EventTime);
                          }
                      
                      } else if (event.EventName === "DragonKill") {
                          const { KillerName, EventTime } = event;
                          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
      
                          // Active Player stats
                          if (activePlayerName && KillerName === activePlayerName) {
                              teamStats.playerStats.dragons.push(EventTime);
                          }
                          if (killerPlayer?.team === activePlayerTeam) {
                              teamStats.teamStats.dragons.push(EventTime);
                          }
                          // Enemy Team stats tracking
                          if (killerPlayer?.team !== activePlayerTeam) {
                              teamStats.enemyStats.dragons.push(EventTime);
                          }
                      } else if (event.EventName === "BaronKill") {
                          const { KillerName, EventTime } = event;
                          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
      
                          // Active Player stats
                          if (activePlayerName && KillerName === activePlayerName) {
                              teamStats.playerStats.barons.push(EventTime);
                          }
                          if (killerPlayer?.team === activePlayerTeam) {
                              teamStats.teamStats.barons.push(EventTime);
                          }
                          // Enemy Team stats tracking
                          if (killerPlayer?.team !== activePlayerTeam) {
                              teamStats.enemyStats.barons.push(EventTime);
                          }
                      } else if (event.EventName === "AtakhanKill") {
                          const { KillerName, EventTime } = event;
                          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
      
                          // Active Player stats
                          if (activePlayerName && KillerName === activePlayerName) {
                              teamStats.playerStats.atakhans.push(EventTime);
                          }
                          if (killerPlayer?.team === activePlayerTeam) {
                              teamStats.teamStats.atakhans.push(EventTime);
                          }
                          // Enemy Team stats tracking
                          if (killerPlayer?.team !== activePlayerTeam) {
                              teamStats.enemyStats.atakhans.push(EventTime);
                          }
                      }  else if (event.DragonType === "Elder") {
                          const { KillerName, EventTime } = event;
                          const killerPlayer = allPlayers.find(p => p.riotIdGameName === KillerName);
      
                          // Active Player stats
                          if (activePlayerName && KillerName === activePlayerName) {
                              teamStats.playerStats.elders.push(EventTime);
                          }
                          if (killerPlayer?.team === activePlayerTeam) {
                              teamStats.teamStats.elders.push(EventTime);
                          }
                          // Enemy Team stats tracking
                          if (killerPlayer?.team !== activePlayerTeam) {
                              teamStats.enemyStats.elders.push(EventTime);
                          }
                      } 
              });
      
              await calculateItemValues(
                  teamStats, 
                  gameData.allPlayers, 
                  gameData?.activePlayer?.riotIdGameName,
                  gameData.gameData
              );
      
              // Add gold differential calculations
              teamStats.teamStats.goldDifferential = 
                  teamStats.teamStats.itemGold - teamStats.enemyStats.itemGold;
      
              return teamStats;
      
          } catch (error) {
              console.error('Complete error in calculateTeamStats:', error);
              return {
                  playerStats: createEmptyTeamStats(),
                  teamStats: createEmptyTeamStats(),
                  enemyStats: createEmptyTeamStats()
              };
          }
      }
      
      function createEmptyTeamStats() {
          return { 
              kills: [], 
              deaths: [],
              timeSpentDead: [],
              totalTimeSpentDead: [],
              assists: [],
              kda: [],
              turrets: [],      
              inhibitors: [],
              hordeKills: [],
              heraldKills: [],
              dragons: [],      
              barons: [],       
              elders: [],   
              atakhans: [],    
              items: [],
              itemGold: 0,
              itemGoldHistory: []
          };
      }
      
      function findPlayerTeam(allPlayers, activePlayerName) {
          const activePlayer = allPlayers.find(p => p.riotIdGameName === activePlayerName);
          return activePlayer ? activePlayer.team : null;
      }
      
      // Calculate gold value for a single item
      async function calculateItemGold(item) {
          if (!item || !item.itemID) return 0;
          
          try {
              const itemDetails = await getItemDetails(item.itemID);
              if (itemDetails && itemDetails.gold) {
                  return itemDetails.gold.total * (item.count || 1);
              }
          } catch (error) {
              // console.error('Error calculating gold for' + item.itemID + ': ', error);
          }
          return 0;
      }
      
      async function calculateItemValues(teamStats, allPlayers, activePlayerName, gameData) {
          const activePlayer = allPlayers.find(p => p.riotIdGameName === activePlayerName);
          const activePlayerTeam = activePlayer?.team;
          const gameTime = gameData?.gameTime || 0;
      
          // First define the team member arrays
          const playerTeamMembers = allPlayers.filter(p => p.team === activePlayerTeam);
          const enemyTeamMembers = allPlayers.filter(p => p.team !== activePlayerTeam);
      
          // Initialize arrays if they don't exist
          if (!teamStats.playerStats.itemGoldHistory) teamStats.playerStats.itemGoldHistory = [];
          if (!teamStats.teamStats.itemGoldHistory) teamStats.teamStats.itemGoldHistory = [];
          if (!teamStats.enemyStats.itemGoldHistory) teamStats.enemyStats.itemGoldHistory = [];
      
          // Calculate gold for active player
          if (activePlayer) {
              const playerGold = await Promise.all(activePlayer.items.map(calculateItemGold));
              const totalPlayerGold = playerGold.reduce((a, b) => a + b, 0);
              
              const lastEntry = teamStats.playerStats.itemGoldHistory[teamStats.playerStats.itemGoldHistory.length - 1];
              if (!lastEntry || lastEntry.gold !== totalPlayerGold) {
                  teamStats.playerStats.itemGold = totalPlayerGold;
                  teamStats.playerStats.itemGoldHistory.push({
                      timestamp: gameTime,
                      gold: totalPlayerGold
                  });
              }
          }
      
          // Calculate gold for player's team
          const teamGold = await Promise.all(
              playerTeamMembers.flatMap(player => 
                  (player.items || []).map(calculateItemGold)
              )
          );
          const totalTeamGold = teamGold.reduce((a, b) => a + b, 0);
          
          const lastTeamEntry = teamStats.teamStats.itemGoldHistory[teamStats.teamStats.itemGoldHistory.length - 1];
          if (!lastTeamEntry || lastTeamEntry.gold !== totalTeamGold) {
              teamStats.teamStats.itemGold = totalTeamGold;
              teamStats.teamStats.itemGoldHistory.push({
                  timestamp: gameTime,
                  gold: totalTeamGold
              });
          }
      
          // Calculate gold for enemy team
          const enemyGold = await Promise.all(
              enemyTeamMembers.flatMap(player => 
                  (player.items || []).map(calculateItemGold)
              )
          );
          const totalEnemyGold = enemyGold.reduce((a, b) => a + b, 0);
          
          const lastEnemyEntry = teamStats.enemyStats.itemGoldHistory[teamStats.enemyStats.itemGoldHistory.length - 1];
          if (!lastEnemyEntry || lastEnemyEntry.gold !== totalEnemyGold) {
              teamStats.enemyStats.itemGold = totalEnemyGold;
              teamStats.enemyStats.itemGoldHistory.push({
                  timestamp: gameTime,
                  gold: totalEnemyGold
              });
          }
      }
      
      const BRW = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5];
      
      function getTimeIncreaseFactor(currentMinutes) {
          if (currentMinutes < 15) return 0;
          if (currentMinutes < 30) {
              return Math.min(Math.ceil(2 * (currentMinutes - 15)) * 0.00425, 0.1275);
          } else if (currentMinutes < 45) {
              return Math.min(0.1275 + Math.ceil(2 * (currentMinutes - 30)) * 0.003, 0.2175);
          } else if (currentMinutes < 55) {
              return Math.min(0.2175 + Math.ceil(2 * (currentMinutes - 45)) * 0.0145, 0.50);
          }
          return 0.50;
      }
      
      function calculateDeathTimer(currentMinutes, level) {
          const baseRespawnWait = BRW[level - 1];
          const timeIncreaseFactor = getTimeIncreaseFactor(currentMinutes);
          const deathTimer = baseRespawnWait + (baseRespawnWait * timeIncreaseFactor);
          
          return deathTimer;
      }  `
    }
  },
  'gameConstrants.js': {
    file: {
      contents: `
      export const BRW = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5];

      export function createEmptyTeamStats() {
          return { 
              kills: [], 
              deaths: [],
              timeSpentDead: [],
              totalTimeSpentDead: [],
              assists: [],
              kda: [],
              turrets: [],      
              inhibitors: [],   
              dragons: [],      
              barons: [],       
              elders: [],       
              items: []
          };
      }

      export function createDefaultStats() {
          return {
              playerStats: createEmptyTeamStats(),
              teamStats: createEmptyTeamStats(),
              enemyStats: createEmptyTeamStats()
          };
      }`
    }
  },
  'server.js': {
    file: {
      contents: `
      import express from 'express';
      import cors from 'cors';
      import path from 'path';
      import { fileURLToPath } from 'url';
      import { dirname } from 'path';
      import 'dotenv/config';
      import apiRoutes from './routes.js';
      import { initializeCache } from './getItemsAndPrices.js';

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      const app = express();
      const PORT = process.env.PORT || 3000;

      async function startServer() {
          try {
              app.use((_req, res, next) => {
                res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
                res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
                next();
                });
              await initializeCache();
              console.log('Item cache initialized successfully');

              app.use(cors());
              app.use(express.json());
              app.use((req, res, next) => {

                  res.on('finish', () => {
                  });

                  next();
              });

              app.use('/api', apiRoutes);

              app.use(express.static(path.join(__dirname, '..')));

              app.use((err, req, res, next) => {
                  console.error('Server error:', err);
                  res.status(err.status || 500).json({ error: err.message });
              });

              app.listen(PORT, () => {
                  console.log('Server running on port');
                  console.log('Available endpoints:');
                  console.log('  - GET /api/live-stats');
              });

              
          } catch (error) {
                  console.error('Failed to start server:', error);
                  process.exit(1);
              }
          }
          
      startServer();`
    }
  }
};

export async function startDevServer() {
  if (!window.WebContainer) {
    webContainerManager.log('WebContainer not initialized', 'error');
    return;
  }
   const webcontainer = window.WebContainer || window.webcontainer;
  if (!webcontainer) {
    webContainerManager.log('WebContainer object is undefined', 'error');
    return;
  }

  try {
    webContainerManager.log('Mounting project files...');
    await webContainerManager.webcontainer.mount(files);
    webContainerManager.log('Project files mounted successfully', 'success');

    webContainerManager.log('Installing dependencies...');
    const installProcess = await webContainerManager.webcontainer.spawn('npm', ['install']);
    
    installProcess.output.pipeTo(new WritableStream({
      write(data) {
        webContainerManager.log('npm install: ' + data);
      }
    }));

    const installExitCode = await installProcess.exit;
    
    if (installExitCode !== 0) {
      throw new Error('Installation failed');
    }
    webContainerManager.log('Dependencies installed successfully', 'success');

    webContainerManager.log('Starting development server...');
    const serverProcess = await webContainerManager.webcontainer.spawn('npm', ['run', 'dev']);
    
    serverProcess.output.pipeTo(new WritableStream({
      write(data) {
        webContainerManager.log('server: ' + data);
      }
    }));

    webContainerManager.webcontainer.on('server-ready', (port, url) => {
      webContainerManager.log('Development server is ready at ' + url, 'success');
      window.API_BASE_URL = url;
    });

  } catch (error) {
    webContainerManager.log('Error in startDevServer: ' + error.message, 'error');
    throw error;
  }
}