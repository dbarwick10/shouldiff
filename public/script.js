
// Global variable to cache all game data
let cachedGameData = null;

async function getLiveData() {
    // If cached data exists, return it
    if (cachedGameData) {
        return cachedGameData;
    }
    
    try {
        // Fetch the data from allgamedata.json for testing
        const response = await fetch('/test/allgamedata.json');
        
        //  const response = await fetch("http://127.0.0.1:3000/liveclientdata/allgamedata", {
        //       headers: {
        //         "Content-Type": "application/json",
        //       },
        //   });

        //console.log('asldkjhasdlkf',response)
        if (response.ok) {
            cachedGameData = await response.json(); // Store data in memory
            //console.log('gameData', cachedGameData)
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

    notInGame.innerHTML = `Start a game and refresh this page so you can ff!`; 
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
async function getOrderKills() {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamOrderKills = allPlayers
        .filter(player => player.team === 'ORDER') 
        .reduce((total, player) => total + player.scores.kills, 0); 

    return teamOrderKills;
}

async function getChaosKills() {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamChaosKills = allPlayers
        .filter(player => player.team === 'CHAOS') 
        .reduce((total, player) => total + player.scores.kills, 0); 

    return teamChaosKills;
}

//get levels
async function getOrderLevels() {
    const gameData = await getLiveData();
    const allPlayers = gameData.allPlayers; 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamOrderLevels = allPlayers
        .filter(player => player.team === 'ORDER') 
        .reduce((total, player) => total + player.level, 0); 

    return teamOrderLevels;
}

async function getChaosLevels() {
    const gameData = await getLiveData();
    const allPlayers = gameData.allPlayers; 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamChaosLevels = allPlayers
        .filter(player => player.team === 'CHAOS') 
        .reduce((total, player) => total + player.level, 0); 

    return teamChaosLevels;
}

// Calculate deaths difference
async function getOrderDeaths() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }
    
    const teamOrderDeaths = allPlayers
        .filter(player => player.team === 'ORDER')
        .reduce((total, player) => total + player.scores.deaths, 0);

    return teamOrderDeaths;
}

async function getChaosDeaths() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }
    
    const teamChaosDeaths = allPlayers
        .filter(player => player.team === 'CHAOS')
        .reduce((total, player) => total + player.scores.deaths, 0);

    return teamChaosDeaths;
}

// Calculate assists difference
async function getOrderAssists() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    } 
    
    const teamOrderAssists = allPlayers
        .filter(player => player.team === 'ORDER')
        .reduce((total, player) => total + player.scores.assists, 0);
   
    return teamOrderAssists;
}

async function getChaosAssists() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    } 
    
    const teamChaosAssists = allPlayers
        .filter(player => player.team === 'CHAOS')
        .reduce((total, player) => total + player.scores.assists, 0);
   
    return teamChaosAssists;
}

// Calculate CS difference
async function getOrderCS() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }
    
    const teamOrderCS = allPlayers
        .filter(player => player.team === 'ORDER')
        .reduce((total, player) => total + player.scores.creepScore, 0);

    return teamOrderCS;
}

async function getChaosCS() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }
    
    const teamChaosCS = allPlayers
        .filter(player => player.team === 'CHAOS')
        .reduce((total, player) => total + player.scores.creepScore, 0);

    return teamChaosCS;
}

// Calculate total gold difference
async function getOrderGold() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamOrderGold = allPlayers
        .filter(player => player.team === 'ORDER')
        .reduce((total, player) => total + calculateTotalGold(player), 0);

    return teamOrderGold;
}

async function getChaosGold() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamChaosGold = allPlayers
        .filter(player => player.team === 'CHAOS')
        .reduce((total, player) => total + calculateTotalGold(player), 0);

    return teamChaosGold;
}

// Calculate turrets taken
async function getOrderTurret() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers || !gameData.events || !gameData.events.Events) {
        console.error('Required data not found in game data');
        return;
    }

    const teamOrderPlayers = allPlayers
        .filter(player => player.team === 'ORDER') // Get players on the ORDER team
        .map(player => player.riotIdGameName); // Get their summoner names

    const teamOrderOuterTurret = gameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T2_R_03_A" ||
            event.TurretKilled === "Turret_T2_L_03_A" ||
            event.TurretKilled === "Turret_T2_C_05_A"
            ) &&
            (
            teamOrderPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T100")
            )
        )
        .length;

    const teamOrderInnerTurret = gameData.events.Events
    .filter(event => 
        event.EventName === "TurretKilled" &&
        (
        event.TurretKilled === "Turret_T2_R_02_A" ||
        event.TurretKilled === "Turret_T2_L_02_A" ||
        event.TurretKilled === "Turret_T2_C_04_A"
        ) &&
        (
        teamOrderPlayers.includes(event.KillerName) ||
        event.KillerName.includes("Minion_T100")
        )
    )
    .length;

    const teamOrderInhibTurret = gameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T2_R_01_A" ||
            event.TurretKilled === "Turret_T2_L_01_A" ||
            event.TurretKilled === "Turret_T2_C_03_A"
            ) &&
            (
            teamOrderPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T100")
            )
        )
    .length;

    const teamOrderNexusTurret = gameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T2_C_01_A" ||
            event.TurretKilled === "Turret_T2_C_02_A"
            ) &&
            (
            teamOrderPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T100")
            )
        )
    .length;
 
    return {
        teamOrderOuterTurret,
        teamOrderInnerTurret,
        teamOrderInhibTurret,
        teamOrderNexusTurret,
        total: teamOrderOuterTurret + teamOrderInnerTurret + teamOrderInhibTurret + teamOrderNexusTurret
    };
}

async function getChaosTurret() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers || !gameData.events || !gameData.events.Events) {
        console.error('Required game data not found');
        return 0;
    }

    const teamChaosPlayers = allPlayers
        .filter(player => player.team === 'CHAOS') // Get players on the CHAOS team
        .map(player => player.riotIdGameName); // Get their summoner names

        const teamChaosOuterTurret = gameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T1_R_03_A" ||
            event.TurretKilled === "Turret_T1_L_03_A" ||
            event.TurretKilled === "Turret_T1_C_05_A"
            ) &&
            (
            teamChaosPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T200")
            )
        )
        .length;

    const teamChaosInnerTurret = gameData.events.Events
    .filter(event => 
        event.EventName === "TurretKilled" &&
        (
        event.TurretKilled === "Turret_T1_R_02_A" ||
        event.TurretKilled === "Turret_T1_L_02_A" ||
        event.TurretKilled === "Turret_T1_C_04_A"
        ) &&
        (
        teamChaosPlayers.includes(event.KillerName) ||
        event.KillerName.includes("Minion_T200")
        )
    )
    .length;

    const teamChaosInhibTurret = gameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T1_R_01_A" ||
            event.TurretKilled === "Turret_T1_L_01_A" ||
            event.TurretKilled === "Turret_T1_C_03_A"
            ) &&
            (
            teamChaosPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T200")
            )
        )
    .length;

    const teamChaosNexusTurret = gameData.events.Events
        .filter(event => 
            event.EventName === "TurretKilled" &&
            (
            event.TurretKilled === "Turret_T1_C_01_A" ||
            event.TurretKilled === "Turret_T1_C_02_A"
            ) &&
            (
            teamChaosPlayers.includes(event.KillerName) ||
            event.KillerName.includes("Minion_T200")
            )
        )
    .length;
        
        return {
            teamChaosOuterTurret,
            teamChaosInnerTurret,
            teamChaosInhibTurret,
            teamChaosNexusTurret,
            total: teamChaosOuterTurret + teamChaosInnerTurret + teamChaosInhibTurret + teamChaosNexusTurret
        };
}

//get dragon soul
async function getDragonSoul() {
    const gameTimeData = await getLiveData(); 
    const soulType = gameTimeData.gameData.mapTerrain
    
    return soulType
}

// Calculate dragons taken
async function getOrderDragon() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers || !gameData.events || !gameData.events.Events) {
        console.error('Required game data not found');
        return 0;
    }

    const teamOrderPlayers = allPlayers
        .filter(player => player.team === 'ORDER') // Get players on the ORDER team
        .map(player => player.riotIdGameName); // Get their summoner names

    const teamOrderDragon = gameData.events.Events
        .filter(event => event.EventName === "DragonKill" &&
            teamOrderPlayers.includes(event.KillerName) // Check if killer is on CHAOS team
        )
        .length;
        
    return teamOrderDragon;
}

async function getChaosDragon() {
    const gameData = await getLiveData(); // Assuming this returns the full game data
    const allPlayers = gameData.allPlayers; // Assuming players are in allPlayers array

    if (!allPlayers || !gameData.events || !gameData.events.Events) {
        console.error('Required game data not found');
        return 0;
    }

    const teamChaosPlayers = allPlayers
        .filter(player => player.team === 'CHAOS') // Get players on the CHAOS team
        .map(player => player.riotIdGameName); // Get their summoner names

    const teamChaosDragon = gameData.events.Events
        .filter(event => event.EventName === "DragonKill" &&
            teamChaosPlayers.includes(event.KillerName) // Check if killer is on CHAOS team
        )
        .length;

    return teamChaosDragon;
}

// Calculate baron taken
async function getOrderBaron() {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 
    const currentTime = await getGameTimeSeconds();

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamOrderPlayers = allPlayers
        .filter(player => player.team === 'ORDER')
        .map(player => player.riotIdGameName); 

    // Reverse the events array to search from the most recent event
    const orderBaronEvent = [...gameData.events.Events].reverse().find(event => 
        event.EventName === "BaronKill" &&
        (currentTime - event.EventTime <= 180) &&
        teamOrderPlayers.includes(event.KillerName)
    );
    
    return orderBaronEvent ? orderBaronEvent.EventTime : null;
}



async function getChaosBaron() {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 
    const currentTime = await getGameTimeSeconds();

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamChaosPlayers = allPlayers
        .filter(player => player.team === 'CHAOS')
        .map(player => player.riotIdGameName); 

    // Reverse the events array to search from the most recent event
    const chaosBaronEvent = [...gameData.events.Events].reverse().find(event => 
        event.EventName === "BaronKill" &&
        (currentTime - event.EventTime <= 180) &&
        teamChaosPlayers.includes(event.KillerName)
    );
    //console.log('chaos baron time:', (chaosBaronEvent.EventTime + 180) - chaosBaronEvent.EventTime)

    // If such an event exists, return its EventTime; otherwise, return null
    return chaosBaronEvent ? chaosBaronEvent.EventTime : null;
}


// Calculate Elder taken
async function getOrderElder() {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers;
    const currentTime = await getGameTimeSeconds(); 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamOrderPlayers = allPlayers
        .filter(player => player.team === 'ORDER')
        .map(player => player.riotIdGameName); 

    const teamOrderElder = [...gameData.events.Events].reverse().find(event =>
            event.EventName === "DragonKill" && 
            event.DragonType === "Elder" &&
            (currentTime - event.EventTime <= 150) && 
            teamOrderPlayers.includes(event.KillerName)
        )
    return teamOrderElder ? teamOrderElder.EventTime : null;
}

async function getChaosElder() {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 
    const currentTime = await getGameTimeSeconds();

    if (!allPlayers) {
        console.error('No players found in game data');
        return false; 
    }
    
    const teamChaosPlayers = allPlayers
        .filter(player => player.team === 'CHAOS')
        .map(player => player.riotIdGameName); 

    const teamChaosElder = [...gameData.events.Events].reverse().find(event => 
            event.EventName === "DragonKill" && 
            event.DragonType === "Elder" &&
            (currentTime - event.EventTime <= 150) && 
            teamChaosPlayers.includes(event.KillerName)
        )
    return teamChaosElder ? teamChaosElder.EventTime : null;
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

// Call the function
multiKills();


// Helper function to get data for a given team and data type
async function getTeamData(team, dataType) {
    if (team === 'ORDER') {
        switch (dataType) {
            case 'kills': return await getOrderKills();
            case 'deaths': return await getOrderDeaths();
            case 'assists': return await getOrderAssists();
            case 'cs': return await getOrderCS();
            case 'levels': return await getOrderLevels();
            case 'gold': return await getOrderGold();
            case 'outerTurret': return (await getOrderTurret()).teamOrderOuterTurret;
            case 'innerTurret': return (await getOrderTurret()).teamOrderInnerTurret;
            case 'inhibTurret': return (await getOrderTurret()).teamOrderInhibTurret;
            case 'nexusTurret': return (await getOrderTurret()).teamOrderNexusTurret;
            case 'TotalTurret': return (await getOrderTurret()).total;
            case 'dragon': return await getOrderDragon();
            case 'baron': return await getOrderBaron();
            case 'elder': return await getOrderElder() ? 1 : 0;
            default: return 0;
        }
    } else { // CHAOS team
        switch (dataType) {
            case 'kills': return await getChaosKills();
            case 'deaths': return await getChaosDeaths();
            case 'assists': return await getChaosAssists();
            case 'cs': return await getChaosCS();
            case 'levels': return await getChaosLevels();
            case 'gold': return await getChaosGold();
            case 'outerTurret': return (await getChaosTurret()).teamChaosOuterTurret;
            case 'innerTurret': return (await getChaosTurret()).teamChaosInnerTurret;
            case 'inhibTurret': return (await getChaosTurret()).teamChaosInhibTurret;
            case 'nexusTurret': return (await getChaosTurret()).teamChaosNexusTurret;
            case 'TotalTurret': return (await getChaosTurret()).total;
            case 'dragon': return await getChaosDragon();
            case 'baron': return await getChaosBaron();
            case 'elder': return await getChaosElder() ? 1 : 0;
            default: return 0;
        }
    }
}

// Main function to calculate win probability
async function calculateWinProbability() {
    const activePlayerTeam = await getActivePlayerTeam();
    const opposingTeam = activePlayerTeam === 'ORDER' ? 'CHAOS' : 'ORDER';

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

    // Turret Ratios
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

    // const activeTotalTurret = await getTeamData(activePlayerTeam, 'nexusTurret');
    // const opposingTotalTurret = await getTeamData(opposingTeam, 'nexusTurret');
    // const turretTotalRatio = (activeTotalTurret + opposingTotalTurret) === 0 ? 0 : activeTotalTurret / (activeTotalTurret + opposingTotalTurret);

    // Dragon, Baron, and Elder Buffs
    const activeDragon = await getTeamData(activePlayerTeam, 'dragon');
    const opposingDragon = await getTeamData(opposingTeam, 'dragon');
    const dragonRatio = activeDragon / (activeDragon + opposingDragon || 1);
    const dragonSoul = activeDragon >= 4;

    const baronBuff = await getTeamData(activePlayerTeam, 'baron') ? 1 : 0;
    const elderBuff = await getTeamData(activePlayerTeam, 'elder');

    const gameTime = await getGameTimeSeconds();

    // Weights for each metric
    const weights = {
        kills: 0.5,
        deaths: 0.5,
        assists: 0.2,
        cs: 0.2,
        gold: 0.2,
        outerTurret: 0.025,
        innerTurret: 0.05,
        inhibTurret: 0.1,
        nexusTurret: 0.15,
        time: 0.00005,
        dragon: 0.05,
        dragonSoul: 0.05,
        baron: 0.1,
        elder: 0.1,
        levels: 0.15
    };

    // Calculate weighted score
    const winScore = (
        killsRatio * weights.kills
        + assistsRatio * weights.assists
        - deathsRatio * weights.deaths
        + cSRatio * weights.cs
        + levelsRatio * weights.levels
        + goldRatio * weights.gold
        + turretOuterRatio * weights.outerTurret
        + turretInnerRatio * weights.innerTurret
        + turretInhibRatio * weights.inhibTurret
        + turretNexusRatio * weights.nexusTurret
        + dragonRatio * weights.dragon
        + dragonSoul * weights.dragonSoul
        + baronBuff * weights.baron
        + elderBuff * weights.elder
        //- gameTime * weights.time
    );
    const winProbability = Math.min(1, winScore);
    const opposingTeamProbability = 1 - winProbability;

    // console.log('activeteam:', (activePlayerTeam));
    //     console.log(activePlayerTeam,'killR +:', (killsRatio * weights.kills).toFixed(2));
    //     console.log(activePlayerTeam,'assistR +:', (assistsRatio * weights.assists).toFixed(2));
    //     console.log(activePlayerTeam,'deathR -:', (deathsRatio * weights.deaths).toFixed(2));
    //     console.log(activePlayerTeam,'csR +:', (cSRatio * weights.cs).toFixed(2));
    //     console.log(activePlayerTeam,'lvlR +:', (levelsRatio * weights.levels).toFixed(2));
    //     console.log(activePlayerTeam,'goldR +:', (goldRatio * weights.gold).toFixed(2));
    //     console.log(activePlayerTeam,'outerturrR +:', (turretOuterRatio * weights.outerTurret).toFixed(2));
    //     console.log(activePlayerTeam,'innerturrR +:', (turretInnerRatio * weights.innerTurret).toFixed(2));
    //     console.log(activePlayerTeam,'inhibturrR +:', (turretInhibRatio * weights.inhibTurret).toFixed(2));
    //     console.log(activePlayerTeam,'nexturrR +:', (turretNexusRatio * weights.nexusTurret).toFixed(2));
    //     console.log(activePlayerTeam,'dragR +:', (dragonRatio * weights.dragon).toFixed(2));
    //     console.log(activePlayerTeam,'dsoulR +:', (dragonSoul * weights.dragonSoul).toFixed(2));
    //     console.log(activePlayerTeam,'baronR +:', (baronBuff * weights.baron).toFixed(2));
    //     console.log(activePlayerTeam,'elderR +:', (elderBuff * weights.elder).toFixed(2));
    //     //console.log(activePlayerTeam,'gameTime -:', (gameTime * weights.time).toFixed(2));
    //     console.log(activePlayerTeam,"win prob =", (winProbability).toFixed(2));
    //     console.log(`${activePlayerTeam === 'ORDER' ? 'CHAOS' : 'ORDER'} Opp prob =`, (opposingTeamProbability).toFixed(2));

    //return ((activePlayerTeam === 'ORDER' ? winProbability : opposingTeamProbability) * 100).toFixed(2);
    return (winProbability * 100).toFixed(2);
}

async function shouldForfeit() {
    const winProbability = await calculateWinProbability();
    const gameMode = await getGameMode();
    const gameTime = await getGameTime();
    const gameTimeInSeconds = await getGameTimeSeconds();

    if (gameMode === 'CLASSIC' &&                        //classic summoners rift
        gameTimeInSeconds < 900) {                         //ff at 15
        return `You literaly cannot FF at ${gameTime}. Wait until 15m`
    } else if ((gameMode === 'ULTBOOK' ||                //ultimate spellbook and aram
        gameMode === 'ARAM') &&
        gameTimeInSeconds < 600) {                       //ff at 10
        return `You literaly cannot FF at ${gameTime}. Wait until 10m`
    } else if (gameMode === 'TUTORIAL'){                 //tutorial easter egg
        return "This is a tutorial, please keep practicing so you don't have to surrender more games"
    } else if (winProbability <= 10) {
        return "Go next"
    } else if(winProbability <= 40 && winProbability > 10) {
        return "It will be a struggle, but it's possible"
    } else if (winProbability >= 40 && winProbability < 60) {
        return "It's a close one"
    } else if (winProbability >= 60 && winProbability < 80) {
        return "You're team is looking like it should win"
    } else if (winProbability >= 80 && winProbability < 95) {
        return "You should win, just don't throw"
    } else if (winProbability >= 95) {
        return "For sure winning"
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
    const orderkills = await getOrderKills();
    const chaosKills = await getChaosKills();
    const orderdeaths = await getOrderDeaths();
    const chaosdeaths = await getChaosDeaths();
    const orderAssists = await getOrderAssists();
    const chaosAssists = await getChaosAssists();
    const orderCS = await getOrderCS();
    const chaosCS = await getChaosCS();
    const orderGold = await getOrderGold();
    const chaosGold = await getChaosGold();
    const orderDragon = await getOrderDragon();
    const chaosDragon = await getChaosDragon();
    const dragonSoul = await getDragonSoul();
    const chaosTurret = await (async () => {
        const turretData = await getChaosTurret();
        return turretData.total; 
    })();
    const orderTurret = await (async () => {
        const turretData = await getOrderTurret();
         return turretData.total; 
    })();
    const orderBaronBuff = await getOrderBaron();
    const orderBaronBuffTimer =  `${Math.floor(((orderBaronBuff + baronBuff) - gameTimeInSeconds)/60)}m ${(((orderBaronBuff + baronBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const chaosBaronBuff = await getChaosBaron();
    const chaosBaronBuffTimer =  `${Math.floor(((chaosBaronBuff + baronBuff) - gameTimeInSeconds)/60)}m ${(((chaosBaronBuff + baronBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const orderElderBuff = await getOrderElder();
    const orderElderBuffTimer = `${Math.floor(((orderElderBuff + elderBuff) - gameTimeInSeconds)/60)}m ${(((orderElderBuff + elderBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const chaosElderBuff = await getChaosElder();
    const chaosElderBuffTimer = `${Math.floor(((chaosElderBuff + elderBuff) - gameTimeInSeconds)/60)}m ${(((chaosElderBuff + elderBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const winProbability = await calculateWinProbability();
        //console.log('Calculated Win Probability:', winProbability);
    const ffText = await shouldForfeit();

    const statsHtml = `
    <div class="stats-win-container">
    <div class="stats-container">
        <div class="stat-entry"><p class="team-value">${orderkills}</p><p class="stat-name">Kills</p><p class="team-value">${chaosKills}</p></div>
        <div class="stat-entry"><p class="team-value">${orderdeaths}</p><p class="stat-name">Deaths</p><p class="team-value">${chaosdeaths}</p></div>
        <div class="stat-entry"><p class="team-value">${orderAssists}</p><p class="stat-name">Assists</p><p class="team-value">${chaosAssists}</p></div>
        <div class="stat-entry"><p class="team-value">${orderCS}</p><p class="stat-name">CS</p><p class="team-value">${chaosCS}</p></div>
        <div class="stat-entry"><p class="team-value">${orderGold}</p><p class="stat-name">Gold</p><p class="team-value">${chaosGold}</p></div>
        <div class="stat-entry"><p class="team-value">${orderTurret}</p><p class="stat-name">Turrets</p><p class="team-value">${chaosTurret}</p></div>
        <div class="stat-entry"><p class="team-value">${orderDragon}</p><p class="stat-name">Dragons</p><p class="team-value">${chaosDragon}</p></div>
        <div class="stat-entry"><p class="team-value">${orderDragon > 3 ? dragonSoul : 'No'}</p><p class="stat-name">Dragon Soul</p><p class="team-value">${chaosDragon > 3 ? dragonSoul : 'No'}</p></div>
        <div class="stat-entry"><p class="team-value">${orderBaronBuff ? orderBaronBuffTimer : 'No'}</p><p class="stat-name">Baron Buff</p><p class="team-value">${chaosBaronBuff ? chaosBaronBuffTimer : 'No'}</p></div>
        <div class="stat-entry"><p class="team-value">${orderElderBuff ? orderElderBuffTimer : 'No'}</p><p class="stat-name">Elder Buff</p><p class="team-value">${chaosElderBuff ? chaosElderBuffTimer : 'No'}</p></div>
    </div>
    <div class="win-container">
    <div class="stat-entry"><p class="stat-name">Your team a </p><p class="team-value">${winProbability}%</p> <p class="stat-name">of winning</p></div>
    <div class="should-ff-text">${ffText}</div>
    
    </div>
    </div>
    `;
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

function autoRefresh() {
    let timeoutId;

    clearTimeout(timeoutId); 
    //console.log("Auto-refresh triggered");

    timeoutId = setTimeout(autoRefresh, 1000); 
}

autoRefresh();
