
// Global variable to cache all game data
let cachedGameData = null;
let lastFetchTime = null;
let refreshTime = 100000;
const FETCH_INTERVAL_MS = refreshTime;

async function getLiveData() {
    const currentTime = Date.now();
    
    
    if (cachedGameData && lastFetchTime && (currentTime - lastFetchTime < FETCH_INTERVAL_MS)) {
        
        return cachedGameData; // Return cached data
    }
    try {
        // Fetch the data from allgamedata.json for testing
        const response = await fetch('/test/allgamedata.json');
        
        // const response = await fetch("http://127.0.0.1:3000/liveclientdata/allgamedata", {
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        // });

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

async function notInAGame() {
    const notInGame = document.getElementById('not-in-a-game');
    const parents = document.getElementsByClassName('parent');
    const titles = document.getElementsByClassName('title');

    notInGame.innerHTML = `Start a game and this page will automatically refresh so you can ff asap!`; 
    //<button id="refresh-button" onclick="refreshPage()">Refresh</button>  <--- removed button, using auto refresh

    // Hide each title
    for (let i = 0; i < titles.length; i++) {
        titles[i].style.display = 'none';
    }

    // Hide each parent
    for (let i = 0; i < parents.length; i++) {
        parents[i].style.display = 'none';
    }
}

async function InAGame() {
    const notInGame = document.getElementById('not-in-a-game');
    const parents = document.getElementsByClassName('parent');
    const titles = document.getElementsByClassName('title');

    // Show each title
    for (let i = 0; i < titles.length; i++) {
        titles[i].style.display = 'flex';
    }

    // show each parent
    for (let i = 0; i < parents.length; i++) {
        parents[i].style.display = 'flex';
    }
}

async function getGameMode() {
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

async function getActivePlayerTeam() {
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

// Function to display player stats
function displayTeamStats(teamStats, teamTableId) {
    const teamTable = document.querySelector(`#${teamTableId} tbody`);
    const teamHeader = document.querySelector(`#${teamTableId} thead tr`); // Select the header row of the table
    
    if (!teamTable) {
        console.error(`Element with id #${teamTableId} not found.`);
        return;
    }
    InAGame();
    teamTable.innerHTML = '';  // Clear existing content

    // Calculate totals for the team
    const totalKills = teamStats.reduce((sum, player) => sum + player.kills, 0);
    const totalDeaths = teamStats.reduce((sum, player) => sum + player.deaths, 0);
    const totalAssists = teamStats.reduce((sum, player) => sum + player.assists, 0);
    const totalCS = teamStats.reduce((sum, player) => sum + player.cs, 0);
    const totalGold = teamStats.reduce((sum, player) => sum + player.totalGold, 0);
    const avgLevel = teamStats.reduce((sum, player) => sum + player.level, 0) / 5;
    const activePlayerTeam = getActivePlayerTeam();

    // Update the header with the totals
    if (teamTableId === 'order-list') {
        teamHeader.innerHTML = `
            <th>Blue Team</th>
            <th>Champion</th>
            <th>Level</th>
            <th>K/D/A</th>
            <th>CS</th>
            <th>Item Gold</th>
        `;
    } else if (teamTableId === 'chaos-list') { //<th> ${activePlayerTeam === 'CHAOS' ? 'Blue Team' : 'Red Team'}</th>
        teamHeader.innerHTML = `
            <th>Red Team</th>
            <th>Champion</th>
            <th>Level</th>
            <th>K/D/A</th>
            <th>CS</th>
            <th>Item Gold</th>
        `;
    }

    teamStats.forEach(player => {
        const row = document.createElement('tr');
        
        if (teamTableId === 'order-list') {
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.champion}</td>
                <td>${player.level}</td>
                <td>${player.kills}/${player.deaths}/${player.assists}</td>
                <td>${player.cs}</td>
                <td>${player.totalGold}</td>
            `;
        } else if (teamTableId === 'chaos-list') {
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.champion}</td>
                <td>${player.level}</td>
                <td>${player.kills}/${player.deaths}/${player.assists}</td>
                <td>${player.cs}</td>
                <td>${player.totalGold}</td>
            `;
        }

        teamTable.appendChild(row);  
    });
}

// Fetch and display live game data
async function gameInformation() {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamOrder = allPlayers.filter(player => player.team === 'ORDER');
    const teamChaos = allPlayers.filter(player => player.team === 'CHAOS');

    const teamOrderStats = teamOrder.map(player => ({
        name: player.riotIdGameName,
        champion: player.championName,
        level: player.level,
        kills: player.scores.kills,
        cs: player.scores.creepScore,
        deaths: player.scores.deaths,
        assists: player.scores.assists,
        totalGold: calculateTotalGold(player)
    }));

    const teamChaosStats = teamChaos.map(player => ({
        name: player.riotIdGameName,
        champion: player.championName,
        level: player.level,
        kills: player.scores.kills,
        cs: player.scores.creepScore,
        deaths: player.scores.deaths,
        assists: player.scores.assists,
        totalGold: calculateTotalGold(player)
    }));

    // Display individual player stats
    displayTeamStats(teamOrderStats, 'order-list');
    displayTeamStats(teamChaosStats, 'chaos-list');
    //console.log("Fetched new data:", gameData);
}

function calculateTotalGold(player) {
    const itemsGold = player.items.reduce((acc, item) => {
        const itemPrice = parseFloat(item.price);
        return acc + (isNaN(itemPrice) ? 0 : itemPrice);  //  0 if price is NaN
    }, 0);
    
    const currentGold = parseFloat(player.currentGold);
    
    return Math.floor(itemsGold + (isNaN(currentGold) ? 0 : currentGold));  //  0 if currentGold is NaN
}

//get game time in minutes:seconds and only seconds
async function getGameTime() {
    const gameTimeData = await getLiveData(); 
    const time = gameTimeData.gameData.gameTime
    const minutes = Math.floor(time / 60)
    const seconds = (time % 60).toFixed(0)
    const gameTime = `${minutes}m ${seconds}s`

    return gameTime
}

async function getGameTimeSeconds() {
    const gameTimeData = await getLiveData(); 
    const gameTimeInSeconds = gameTimeData.gameData.gameTime
    
    return gameTimeInSeconds
}

// Calculate kills
async function getKills(team) {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamKills = allPlayers
        .filter(player => player.team === team) 
        .reduce((total, player) => total + player.scores.kills, 0); 

    return teamKills;
}

//get levels
async function getLevels(team) {
    const gameData = await getLiveData();
    const allPlayers = gameData.allPlayers; 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamLevels = allPlayers
        .filter(player => player.team === team) 
        .reduce((total, player) => total + player.level, 0); 

    return teamLevels;
}

// Calculate deaths difference
async function getDeaths(team) {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }
    
    const teamDeaths = allPlayers
        .filter(player => player.team === team)
        .reduce((total, player) => total + player.scores.deaths, 0);

    return teamDeaths;
}

// Calculate assists difference
async function getAssists(team) {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    } 
    
    const teamAssists = allPlayers
        .filter(player => player.team === team)
        .reduce((total, player) => total + player.scores.assists, 0);
   
    return teamAssists;
}

// Calculate CS difference
async function getCS(team) {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }
    
    const teamCS = allPlayers
        .filter(player => player.team === team)
        .reduce((total, player) => total + player.scores.creepScore, 0);

    return teamCS;
}

// Calculate total gold difference
async function getGold(team) {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamGold = allPlayers
        .filter(player => player.team === team)
        .reduce((total, player) => total + calculateTotalGold(player), 0);

    return teamGold;
}

// Calculate turrets taken
async function getTurretsKilled(team, num1, num2) {
    const gameData = await getLiveData();
    const allPlayers = gameData.allPlayers;

    if (!allPlayers || !gameData.events || !gameData.events.Events) {
        console.error('Required data not found in game data');
        return;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team) 
        .map(player => player.riotIdGameName); 

    const outerTurret = gameData.events.Events
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

    const innerTurret = gameData.events.Events
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

    const inhibTurret = gameData.events.Events
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

    const nexusTurret = gameData.events.Events
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

async function getInhibitorsKilled(team, num1, num2) {
    const gameData = await getLiveData();
    const allPlayers = gameData.allPlayers; 
    const currentTime = await getGameTimeSeconds();

    if (!allPlayers || !gameData.events || !gameData.events.Events) {
        console.error('Required data not found in game data');
        return { count: 0, inhibitorNumber: null };
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team)
        .map(player => player.riotIdGameName); 

    let inhibitorNumber = null;

    // Reverse search for the most recent InhibKilled event
    const inhibEvent = [...gameData.events.Events].reverse().find(event =>
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
    gameData.events.Events.forEach(event => {
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


async function startInhibitorRespawnCountdown(team, inhibitorNumber) {
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
async function getDragonSoul() {
    const gameTimeData = await getLiveData(); 
    const soulType = gameTimeData.gameData.mapTerrain
    
    return soulType
}

// Calculate dragons taken
async function getDragon(team) {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers || !gameData.events || !gameData.events.Events) {
        console.error('Required game data not found');
        return 0;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team) // Get players on the ORDER team
        .map(player => player.riotIdGameName); // Get their summoner names

    const teamDragon = gameData.events.Events
        .filter(event => event.EventName === "DragonKill" &&
            teamPlayers.includes(event.KillerName) // Check if killer is on CHAOS team
        )
        .length;
        
    return teamDragon;
}

// Calculate baron taken
async function getBaron(team) {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 
    const currentTime = await getGameTimeSeconds();

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team)
        .map(player => player.riotIdGameName); 

    // Reverse the events array to search from the most recent event
    const teamBaron = [...gameData.events.Events].reverse().find(event => 
        event.EventName === "BaronKill" &&
        (currentTime - event.EventTime <= 180) &&
        teamPlayers.includes(event.KillerName)
    );
    
    return teamBaron ? teamBaron.EventTime : null;
}

// Calculate Elder taken
async function getElder(team) {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers;
    const currentTime = await getGameTimeSeconds(); 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamPlayers = allPlayers
        .filter(player => player.team === team)
        .map(player => player.riotIdGameName); 

    const teamElder = [...gameData.events.Events].reverse().find(event =>
            event.EventName === "DragonKill" && 
            event.DragonType === "Elder" &&
            (currentTime - event.EventTime <= 150) && 
            teamPlayers.includes(event.KillerName)
        )
    return teamElder ? teamElder.EventTime : null;
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

function calculateDeathTimer(level, currentMinutes) {
    const baseRespawnWait = BRW[level - 1];
    const timeIncreaseFactor = getTimeIncreaseFactor(currentMinutes);
    return baseRespawnWait + baseRespawnWait * timeIncreaseFactor;
}

async function countAlivePlayers(events) {
    const gameData = await getLiveData();
    const allPlayers = gameData.allPlayers;
    const currentTime = await getGameTimeSeconds(); // Current game time in seconds
    const playerDeathTimes = {};
    const aliveCount = { order: 5, chaos: 5 }; // Assume full teams initially

    // Map each player to their team and level
    const playerTeams = {};
    allPlayers.forEach(player => {
        playerTeams[player.riotIdGameName] = {
            team: player.team.toLowerCase(), // 'order' or 'chaos'
            level: player.level
        };
    });

    events.forEach(event => {
        if (event.EventName === "ChampionKill") {
            const victim = event.VictimName;
            const killMinute = event.EventTime / 60; // Convert to minutes

            // Get victim's level and team
            const victimInfo = playerTeams[victim];
            const victimLevel = victimInfo.level;
            const victimTeam = victimInfo.team;

            // Calculate death timer
            const deathDuration = calculateDeathTimer(victimLevel, killMinute);
            playerDeathTimes[victim] = event.EventTime + deathDuration;

            // Update team counts based on current time and respawn times
            if (playerDeathTimes[victim] > currentTime) {
                aliveCount[victimTeam]--;
            } else {
                aliveCount[victimTeam]++;
            }
        }
    });
    console.log(aliveCount)
    return aliveCount;
}

// async function pentaKill() {
//     const gameData = await getLiveData(); 
//     const allPlayers = gameData.allPlayers; 
//     const currentTime = await getGameTimeSeconds();
//     const activePlayer = gameData.activePlayer.riotIdGameName;

//     if (!allPlayers) {
//         console.error('No players found in game data');
//         return false; 
//     }
// }

async function multiKills() {
    // Fetch live game data
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 
    const currentTime = await getGameTimeSeconds(); // Ensure this is set correctly
    console.log(`Current Time: ${currentTime}`); // Debugging current time
    const activePlayer = gameData.activePlayer.riotIdGameName; // Get the active player's name
    const events = gameData.events.Events || []; // Adjusting to the new data structure

    // Sort events by EventTime
    events.sort((a, b) => a.EventTime - b.EventTime);

    // Object to track kills by player
    const killTracker = {};

    // Helper function to log kill messages
    function logKillMessage(killer, killType) {
        if (killer === activePlayer) {
            console.log(`${killer} (active player) achieved a ${killType}`);
        } else {
            console.log(`${killer} achieved a ${killType}`);
        }
    }

    // Iterate through events
    events.forEach(event => {
        if (event.EventName !== "ChampionKill") return; // Only process ChampionKill events

        const killer = event.KillerName;
        const time = event.EventTime;

        // Initialize kill tracker for the killer if not present
        if (!killTracker[killer]) {
            killTracker[killer] = [];
        }

        // Add the current kill time
        killTracker[killer].push(time);

        // Log the full kill history for the killer
        console.log(`Kill history for ${killer}:`, killTracker[killer]);

        // Check for multikills
        const recentKills = killTracker[killer].filter(killTime => (currentTime - killTime) <= 10); // 10 seconds

        // Debugging: Log the recent kills array
        console.log(`Recent Kills for ${killer}:`, recentKills);

        // Check for double, triple, quadrakills
        if (recentKills.length === 2) {
            logKillMessage(killer, 'double kill');
        } else if (recentKills.length === 3) {
            logKillMessage(killer, 'triple kill');
        } else if (recentKills.length === 4) {
            logKillMessage(killer, 'quadrakill');
        }

        // Check for pentakills
        if (recentKills.length >= 5) {
            const fourthKillTime = recentKills[3]; // Time of the 4th kill
            const pentakills = killTracker[killer].filter(killTime => (killTime > fourthKillTime) && (killTime <= fourthKillTime + 30)); // 30 seconds
            if (pentakills.length >= 1) {
                logKillMessage(killer, 'pentakill');
            }
        }
    });
}

// // Call the function
// multiKills();


// Helper function to get data for a given team and data type
async function getTeamData(team, dataType) {
    const gameData = await getLiveData();
    const alivePlayers = await countAlivePlayers(gameData.events.Events);
    
    if (team === 'ORDER') {
        switch (dataType) {
            case 'kills': return await getKills('ORDER');
            case 'deaths': return await getDeaths('ORDER');
            case 'assists': return await getAssists('ORDER');
            case 'cs': return await getCS('ORDER');
            case 'levels': return await getLevels('ORDER');
            case 'gold': return await getGold('ORDER');
            case 'outerTurret': return (await getTurretsKilled('ORDER',1,2)).outerTurret;
            case 'innerTurret': return (await getTurretsKilled('ORDER',1,2)).innerTurret;
            case 'inhibTurret': return (await getTurretsKilled('ORDER',1,2)).inhibTurret;
            case 'nexusTurret': return (await getTurretsKilled('ORDER',1,2)).nexusTurret;
            case 'totalTurret': return (await getTurretsKilled('ORDER',1,2)).total;
            case 'inhibitor' :  const { count } = await getInhibitorsKilled('ORDER',1,2); return count;
            case 'dragon': return await getDragon('ORDER');
            case 'baron': return await getBaron('ORDER');
            case 'elder': return await getElder('ORDER') ? 1 : 0;
            case 'playersAlive': return alivePlayers.order;
            default: return 0;
        }
    } else { // CHAOS team
        switch (dataType) {
            case 'kills': return await getKills('CHAOS');
            case 'deaths': return await getDeaths('CHAOS');
            case 'assists': return await getAssists('CHAOS');
            case 'cs': return await getCS('CHAOS');
            case 'levels': return await getLevels('CHAOS');
            case 'gold': return await getGold('CHAOS');
            case 'outerTurret': return (await getTurretsKilled('CHAOS',2,1)).outerTurret;
            case 'innerTurret': return (await getTurretsKilled('CHAOS',2,1)).innerTurret;
            case 'inhibTurret': return (await getTurretsKilled('CHAOS',2,1)).inhibTurret;
            case 'nexusTurret': return (await getTurretsKilled('CHAOS',2,1)).nexusTurret;
            case 'totalTurret': return (await getTurretsKilled('CHAOS',2,1)).total;
            case 'inhibitor' :  const { count } = await getInhibitorsKilled('CHAOS',2,1); return count;
            case 'dragon': return await getDragon('CHAOS');
            case 'baron': return await getBaron('CHAOS');
            case 'elder': return await getElder('CHAOS') ? 1 : 0;
            case 'playersAlive': return alivePlayers.chaos;
            default: return 0;
        }
    }
}

// Main function to calculate win probability
async function calculateWinProbability() {
    const activePlayerTeam = await getActivePlayerTeam();
    const opposingTeam = activePlayerTeam === 'ORDER' ? 'CHAOS' : 'ORDER';

    const activeAlive = await getTeamData(activePlayerTeam, 'playersAlive');
    const opposingAlive = await getTeamData(opposingTeam, 'playersAlive');
    const aliveRatio = activeAlive / (activeAlive + opposingAlive || 1);

    // Ratios for kills, deaths, assists, CS, levels, gold
    const activeKills = await getTeamData(activePlayerTeam, 'kills');
    const opposingKills = await getTeamData(opposingTeam, 'kills');
    const killsRatio = activeKills / (activeKills + opposingKills || 1);

    const activeDeaths = await getTeamData(activePlayerTeam, 'deaths');
    const opposingDeaths = await getTeamData(opposingTeam, 'deaths');
    const deathsRatio = activeDeaths / (activeDeaths + opposingDeaths || 1);

    const activeAssists = await getTeamData(activePlayerTeam, 'assists');
    const opposingAssists = await getTeamData(opposingTeam, 'assists');
    const assistsRatio = activeAssists / (activeAssists + opposingAssists || 1);

    const activeCS = await getTeamData(activePlayerTeam, 'cs');
    const opposingCS = await getTeamData(opposingTeam, 'cs');
    const cSRatio = activeCS / (activeCS + opposingCS || 1);

    const activeLevels = await getTeamData(activePlayerTeam, 'levels');
    const opposingLevels = await getTeamData(opposingTeam, 'levels');
    const levelsRatio = activeLevels / (activeLevels + opposingLevels || 1);

    const activeGold = await getTeamData(activePlayerTeam, 'gold');
    const opposingGold = await getTeamData(opposingTeam, 'gold');
    const goldRatio = activeGold / (activeGold + opposingGold || 1);

    // Turret & inhib Ratios
    const activeOuterTurret = await getTeamData(activePlayerTeam, 'outerTurret');
    const opposingOuterTurret = await getTeamData(opposingTeam, 'outerTurret');
    const turretOuterRatio = (activeOuterTurret + opposingOuterTurret) === 0 ? 0 : activeOuterTurret / (activeOuterTurret + opposingOuterTurret);
    
    const activeInnerTurret = await getTeamData(activePlayerTeam, 'innerTurret');
    const opposingInnerTurret = await getTeamData(opposingTeam, 'innerTurret');
    const turretInnerRatio = (activeInnerTurret + opposingInnerTurret) === 0 ? 0 : activeInnerTurret / (activeInnerTurret + opposingInnerTurret);

    const activeInhibTurret = await getTeamData(activePlayerTeam, 'inhibTurret');
    const opposingInhibTurret = await getTeamData(opposingTeam, 'inhibTurret');
    const turretInhibRatio = (activeInhibTurret + opposingInhibTurret) === 0 ? 0 : activeInhibTurret / (activeInhibTurret + opposingInhibTurret);

    const activeNexusTurret = await getTeamData(activePlayerTeam, 'nexusTurret');
    const opposingNexusTurret = await getTeamData(opposingTeam, 'nexusTurret');
    const turretNexusRatio = (activeNexusTurret + opposingNexusTurret) === 0 ? 0 : activeNexusTurret / (activeNexusTurret + opposingNexusTurret);

    const activeInhibitor = await getTeamData(activePlayerTeam, 'inhibitor');
    const opposingInhibitor = await getTeamData(opposingTeam, 'inhibitor');
    const inhibitorRatio = (activeInhibitor + opposingInhibitor) === 0 ? 0 : activeInhibitor / (activeInhibitor + opposingInhibitor);
    
    // Dragon, Baron, and Elder Buffs
    const activeDragon = await getTeamData(activePlayerTeam, 'dragon');
    const opposingDragon = await getTeamData(opposingTeam, 'dragon');
    const dragonRatio = activeDragon / (activeDragon + opposingDragon || 1);
    const dragonSoul = activeDragon >= 4;

    const baronBuff = await getTeamData(activePlayerTeam, 'baron') ? 1 : 0;
    const elderBuff = await getTeamData(activePlayerTeam, 'elder');

    const gameTime = await getGameTimeSeconds();

    // Weights for each metric (early, mid, late)
    //Early Game
    const earlyGameWeights = {
        kills: 0.3
        ,deaths: 0.3
        ,assists: 0.2
        ,cs: 0.4
        ,gold: 0.4
        ,outerTurret: 0.1
        ,innerTurret: 0.15
        ,inhibTurret: 0.2
        ,nexusTurret: 0.25
        ,dragon: 0.05
        ,dragonSoul: 0.00
        ,baron: 0.00
        ,elder: 0.00
        ,levels: 0.3
        ,players: 0.2
        ,harold: .25
        ,inhibitor: 0.1
    };

    //Mid Game
    const midGameWeights = {
        kills: 0.2
        ,deaths: 0.2
        ,assists: 0.1
        ,cs: 0.3
        ,gold: 0.3
        ,outerTurret: 0.15
        ,innerTurret: 0.2
        ,inhibTurret: 0.25
        ,nexusTurret: 0.3
        ,dragon: 0.1
        ,dragonSoul: 0.2
        ,baron: 0.15
        ,elder: 0.15
        ,levels: 0.2
        ,players: 0.325
        ,harold: .2
        ,inhibitor: .2
    };

    //Late Game
    const lateGameWeights = {
        kills: 0.2
        ,deaths: 0.2
        ,assists: 0.1
        ,cs: 0.2
        ,gold: 0.2
        ,outerTurret: 0.2
        ,innerTurret: 0.25
        ,inhibTurret: 0.3
        ,nexusTurret: 0.35
        ,dragon: 0.2
        ,dragonSoul: 0.4
        ,baron: 0.25
        ,elder: 0.25
        ,levels: 0.1
        ,players: 0.5
        ,harold: .15
        ,inhibitor: .25
    };

    // Calculate weighted score
    // early game
    const earlyWinScore = (
        killsRatio * earlyGameWeights.kills
        + assistsRatio * earlyGameWeights.assists
        - deathsRatio * earlyGameWeights.deaths
        + cSRatio * earlyGameWeights.cs
        + levelsRatio * earlyGameWeights.levels
        + goldRatio * earlyGameWeights.gold
        + turretOuterRatio * earlyGameWeights.outerTurret
        + turretInnerRatio * earlyGameWeights.innerTurret
        + turretInhibRatio * earlyGameWeights.inhibTurret
        + turretNexusRatio * earlyGameWeights.nexusTurret
        + inhibitorRatio * earlyGameWeights.inhibitor
        + dragonRatio * earlyGameWeights.dragon
        + dragonSoul * earlyGameWeights.dragonSoul
        + baronBuff * earlyGameWeights.baron
        + elderBuff * earlyGameWeights.elder
        + aliveRatio * earlyGameWeights.players
    );

    // mid game
    const midWinScore = (
        killsRatio * midGameWeights.kills
        + assistsRatio * midGameWeights.assists
        - deathsRatio * midGameWeights.deaths
        + cSRatio * midGameWeights.cs
        + levelsRatio * midGameWeights.levels
        + goldRatio * midGameWeights.gold
        + turretOuterRatio * midGameWeights.outerTurret
        + turretInnerRatio * midGameWeights.innerTurret
        + turretInhibRatio * midGameWeights.inhibTurret
        + turretNexusRatio * midGameWeights.nexusTurret
        + inhibitorRatio * midGameWeights.inhibitor
        + dragonRatio * midGameWeights.dragon
        + dragonSoul * midGameWeights.dragonSoul
        + baronBuff * midGameWeights.baron
        + elderBuff * midGameWeights.elder
        + aliveRatio * midGameWeights.players
    );

    // late game
    const lateWinScore = (
        killsRatio * lateGameWeights.kills
        + assistsRatio * lateGameWeights.assists
        - deathsRatio * lateGameWeights.deaths
        + cSRatio * lateGameWeights.cs
        + levelsRatio * lateGameWeights.levels
        + goldRatio * lateGameWeights.gold
        + turretOuterRatio * lateGameWeights.outerTurret
        + turretInnerRatio * lateGameWeights.innerTurret
        + turretInhibRatio * lateGameWeights.inhibTurret
        + turretNexusRatio * lateGameWeights.nexusTurret
        + inhibitorRatio * lateGameWeights.inhibitor
        + dragonRatio * lateGameWeights.dragon
        + dragonSoul * lateGameWeights.dragonSoul
        + baronBuff * lateGameWeights.baron
        + elderBuff * lateGameWeights.elder
        + aliveRatio * lateGameWeights.players
    );

        // console.log('activeteam:', (activePlayerTeam));
        // console.log(activePlayerTeam,'killR +:', (killsRatio * midGameWeights.kills).toFixed(2));
        // console.log(activePlayerTeam,'assistR +:', (assistsRatio * midGameWeights.assists).toFixed(2));
        // console.log(activePlayerTeam,'deathR -:', (deathsRatio * midGameWeights.deaths).toFixed(2));
        // console.log(activePlayerTeam,'csR +:', (cSRatio * midGameWeights.cs).toFixed(2));
        // console.log(activePlayerTeam,'lvlR +:', (levelsRatio * midGameWeights.levels).toFixed(2));
        // console.log(activePlayerTeam,'goldR +:', (goldRatio * midGameWeights.gold).toFixed(2));
        // console.log(activePlayerTeam,'outerturrR +:', (turretOuterRatio * midGameWeights.outerTurret).toFixed(2));
        // console.log(activePlayerTeam,'innerturrR +:', (turretInnerRatio * midGameWeights.innerTurret).toFixed(2));
        // console.log(activePlayerTeam,'inhibturrR +:', (turretInhibRatio * midGameWeights.inhibTurret).toFixed(2));
        // console.log(activePlayerTeam,'nexturrR +:', (turretNexusRatio * midGameWeights.nexusTurret).toFixed(2));
        // console.log(activePlayerTeam,'inhibitorR +:', (inhibitorRatio * midGameWeights.inhibitor).toFixed(2));
        // console.log(activePlayerTeam,'dragR +:', (dragonRatio * midGameWeights.dragon).toFixed(2));
        // console.log(activePlayerTeam,'dsoulR +:', (dragonSoul * midGameWeights.dragonSoul).toFixed(2));
        // console.log(activePlayerTeam,'baronR +:', (baronBuff * midGameWeights.baron).toFixed(2));
        // console.log(activePlayerTeam,'elderR +:', (elderBuff * midGameWeights.elder).toFixed(2));
        // console.log(activePlayerTeam,'AliveR +:', (aliveRatio * midGameWeights.players).toFixed(2));
        

    //return ((activePlayerTeam === 'ORDER' ? winProbability : opposingTeamProbability) * 100).toFixed(2);
    if (gameTime < 900) {
        const winProbability = Math.min(1, earlyWinScore);
        const opposingTeamProbability = 1 - winProbability;

        // console.log('Early Game');
        // console.log(`${activePlayerTeam === 'ORDER' ? 'CHAOS' : 'ORDER'} Opp prob =`, (opposingTeamProbability).toFixed(2));
        // console.log(activePlayerTeam,"win prob =", (winProbability).toFixed(2));

        return (winProbability * 100).toFixed(2);
    } else if (gameTime < 1800) {
        const winProbability = Math.min(1, midWinScore);
        const opposingTeamProbability = 1 - winProbability;

        // console.log('Mid Game');
        // console.log(`${activePlayerTeam === 'ORDER' ? 'CHAOS' : 'ORDER'} Opp prob =`, (opposingTeamProbability).toFixed(2));
        // console.log(activePlayerTeam,"win prob =", (winProbability).toFixed(2));

        return (winProbability * 100).toFixed(2);
    } else if (gameTime >= 1800) {
        const winProbability = Math.min(1, lateWinScore);
        const opposingTeamProbability = 1 - winProbability;

        // console.log('Late Game');
        // console.log(`${activePlayerTeam === 'ORDER' ? 'CHAOS' : 'ORDER'} Opp prob =`, (opposingTeamProbability).toFixed(2));
        // console.log(activePlayerTeam,"win prob =", (winProbability).toFixed(2));

        return (winProbability * 100).toFixed(2);
    }
}

async function getGameEnd() {
    const gameData = await getLiveData();
    const gameEnded = [...gameData.events.Events].reverse().find(event =>
        event.EventName === "GameEnd"
    );

    //console.log(gameEnded ? gameEnded.Result : null);
    return gameEnded ? gameEnded.Result : null;

}

async function shouldForfeit() {
    const winProbability = await calculateWinProbability();
    const gameMode = await getGameMode();
    const gameTime = await getGameTime();
    const gameResult = await getGameEnd();
    const gameTimeInSeconds = await getGameTimeSeconds();

    if (gameMode === 'CLASSIC' &&                        //classic summoners rift
        gameTimeInSeconds < 900) {                         //ff at 15
        return `You literaly cannot FF at ${gameTime}. Wait until 15m`
    } else if ((gameMode === 'ULTBOOK' ||                //ultimate spellbook and aram
        gameMode === 'ARAM') &&
        gameTimeInSeconds < 600) {                       //ff at 10
        return `You literaly cannot FF at ${gameTime}. Wait until 10m`
    } else if (gameResult === 'Lose') {
        return "Game Over: You Lost."
    } else if (gameResult === 'Win') {
        return "Game Over: You Won!"
    }   else if ((gameMode === 'TUTORIAL' ||
        gameMode === 'PRACTICETOOL')
    ){                 //tutorial & practice tool easter egg
        return "This is a tutorial, please keep practicing so you don't have to surrender more games"
    } else if (winProbability <= 10) {
        return "Go next"
    } else if(winProbability <= 40 && winProbability > 10) {
        return `It will be a struggle with a win probability at ${winProbability}%, but it's possible`
    } else if (winProbability >= 40 && winProbability < 60) {
        return "It's a close one"
    } else if (winProbability >= 60 && winProbability < 80) {
        return "You're team is looking like it should win"
    } else if (winProbability >= 80 && winProbability < 95) {
        return "You should win, just don't throw"
    } else if (winProbability >= 95) {
        return `Your victory is near with a <strong>${winProbability}%</strong> chance of winning. Just don't throw.`
    } 
}

async function analysis() {
    
}

// Update all stats differences, including win probability, and display in the DOM
async function updateAllStatsInDOM() {
    const baronBuff = 180
    const elderBuff = 150
    const activePlayerTeam = await getActivePlayerTeam();
    const gameTime = await getGameTime();
    const gameTimeInSeconds = await getGameTimeSeconds();
    //console.log('gametimeseconds:',gameTimeInSeconds);
    const orderkills = await getKills('ORDER');
    const chaosKills = await getKills('CHAOS');
    const orderdeaths = await getDeaths('ORDER');
    const chaosdeaths = await getDeaths('CHAOS');
    const orderAssists = await getAssists('ORDER');
    const chaosAssists = await getAssists('CHAOS');
    const orderCS = await getCS('ORDER');
    const chaosCS = await getCS('CHAOS');
    const orderGold = await getGold('ORDER');
    const chaosGold = await getGold('CHAOS');
    const orderDragon = await getDragon('ORDER');
    const chaosDragon = await getDragon('CHAOS');
    const dragonSoul = await getDragonSoul();
    const orderTurret = await (async () => {
        const turretData = await getTurretsKilled('ORDER',1,2);
        return turretData.total; 
    })();
    const chaosTurret = await (async () => {
        const turretData = await getTurretsKilled('CHAOS',2,1);
         return turretData.total; 
    })();
    const { count: orderInhibitor } = await getInhibitorsKilled('ORDER',1,2);
    const { count: chaosInhibitor } = await getInhibitorsKilled('CHAOS',2,1);

    const orderBaronBuff = await getBaron('ORDER');
    const orderBaronBuffTimer =  `${Math.floor(((orderBaronBuff + baronBuff) - gameTimeInSeconds)/60)}m ${(((orderBaronBuff + baronBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const chaosBaronBuff = await getBaron('CHAOS');
    const chaosBaronBuffTimer =  `${Math.floor(((chaosBaronBuff + baronBuff) - gameTimeInSeconds)/60)}m ${(((chaosBaronBuff + baronBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const orderElderBuff = await getElder('ORDER');
    const orderElderBuffTimer = `${Math.floor(((orderElderBuff + elderBuff) - gameTimeInSeconds)/60)}m ${(((orderElderBuff + elderBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const chaosElderBuff = await getElder('CHAOS');
    const chaosElderBuffTimer = `${Math.floor(((chaosElderBuff + elderBuff) - gameTimeInSeconds)/60)}m ${(((chaosElderBuff + elderBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const winProbability = await calculateWinProbability();
        //console.log('Calculated Win Probability:', winProbability);
    const ffText = await shouldForfeit();
    const dragonSoulHTML = 
    orderDragon > 3 || chaosDragon > 3 
        ? `<div class="stat-entry">
            <p class="team-value">${orderDragon > 3 ? dragonSoul : '-'}</p>
            <p class="stat-name">Dragon Soul</p>
            <p class="team-value">${chaosDragon > 3 ? dragonSoul : '-'}</p>
        </div>`
        : '';
    const baronHTML =
    orderBaronBuff || chaosBaronBuff
        ? `<div class="stat-entry">
            <p class="team-value">${orderBaronBuff ? orderBaronBuffTimer : '-'}</p>
            <p class="stat-name">Baron Buff</p>
            <p class="team-value">${chaosBaronBuff ? chaosBaronBuffTimer : '-'}</p>
          </div>`
        : '';
    const elderBuffHTML =
    orderElderBuff || chaosElderBuff
        ?  `<div class="stat-entry">
            <p class="team-value">${orderElderBuff ? orderElderBuffTimer : '-'}</p>
            <p class="stat-name">Elder Buff</p>
            <p class="team-value">${chaosElderBuff ? chaosElderBuffTimer : '-'}</p>
          </div>`
        : '';



    const statsHtml = `
    <div class="middle-container">
        <div class="stats-win-container">
            <div class="stats-container">
                <div class="stat-entry"><p class="team-value">${orderkills}</p><p class="stat-name">Kills</p><p class="team-value">${chaosKills}</p></div>
                <div class="stat-entry"><p class="team-value">${orderdeaths}</p><p class="stat-name">Deaths</p><p class="team-value">${chaosdeaths}</p></div>
                <div class="stat-entry"><p class="team-value">${orderAssists}</p><p class="stat-name">Assists</p><p class="team-value">${chaosAssists}</p></div>
                <div class="stat-entry"><p class="team-value">${orderCS}</p><p class="stat-name">CS</p><p class="team-value">${chaosCS}</p></div>
                <div class="stat-entry"><p class="team-value">${orderGold}</p><p class="stat-name">Gold</p><p class="team-value">${chaosGold}</p></div>
                <div class="stat-entry"><p class="team-value">${orderTurret}</p><p class="stat-name">Turrets</p><p class="team-value">${chaosTurret}</p></div>
                <div class="stat-entry"><p class="team-value">${orderInhibitor}</p><p class="stat-name">Inhibitors</p><p class="team-value">${chaosInhibitor}</p></div>        
                <div class="stat-entry"><p class="team-value">${orderDragon}</p><p class="stat-name">Dragons</p><p class="team-value">${chaosDragon}</p></div>
                ${dragonSoulHTML}
                ${baronHTML}
                ${elderBuffHTML}
            </div>
            <div class="chart-container">
                <p>WIN PROBABILITY CHART PLACEHOLDER</p>
            </div>
        </div>
        <div class="probability-container">
                <div class="should-ff-text">${ffText}</div>
        </div> 
    </div>
    `;
    //<div class="stat-entry"><p class="stat-name">Your team has a </p><p class="team-value">${winProbability}%</p> <p class="stat-name">of winning</p></div>

    //<button id="refresh-button" onclick="refreshPage()">Refresh</button>  <--- removed button, using auto refresh
updateTeamStatsInDOM(statsHtml);


}

// Function to display data in the DOM
function updateTeamStatsInDOM(statsHtml) {
    const statsElement = document.getElementById('compare-team-stats');
    if (statsElement) {
        statsElement.innerHTML = statsHtml;
    } else {
        console.error('Element with ID "compare-team-stats" not found.');
    }
}


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