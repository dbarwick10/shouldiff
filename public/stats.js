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
        //console.log('PUUID received:', puuidData.puuid);
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

        //console.log('Fetching match stats for PUUID:', puuid);
        document.getElementById('output').innerHTML = '<p>Loading match stats...</p>';

        const response = await fetch(`http://localhost:3000/api/match-stats?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch match stats: ${errorText}`);
        }

        const matchStats = await response.json();
        //console.log(`Received ${matchStats.length} matches`);
        
        const analysis = analyzeSurrenderDecision(matchStats, puuid);
        displayAnalysis(analysis);
        
        window.lastAnalysis = analysis;
        
    } catch (error) {
        console.error('Error fetching match stats:', error);
        document.getElementById('output').innerHTML = `<p>Error fetching match stats: ${error.message}</p>`;
    }
}

// Analysis functions
function analyzeSurrenderDecision(matchStats, puuid) {
    const playerStats = {
        kills: 0,
        deaths: 0,
        assists: 0,
        level: 0,
        itemGold: 0,
        wins: 0,
        losses: 0,
        surrenders: 0,
        totalGames: matchStats.length,
        visionScore: 0,
        objectiveDamage: 0,
        turretDamage: 0,
        damageToChampions: 0,
        creepScore: 0,
        earlyGameLeads: 0,
        comebackWins: 0
    };

    const teamStats = {
        kills: 0,
        deaths: 0,
        assists: 0,
        level: 0,
        itemGold: 0,
        wins: 0,
        losses: 0,
        surrenders: 0,
        totalGames: matchStats.length,
        dragonKills: 0,
        baronKills: 0,
        turretKills: 0,
        inhibitorKills: 0,
        comebackWins: 0
    };

    matchStats.forEach(match => {
        const player = match.info.participants.find(p => p.puuid === puuid);
        if (!player) return;

        updatePlayerStats(player, playerStats);

        const playerTeam = match.info.participants.filter(p => p.teamId === player.teamId);
        const enemyTeam = match.info.participants.filter(p => p.teamId !== player.teamId);
        updateTeamStats(playerTeam, enemyTeam, match, teamStats, player.teamId);

        trackGameProgression(match, player, playerStats, teamStats);
    });

    return calculateSurrenderRecommendation(playerStats, teamStats);
}

function updatePlayerStats(player, stats) {
    stats.kills += player.kills;
    stats.deaths += player.deaths;
    stats.assists += player.assists;
    stats.level += player.champLevel;
    stats.itemGold += player.goldSpent;
    stats.wins += player.win ? 1 : 0;
    stats.losses += !player.win ? 1 : 0;
    stats.visionScore += player.visionScore;
    stats.objectiveDamage += player.damageDealtToObjectives;
    stats.turretDamage += player.damageDealtToTurrets;
    stats.damageToChampions += player.totalDamageDealtToChampions;
    stats.creepScore += player.totalMinionsKilled + player.neutralMinionsKilled;
}

function updateTeamStats(playerTeam, enemyTeam, match, stats, teamId) {
    playerTeam.forEach(teammate => {
        stats.kills += teammate.kills;
        stats.deaths += teammate.deaths;
        stats.assists += teammate.assists;
        stats.level += teammate.champLevel;
        stats.itemGold += teammate.goldSpent;
    });

    enemyTeam.forEach(teammate => {
        stats.kills += teammate.kills;
        stats.deaths += teammate.deaths;
        stats.assists += teammate.assists;
        stats.level += teammate.champLevel;
        stats.itemGold += teammate.goldSpent;
    });

    const team = match.info.teams.find(t => t.teamId === teamId);
    if (team) {
        stats.wins += team.win ? 1 : 0;
        stats.losses += !team.win ? 1 : 0;
        stats.gameEndedInSurrender += team.win ? 1 : 0;
        stats.dragonKills += team.objectives.dragon.kills;
        stats.baronKills += team.objectives.baron.kills;
        stats.turretKills += team.objectives.tower.kills;
        stats.inhibitorKills += team.objectives.inhibitor.kills;
    }
}

function trackGameProgression(match, player, playerStats, teamStats) {
    const playerTeamGold15 = match.info.participants
        .filter(p => p.teamId === player.teamId)
        .reduce((sum, p) => sum + p.goldAt15, 0);
    
    const enemyTeamGold15 = match.info.participants
        .filter(p => p.teamId !== player.teamId)
        .reduce((sum, p) => sum + p.goldAt15, 0);

    const hadEarlyLead = playerTeamGold15 > enemyTeamGold15;
    
    if (hadEarlyLead) {
        playerStats.earlyGameLeads++;
    } else if (player.win) {
        playerStats.comebackWins++;
        teamStats.comebackWins++;
    }
}

function calculateSurrenderRecommendation(playerStats, teamStats) {
    const metrics = {
        playerPerformance: calculatePlayerPerformanceScore(playerStats),
        teamPerformance: calculateTeamPerformanceScore(teamStats),
        comebackPotential: calculateComebackPotential(playerStats, teamStats),
        scalingFactor: calculateScalingFactor(playerStats)
    };

    const surrenderScore = calculateSurrenderScore(metrics);
    
    return {
        metrics,
        surrenderScore,
        recommendation: generateRecommendation(surrenderScore),
        stats: {
            player: playerStats,
            team: teamStats
        }
    };
}

function calculatePlayerPerformanceScore(stats) {
    const kda = (stats.kills + stats.assists) / (stats.deaths || 1);
    const avgGold = stats.itemGold / stats.totalGames;
    const avgVision = stats.visionScore / stats.totalGames;
    const avgCS = stats.creepScore / stats.totalGames;
    
    return (kda * 0.3) + 
           (avgGold / 15000 * 0.3) + 
           (avgVision / 50 * 0.2) + 
           (avgCS / 200 * 0.2);
}

function calculateTeamPerformanceScore(stats) {
    const winRate = stats.wins / stats.totalGames;
    const objectiveControl = (stats.dragonKills + stats.baronKills * 2) / (stats.totalGames * 5);
    const teamKDA = (stats.kills + stats.assists) / (stats.deaths || 1);
    
    return (winRate * 0.4) + 
           (objectiveControl * 0.3) + 
           (Math.min(teamKDA / 3, 1) * 0.3);
}

function calculateComebackPotential(playerStats, teamStats) {
    const comebackRate = teamStats.comebackWins / (teamStats.losses || 1);
    const lateGameScore = playerStats.damageToChampions / (playerStats.totalGames * 25000);
    
    return (comebackRate * 0.6) + (lateGameScore * 0.4);
}

function calculateScalingFactor(stats) {
    const avgLevel = stats.level / stats.totalGames;
    return Math.min(avgLevel / 18, 1);
}

function calculateSurrenderScore(metrics) {
    return (metrics.playerPerformance * 0.3) +
           (metrics.teamPerformance * 0.3) +
           (metrics.comebackPotential * 0.25) +
           (metrics.scalingFactor * 0.15);
}

function generateRecommendation(score) {
    if (score >= 0.7) {
        return {
            decision: "DON'T SURRENDER",
            confidence: "High",
            reason: "Strong performance metrics indicate high chance of winning"
        };
    } else if (score >= 0.5) {
        return {
            decision: "DON'T SURRENDER",
            confidence: "Medium",
            reason: "Decent metrics and comeback potential detected"
        };
    } else if (score >= 0.3) {
        return {
            decision: "CONSIDER SURRENDER",
            confidence: "Medium",
            reason: "Below average performance metrics and low comeback potential"
        };
    } else {
        return {
            decision: "SURRENDER RECOMMENDED",
            confidence: "High",
            reason: "Poor performance metrics across all categories"
        };
    }
}

function displayAnalysis(analysis) {
    const output = document.getElementById('output');
    const { stats, metrics, recommendation } = analysis;
    
    output.innerHTML = `
        <div class="analysis-container">
            <div class="recommendation-section">
                <h2>Surrender Analysis</h2>
                <div class="recommendation ${recommendation.decision.toLowerCase().replace(' ', '-')}">
                    <h3>${recommendation.decision}</h3>
                    <p>Confidence: ${recommendation.confidence}</p>
                    <p>Reason: ${recommendation.reason}</p>
                </div>
                
                <div class="metrics-breakdown">
                    <h3>Analysis Metrics</h3>
                    <p>Player Performance: ${(metrics.playerPerformance * 100).toFixed(1)}%</p>
                    <p>Team Performance: ${(metrics.teamPerformance * 100).toFixed(1)}%</p>
                    <p>Comeback Potential: ${(metrics.comebackPotential * 100).toFixed(1)}%</p>
                    <p>Scaling Factor: ${(metrics.scalingFactor * 100).toFixed(1)}%</p>
                </div>
            </div>

            <div class="stats-section">
                <h2>Player Performance (Last ${stats.player.totalGames} Games)</h2>
                <p>KDA: ${stats.player.kills}/${stats.player.deaths}/${stats.player.assists} 
                   (${((stats.player.kills + stats.player.assists) / Math.max(stats.player.deaths, 1)).toFixed(2)} ratio)</p>
                <p>Average Level: ${(stats.player.level / stats.player.totalGames).toFixed(1)}</p>
                <p>Average Gold: ${Math.floor(stats.player.itemGold / stats.player.totalGames).toLocaleString()}</p>
                <p>Win Rate: ${((stats.player.wins / stats.player.totalGames) * 100).toFixed(1)}% 
                   (${stats.player.wins}W/${stats.player.losses}L)</p>
                <p>Comeback Wins: ${stats.player.comebackWins}</p>
                <p>Vision Score/Game: ${(stats.player.visionScore / stats.player.totalGames).toFixed(1)}</p>
                <p>CS/Game: ${(stats.player.creepScore / stats.player.totalGames).toFixed(1)}</p>
            </div>

            <div class="stats-section">
                <h2>Team Performance</h2>
                <p>Team Win Rate: ${((stats.team.wins / stats.team.totalGames) * 100).toFixed(1)}%</p>
                <p>Average Dragons/Game: ${(stats.team.dragonKills / stats.team.totalGames).toFixed(1)}</p>
                <p>Average Barons/Game: ${(stats.team.baronKills / stats.team.totalGames).toFixed(1)}</p>
                <p>Average Turrets/Game: ${(stats.team.turretKills / stats.team.totalGames).toFixed(1)}</p>
                <p>Team Comeback Wins: ${stats.team.comebackWins}</p>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('fetchStatsButton');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', async function() {
            this.disabled = true;  // Prevent double-clicking
            try {
                await fetchMatchStats();
            } finally {
                this.disabled = false;  // Re-enable the button
            }
        });
    }
});