// Main fetch functions
async function getPuuid() {
    const summonerName = document.getElementById('summonerName').value;
    const tagline = document.getElementById('tagLine').value;
    const region = document.getElementById('region').value;

    if (!summonerName) {
        alert('Please enter a summoner name');
        return;
    }

    try {
        const tag = tagline.replace(/[^a-zA-Z0-9 ]/g, "");
        const puuidResponse = await fetch(`http://localhost:3000/api/puuid?summonerName=${encodeURIComponent(summonerName)}&region=${encodeURIComponent(region)}&tagline=${encodeURIComponent(tag)}`);
        
        if (!puuidResponse.ok) {
            const errorDetail = await puuidResponse.text();
            throw new Error(`Failed to fetch PUUID: ${errorDetail}`);
        }

        const puuidData = await puuidResponse.json();
        return puuidData.puuid;
    } catch (error) {
        console.error('Error fetching PUUID:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching PUUID: ${error.message}</p>`;
        return null;
    }
}

async function fetchMatchStats() {
    try {
        const region = document.getElementById('region').value;
        const puuid = await getPuuid();

        if (!puuid) {
            console.error('No PUUID received');
            return;
        }

        document.getElementById('output').innerHTML = '<p>Loading match stats...</p>';

        const response = await fetch(`http://localhost:3000/api/match-stats?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch match stats: ${errorText}`);
        }

        const matchStats = await response.json();
        
        const analysis = analyzeSurrenderDecision(matchStats, puuid);
        displayAnalysis(analysis);
        window.lastAnalysis = analysis;
        
    } catch (error) {
        console.error('Error fetching match stats:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching match stats: ${error.message}</p>`;
    }
}

// Function to analyze and calculate surrender decision and statistics
function analyzeSurrenderDecision(matchStats, puuid) {
    const gamesData = matchStats.map(match => {
        const activePlayer = match.participants.find(player => player.puuid === puuid);
        const playerTeam = match.participants.filter(player => player.teamId === activePlayer.teamId);
        const enemyTeam = match.participants.filter(player => player.teamId !== activePlayer.teamId);
        
        return {
            outcome: activePlayer.win ? "win" : "loss",
            surrender: match.gameEndedInSurrender,
            activePlayer: {
                kda: (activePlayer.kills + activePlayer.assists) / Math.max(1, activePlayer.deaths),
                level: activePlayer.champLevel,
                itemGold: activePlayer.goldEarned,
                timeSpentDead: activePlayer.totalTimeSpentDead,
                turretsKilled: activePlayer.turretKills,
                inhibitorsKilled: activePlayer.inhibitorKills,
                dragonsKilled: activePlayer.dragonKills || 0, // New field
                baronsKilled: activePlayer.baronKills || 0,   // New field
                eldersKilled: activePlayer.elderKills || 0,   // New field
                dragonSoul: activePlayer.dragonSoul || false  // New field
            },
            playerTeam: aggregateTeamStats(playerTeam),
            enemyTeam: aggregateTeamStats(enemyTeam)
        };
    });

    return calculateAverages(gamesData);
}

// Helper function to aggregate team stats, including new fields
function aggregateTeamStats(team) {
    return team.reduce((acc, player) => {
        acc.kda += (player.kills + player.assists) / Math.max(1, player.deaths);
        acc.level += player.champLevel;
        acc.itemGold += player.goldEarned;
        acc.timeSpentDead += player.totalTimeSpentDead;
        acc.turretsKilled += player.turretKills;
        acc.inhibitorsKilled += player.inhibitorKills;
        acc.dragonsKilled += player.dragonKills || 0;  // New field
        acc.baronsKilled += player.baronKills || 0;    // New field
        acc.eldersKilled += player.elderKills || 0;    // New field
        acc.dragonSoul = acc.dragonSoul || player.dragonSoul; // Track if any player has soul
        return acc;
    }, { kda: 0, level: 0, itemGold: 0, timeSpentDead: 0, turretsKilled: 0, inhibitorsKilled: 0, dragonsKilled: 0, baronsKilled: 0, eldersKilled: 0, dragonSoul: false });
}

// Function to calculate averages for each category
function calculateAverages(gamesData) {
    const averages = {
        overall: { activePlayer: {}, playerTeam: {}, enemyTeam: {} },
        win: { activePlayer: {}, playerTeam: {}, enemyTeam: {} },
        loss: { activePlayer: {}, playerTeam: {}, enemyTeam: {} },
        surrenderWin: { activePlayer: {}, playerTeam: {}, enemyTeam: {} },
        surrenderLoss: { activePlayer: {}, playerTeam: {}, enemyTeam: {} }
    };

    const count = { total: 0, win: 0, loss: 0, surrenderWin: 0, surrenderLoss: 0 };

    gamesData.forEach(game => {
        const category = game.outcome === "win" 
            ? (game.surrender ? 'surrenderWin' : 'win')
            : (game.surrender ? 'surrenderLoss' : 'loss');
        
        count.total++;
        count[category]++;
        
        ["activePlayer", "playerTeam", "enemyTeam"].forEach(perspective => {
            Object.keys(game[perspective]).forEach(stat => {
                averages.overall[perspective][stat] = (averages.overall[perspective][stat] || 0) + game[perspective][stat];
                averages[category][perspective][stat] = (averages[category][perspective][stat] || 0) + game[perspective][stat];
            });
        });
    });

    ["overall", "win", "loss", "surrenderWin", "surrenderLoss"].forEach(category => {
        ["activePlayer", "playerTeam", "enemyTeam"].forEach(perspective => {
            Object.keys(averages[category][perspective]).forEach(stat => {
                averages[category][perspective][stat] /= count[category === 'overall' ? 'total' : category];
            });
        });
    });

    return averages;
}

// Function to display the analysis
function displayAnalysis(averages) {
    document.getElementById('output').innerHTML = `
        <h3>Statistics for Active Player, Player Team, and Enemy Team:</h3>
        <pre>${JSON.stringify(averages, null, 2)}</pre>
    `;
}
