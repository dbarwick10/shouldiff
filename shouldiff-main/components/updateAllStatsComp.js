import { getStats
    ,getBaron
    ,getDragon
    ,getDragonSoul
    ,getElder
    ,getGameMode
    ,getGameTime
    ,getGameTimeSeconds
    ,getGold
    ,getInhibitorsKilled
    ,getTurretsKilled
    ,getActivePlayerTeam
 } from "../features/liveGameStats.js";
import { shouldForfeit } from "../features/winProbability.js";
import { calculateWinProbability } from "../features/winProbability.js";
import { getLiveData } from "../services/liveDataServices.js";

export async function notInAGame() {
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

export async function updateAllStatsInDOM() {
    const baronBuff = 180
    const elderBuff = 150
    const activePlayerTeam = await getActivePlayerTeam();
    const gameTime = await getGameTime();
    const gameTimeInSeconds = await getGameTimeSeconds();
    //console.log('gametimeseconds:',gameTimeInSeconds);
    const orderkills = await (getStats('ORDER','kills'));
    const chaosKills = await (getStats('CHAOS','kills'));
    const orderdeaths = await (getStats('ORDER','deaths'));
    const chaosdeaths = await (getStats('CHAOS','deaths'));
    const orderAssists = await (getStats('ORDER','assists'));
    const chaosAssists = await (getStats('CHAOS','assists'));
    const orderCS = await (getStats('ORDER','creepScore'));
    const chaosCS = await (getStats('CHAOS','creepScore'));
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

    const orderBaronBuff = await getBaron('ORDER') === null ? '' : await getBaron('ORDER');
    const orderBaronBuffTimer =  `${Math.floor(((orderBaronBuff.eventTime + baronBuff) - gameTimeInSeconds)/60)}m ${(((orderBaronBuff.eventTime + baronBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const chaosBaronBuff = await getBaron('CHAOS')=== null ? '' : await getBaron('CHAOS');;
    const chaosBaronBuffTimer =  `${Math.floor(((chaosBaronBuff.eventTime + baronBuff) - gameTimeInSeconds)/60)}m ${(((chaosBaronBuff.eventTime + baronBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const orderElderBuff = await getElder('ORDER') === null ? '' : await getElder('ORDER');
    const orderElderBuffTimer = `${Math.floor(((orderElderBuff + elderBuff) - gameTimeInSeconds)/60)}m ${(((orderElderBuff + elderBuff) - gameTimeInSeconds) % 60).toFixed(0)}s`;
    const chaosElderBuff = await getElder('CHAOS') === null ? '' : await getElder('CHAOS');
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


    // removed CS
    const statsHtml = `
    <div class="middle-container">
        <div class="stats-win-container">
            <div class="stats-container">
                <div class="stat-entry"><p class="team-value">${orderkills}</p><p class="stat-name">Kills</p><p class="team-value">${chaosKills}</p></div>
                <div class="stat-entry"><p class="team-value">${orderdeaths}</p><p class="stat-name">Deaths</p><p class="team-value">${chaosdeaths}</p></div>
                <div class="stat-entry"><p class="team-value">${orderAssists}</p><p class="stat-name">Assists</p><p class="team-value">${chaosAssists}</p></div>
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

updateTeamStatsInDOM(statsHtml);

//ttrying this
}

// Function to display data in the DOM
export function updateTeamStatsInDOM(statsHtml) {
    const statsElement = document.getElementById('compare-team-stats');
    if (statsElement) {
        // console.log('updating team stats in dom')
        statsElement.innerHTML = statsHtml;
    } else {
        console.error('Element with ID "compare-team-stats" not found.');
    }
}

export function displayTeamStats(teamStats, teamTableId) {
    const teamTable = document.querySelector(`#${teamTableId} tbody`);
    const teamHeader = document.querySelector(`#${teamTableId} thead tr`); // Select the header row of the table
    
    if (!teamTable) {
        console.error(`Element with id #${teamTableId} not found.`);
        return;
    }
    //InAGame();
    teamTable.innerHTML = '';  // Clear existing content

    // Calculate totals for the team
    const totalKills = teamStats.reduce((sum, player) => sum + player.kills, 0);
    const totalDeaths = teamStats.reduce((sum, player) => sum + player.deaths, 0);
    const totalAssists = teamStats.reduce((sum, player) => sum + player.assists, 0);
    const totalCS = teamStats.reduce((sum, player) => sum + player.cs, 0);
    const totalGold = teamStats.reduce((sum, player) => sum + player.totalGold, 0);
    const avgLevel = teamStats.reduce((sum, player) => sum + player.level, 0) / 5;
    const activePlayerTeam = getActivePlayerTeam();

    // Update the header with the totals  removed CS
    if (teamTableId === 'order-list') {
        teamHeader.innerHTML = `
            <th>Blue Team</th>
            <th>Champion</th>
            <th>Level</th>
            <th>K/D/A</th>
            <th>Item Gold</th>
        `;
    } else if (teamTableId === 'chaos-list') { //<th> ${activePlayerTeam === 'CHAOS' ? 'Blue Team' : 'Red Team'}</th>
        teamHeader.innerHTML = `
            <th>Red Team</th>
            <th>Champion</th>
            <th>Level</th>
            <th>K/D/A</th>
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
                <td>${player.totalGold}</td>
            `;
            // console.log('order-list populating');
        } else if (teamTableId === 'chaos-list') {
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.champion}</td>
                <td>${player.level}</td>
                <td>${player.kills}/${player.deaths}/${player.assists}</td>
                <td>${player.totalGold}</td>
            `;
            // console.log('chaos-list populating');
        }

        teamTable.appendChild(row);  
    });
    
}

// Fetch and display live game data
export async function gameInformation() {
    const gameData = await getLiveData(); 
    const allPlayers = gameData.allPlayers; 

    if (!allPlayers) {
        console.error('No players found in game data');
        return;
    }

    const teamOrder = allPlayers.filter(player => player.team === 'ORDER');
    const teamChaos = allPlayers.filter(player => player.team === 'CHAOS');

    const teamOrderStats = await Promise.all(teamOrder.map(async (player) => {
        const totalGold = await getGold(player.riotIdGameName); // Get total gold for the specific player
        return {
            name: player.riotIdGameName,
            champion: player.championName,
            level: player.level,
            kills: player.scores.kills,
            cs: player.scores.creepScore,
            deaths: player.scores.deaths,
            assists: player.scores.assists,
            totalGold: totalGold // Assign the fetched total gold
        };
    }));

    const teamChaosStats = await Promise.all(teamChaos.map(async (player) => {
        const totalGold = await getGold(player.riotIdGameName); // Get total gold for the specific player
        return {
            name: player.riotIdGameName,
            champion: player.championName,
            level: player.level,
            kills: player.scores.kills,
            cs: player.scores.creepScore,
            deaths: player.scores.deaths,
            assists: player.scores.assists,
            totalGold: totalGold // Assign the fetched total gold
        };
    }));

    // Display individual player stats
    displayTeamStats(teamOrderStats, 'order-list');
    displayTeamStats(teamChaosStats, 'chaos-list');
    // console.log("Fetched new data:");
}