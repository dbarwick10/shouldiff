import { getLiveData } from "../services/liveDataServices.js";

const allGameData = await getLiveData();
let itemPricesCache = null;

export async function getGameMode() {
    try {
        const allGameData = await getLiveData(); // Use cached game data
        const gameMode = allGameData.gameData.gameMode; // Get game mode

        if (gameMode) {
            //console.log('game mode:', gameMode)
            return gameMode
        } else {
            return null; // Return null if player is not found
        }} catch (error) {
            console.error('Error fetching active player or player list:', error);
            return null; // Return null on error
    }
}

export async function getActivePlayerTeam() {
    try {
        const allGameData = await getLiveData(); // Use cached game data
        const activePlayerName = allGameData.activePlayer.riotIdGameName; // Get active player name

        // Find the active player in the 'allPlayers' list
        const activePlayer = allGameData.allPlayers.find(player => player.riotIdGameName === activePlayerName);
        
        if (activePlayer) {
            //console.log("Active player team:", activePlayer.team); // Log the active player's team
            return activePlayer.team; // Return the active player's team if found
        } else {
            //console.log("Active player not found."); // Log if active player is not found
            return null; // Return null if player is not found
        }
    } catch (error) {
        console.error('Error fetching active player or player list:', error);
        return null; // Return null on error
    }
}

export async function getGameTime() {
    const time = allGameData.gameData.gameTime
    const minutes = Math.floor(time / 60)
    const seconds = (time % 60).toFixed(0)
    const gameTime = `${minutes}m ${seconds}s`

    return gameTime
}

export async function getGameTimeSeconds() {
    const gameTimeInSeconds = allGameData.gameData.gameTime
    
    return gameTimeInSeconds
}

// Calculate Stats
export async function getStats(teamOrPlayerName, statType) {
    const allPlayers = allGameData.allPlayers;

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    if (!statType) {
        console.error('Stat type is undefined or missing.');
        return;
    }

    const specificPlayer = allPlayers.find(player => player.riotIdGameName === teamOrPlayerName);

    if (specificPlayer) {
        if (statType === 'level') {
            return specificPlayer.level;
        } else if (specificPlayer.scores && specificPlayer.scores.hasOwnProperty(statType)) {
            return specificPlayer.scores[statType];
        } else {
            console.error(`Stat type '${statType}' not found for player ${teamOrPlayerName}`);
            return 0;
        }
    } else {
        const teamTotal = allPlayers
            .filter(player => player.team === teamOrPlayerName)
            .reduce((total, player) => {
                if (statType === 'level') {
                    return total + player.level;
                } else if (player.scores && player.scores.hasOwnProperty(statType)) {
                    return total + player.scores[statType];
                } else {
                    console.error(`Stat type '${statType}' is not valid for player ${player.riotIdGameName}`);
                    return total;
                }
            }, 0);

        return teamTotal;
    }
}

// Calculate total gold difference
export async function getGold(teamOrPlayerName) {
    const allPlayers = allGameData.allPlayers; // Assuming players are in allPlayers array
    
    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }
    
    const getVersion = async () => {
        
        const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const data = await response.json();
        const version = data[0]; 
        // console.log('version: ',version)
        return version;
    };

    const getItemPrices = async () => {
        const version = await getVersion();
        // console.log('version: ',version)

        if (!itemPricesCache) {
            const itemDataResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`);
            const itemData = await itemDataResponse.json();
            itemPricesCache = itemData.data;
            // console.log('Item prices fetched and cached.');
        } else {
            // console.log('Using cached item prices.');
        }
        return itemPricesCache;
    };
    
    const itemPrices = await getItemPrices();
    // console.log('Item prices:', itemPrices);
    
    const specificPlayer = allPlayers.find(player => player.riotIdGameName === teamOrPlayerName);
    // console.log(`Specific player found: ${specificPlayer ? specificPlayer.riotIdGameName : 'None'}`);
    
    if (specificPlayer) {
        // Return total gold for the specific player based on their items
        const totalGold = specificPlayer.items.reduce((totalGold, item) => {
            if (item.itemID && itemPrices[item.itemID]) {
                const itemPrice = itemPrices[item.itemID].gold.base || 0;
                const itemName = itemPrices[item.itemID].name;
                totalGold += itemPrice;
                //console.log(`Item ID: ${item.itemID}, Item Name: ${itemName}, Item Cost: ${itemPrice}`); // Log item details
            } else {
                //console.warn(`Item ID: ${item.itemID} not found in itemPrices.`); // Warn if item is not found
            }
            return totalGold;
        }, 0);
        //console.log(`Total gold for player ${specificPlayer.riotIdGameName}: ${totalGold}`);
        return totalGold;
    } else {
        // Otherwise, assume it's a team and calculate total gold for that team
        const teamGold = allPlayers
            .filter(player => player.team === teamOrPlayerName)
            .reduce((total, player) => {
                const playerGold = player.items.reduce((goldTotal, item) => {
                    if (item.itemID && itemPrices[item.itemID]) {
                        const itemPrice = itemPrices[item.itemID].gold.base || 0; // Get base price of the item
                        const itemName = itemPrices[item.itemID].name; // Get the item name
                        goldTotal += itemPrice;
                        //console.log(`Item ID: ${item.itemID}, Item Name: ${itemName}, Item Cost: ${itemPrice}`); // Log item details
                    } else {
                        //console.warn(`Item ID: ${item.itemID} not found in itemPrices for player ${player.riotIdGameName}.`); // Warn if item is not found
                    }
                    return goldTotal;
                }, 0);
                //console.log(`Total gold for player ${player.riotIdGameName}: ${playerGold}`);
                return total + playerGold;
            }, 0);
    
        //console.log(`Total gold for team ${teamOrPlayerName}: ${teamGold}`);
        return teamGold;
    }    
}

// Calculate turrets taken
export async function getTurretsKilled(team, num1, num2) {
    const allPlayers = allGameData.allPlayers;

    if (!allPlayers || !allGameData.events || !allGameData.events.Events) {
        console.error('Required data not found in game data');
        return;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team) 
        .map(player => player.riotIdGameName); 

    const outerTurret = allGameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T" + num2 + "_R_03_A" ||
            event.TurretKilled === "Turret_T" + num2 + "_L_03_A" ||
            event.TurretKilled === "Turret_T" + num2 + "_C_05_A"
            ) &&
            (
                teamPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T" + num1 + "00")
            )
        )
        .length;

    const innerTurret = allGameData.events.Events
    .filter(event => 
        event.EventName === "TurretKilled" &&
        (
        event.TurretKilled === "Turret_T" + num2 + "_R_02_A" ||
        event.TurretKilled === "Turret_T" + num2 + "_L_02_A" ||
        event.TurretKilled === "Turret_T" + num2 + "_C_04_A"
        ) &&
        (
            teamPlayers.includes(event.KillerName) ||
        event.KillerName.includes("Minion_T" + num1 + "00")
        )
    )
    .length;

    const inhibTurret = allGameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T" + num2 + "_R_01_A" ||
            event.TurretKilled === "Turret_T" + num2 + "_L_01_A" ||
            event.TurretKilled === "Turret_T" + num2 + "_C_03_A"
            ) &&
            (
                teamPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T" + num1 + "00")
            )
        )
    .length;

    const nexusTurret = allGameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T" + num2 + "_C_01_A" ||
            event.TurretKilled === "Turret_T" + num2 + "_C_02_A"
            ) &&
            (
            teamPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T" + num1 + "00")
            )
        )
    .length;
        
    return {
        outerTurret,
        innerTurret,
        inhibTurret,
        nexusTurret,
        total: outerTurret + innerTurret + inhibTurret + nexusTurret
    };
}

// Object to store the respawn timers for each inhibitor
const inhibitorTimers = {
    ORDER: { 1: null, 2: null, 3: null },
    CHAOS: { 1: null, 2: null, 3: null }
};
const activeCountdowns = {
    ORDER: { 1: null, 2: null, 3: null },
    CHAOS: { 1: null, 2: null, 3: null }
};

export async function getInhibitorsKilled(team, num1, num2) {
    const allPlayers = allGameData.allPlayers; 
    const currentTime = await getGameTimeSeconds();

    if (!allPlayers || !allGameData.events || !allGameData.events.Events) {
        console.error('Required data not found in game data');
        return { count: 0, inhibitorNumber: null };
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team)
        .map(player => player.riotIdGameName); 

    let inhibitorNumber = null;

    // Reverse search for the most recent InhibKilled event
    const inhibEvent = [...allGameData.events.Events].reverse().find(event =>
        event.EventName === "InhibKilled" &&
        (currentTime - event.EventTime <= 180) &&
        (
            teamPlayers.includes(event.KillerName) ||
        event.KillerName.includes("Minion_T" + num1 + "00")
        )
    );

    if (inhibEvent) {
        const inhibKilled = inhibEvent.InhibKilled;
        
        // Create a unique identifier based on the type of inhibitor
        if (
            inhibKilled === `Barracks_T${num2}_C1` ||
            inhibKilled === `Barracks_T${num2}_L1` ||
            inhibKilled === `Barracks_T${num2}_R1`
        ) {
            // Use the full name as the unique identifier
            inhibitorNumber = inhibKilled; // Use the entire string as the unique identifier
            const respawnTime = inhibEvent.EventTime + 300; // Respawn in 300 seconds
            inhibitorTimers[team][inhibitorNumber] = respawnTime;
            startInhibitorRespawnCountdown(team, inhibitorNumber);
        }
    }

    // Use a Set to count only unique inhibitors that are destroyed and not yet respawned
    const uniqueInhibitors = new Set();
    allGameData.events.Events.forEach(event => {
        const isDestroyed = event.EventName === "InhibKilled";
        const respawnTime = inhibitorTimers[team][event.InhibKilled];
        const hasNotRespawned = respawnTime && respawnTime > currentTime;

        if (
            isDestroyed &&
            (event.InhibKilled === `Barracks_T${num2}_C1` ||
             event.InhibKilled === `Barracks_T${num2}_L1` ||
             event.InhibKilled === `Barracks_T${num2}_R1`) &&
            teamPlayers.includes(event.KillerName) &&
            hasNotRespawned
        ) {
            uniqueInhibitors.add(event.InhibKilled); // Use the entire string as the unique identifier
        }
    });

    return { count: uniqueInhibitors.size, inhibitorNumber };
}


export async function startInhibitorRespawnCountdown(team, inhibitorNumber) {
    // Clear any existing countdown for this inhibitor
    if (activeCountdowns[team][inhibitorNumber]) {
        clearInterval(activeCountdowns[team][inhibitorNumber]);
    }

    const respawnTime = Math.floor(inhibitorTimers[team][inhibitorNumber]).toFixed(0); // This should be set to currentTime + 300

    // Start a new countdown
    activeCountdowns[team][inhibitorNumber] = setInterval(async () => {
        const currentTime = Math.floor(await getGameTimeSeconds()).toFixed(0);
        const timeLeft = Math.floor(respawnTime - currentTime).toFixed(0); // Calculate remaining time

        //console.log(`Current Time: ${currentTime}, Respawn Time: ${respawnTime}, Time Left: ${timeLeft}`);

        if (timeLeft <= 0) {
            clearInterval(activeCountdowns[team][inhibitorNumber]);
            activeCountdowns[team][inhibitorNumber] = null;
            //console.log(`Inhibitor ${inhibitorNumber} for team ${team} has respawned!`);
            // Reset the timer
            inhibitorTimers[team][inhibitorNumber] = null;
        } 
        // else {
        //     if (Math.floor(timeLeft) % 10 === 0 || timeLeft <= 5) { // Log every 10 seconds and the last 5 seconds
        //         console.log(`Inhibitor ${inhibitorNumber} for team ${team} will respawn in ${timeLeft.toFixed(2)} seconds.`);
        //     }
        // }
    }, 1000); // Update every second
}

//get dragon soul
export async function getDragonSoul() {
    const soulType = allGameData.gameData.mapTerrain
    
    return soulType
}

// Calculate dragons taken
export async function getDragon(team) {
    const allPlayers = allGameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers || !allGameData.events || !allGameData.events.Events) {
        console.error('Required game data not found');
        return 0;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team) // Get players on the ORDER team
        .map(player => player.riotIdGameName); // Get their summoner names

    const teamDragon = allGameData.events.Events
        .filter(event => event.EventName === "DragonKill" &&
            teamPlayers.includes(event.KillerName) // Check if killer is on CHAOS team
        )
        .length;
        
    return teamDragon;
}

// Calculate baron taken
export async function getBaron(team) {
    const allPlayers = allGameData.allPlayers; 
    const currentTime = await getGameTimeSeconds();

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team)
        .map(player => player.riotIdGameName); 

    const teamBaron = [...allGameData.events.Events].reverse().find(event => 
        event.EventName === "BaronKill" &&
        (currentTime - event.EventTime <= 180) &&
        teamPlayers.includes(event.KillerName)
    );

    if (!teamBaron) {
        return null; // No Baron kill found
    }

    const aliveCountData = await countAlivePlayers(allGameData.events.Events);
    const alivePlayers = Object.keys(aliveCountData.aliveCount).reduce((acc, teamName) => {
        acc[teamName] = aliveCountData.aliveCount[teamName]; // Store alive count
        return acc;
    }, {});

    const playersWithBaron = allPlayers
        .filter(player => aliveCountData.deathStats[player.riotIdGameName].deaths.every(deathTime => deathTime < teamBaron.EventTime))
        .map(player => player.riotIdGameName);

    // console.log(`Baron killed by ${teamBaron.KillerName} at ${teamBaron.EventTime}. Alive players: ${playersWithBaron.join(', ')}`);
    const eventTime = teamBaron.EventTime;

    return {
        eventTime,
        playersWithBaron,
    };
}

// Calculate Elder taken
export async function getElder(team) {
    const allPlayers = allGameData.allPlayers; 
    const currentTime = await getGameTimeSeconds();

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team)
        .map(player => player.riotIdGameName); 

    const teamElder = [...allGameData.events.Events].reverse().find(event =>
        event.EventName === "DragonKill" && 
        event.DragonType === "Elder" &&
        (currentTime - event.EventTime <= 150) && 
        teamPlayers.includes(event.KillerName)
    );

    if (!teamElder) {
        return null; 
    }

    const aliveCountData = await countAlivePlayers(allGameData.events.Events);
    const alivePlayers = Object.keys(aliveCountData.aliveCount).reduce((acc, teamName) => {
        acc[teamName] = aliveCountData.aliveCount[teamName]; 
        return acc;
    }, {});

    const playersWithElder = allPlayers
        .filter(player => aliveCountData.deathStats[player.riotIdGameName].deaths.every(deathTime => deathTime < teamBaron.EventTime))
        .map(player => player.riotIdGameName);

    // console.log(`Baron killed by ${teamBaron.KillerName} at ${teamElder.EventTime}. Alive players: ${playersWithElder.join(', ')}`);
    const eventTime = teamElder.EventTime;

    return {
        eventTime,
        playersWithElder,
    };
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
    return 0.50; // Cap at 50%
}

export async function calculateDeathTimer(teamOrPlayerName, currentMinutes) {
    const level = await getStats(teamOrPlayerName, "level"); // Retrieve the actual level
    const baseRespawnWait = BRW[level - 1];
    const timeIncreaseFactor = getTimeIncreaseFactor(currentMinutes);
    const deathTimer = baseRespawnWait + (baseRespawnWait * timeIncreaseFactor);

    // console.log(`Player: ${teamOrPlayerName}, Level: ${level}, Minute: ${currentMinutes}, Base Respawn: ${baseRespawnWait}, Factor: ${timeIncreaseFactor}, Death Timer: ${deathTimer}`);
    
    return deathTimer;
}

export async function countAlivePlayers(events) {
    const allPlayers = allGameData.allPlayers;
    const aliveCount = { order: 5, chaos: 5 };
    const playerTeams = {};
    const deathStats = {}; // Track deaths, respawn times, and time spent dead

    allPlayers.forEach(player => {
        const playerName = player.riotIdGameName;
        playerTeams[playerName] = player.team.toLowerCase();

        deathStats[playerName] = {
            deaths: [],
            respawnTimes: [],
            timeSpentDead: 0
        };
    });

    for (const event of events) {
        if (event.EventName === "ChampionKill") {
            const victim = event.VictimName;
            const eventTime = event.EventTime;
            const currentMinutes = eventTime / 60;
            const victimTeam = playerTeams[victim];

            const deathDuration = await calculateDeathTimer(victim, currentMinutes);
            const respawnTime = eventTime + deathDuration;

            // console.log(`${victim} killed at ${currentMinutes.toFixed(2)} minutes - respawning in ${deathDuration.toFixed(2)} seconds`);

            deathStats[victim].deaths.push(eventTime);
            deathStats[victim].respawnTimes.push(respawnTime);
            deathStats[victim].timeSpentDead += deathDuration;

            if (respawnTime > eventTime) {
                aliveCount[victimTeam]--;
            }
        }
    }

    // console.log("Death Stats:", deathStats); // Display death stats for debugging

    return { aliveCount, deathStats };
}


export async function multiKills(team) {
    const allPlayers = allGameData.allPlayers;
    const currentTime = await getGameTimeSeconds(); 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const validTeams = ['ORDER', 'CHAOS'];
    if (!validTeams.includes(team)) {
        console.error('Invalid team specified. Please use "ORDER" or "CHAOS".');
        return;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team)
        .map(player => player.riotIdGameName); 

    const teamMultiKills = [];

    const events = [...allGameData.events.Events].reverse();
    
    for (const event of events) {
        if (event.EventName === "Multikill" && teamPlayers.includes(event.KillerName)) {
            const killer = event.KillerName;
            const eventTime = event.EventTime;
            const killStreak = event.KillStreak;

            teamMultiKills.push({ killer, eventTime, killStreak });
            //console.log(`${team} team multikill by ${killer} at ${eventTime} with a kill streak of ${killStreak}`);
        }
    }

    return teamMultiKills;
}