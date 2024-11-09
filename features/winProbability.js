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
    ,countAlivePlayers
 } from "../features/liveGameStats.js"

 import { getLiveData } from "../services/liveDataServices.js"; 

export async function getTeamData(team, dataType) {
    const gameData = await getLiveData();
    const { aliveCount } = await countAlivePlayers(gameData.events.Events);
    
    if (team === 'ORDER') {
        switch (dataType) {
            case 'kills': return (await getStats('ORDER', 'kills'));
            case 'deaths': return (await getStats('ORDER', 'deaths'));
            case 'assists': return (await getStats('ORDER', 'assists'));
            case 'cs': return (await getStats('ORDER', 'creepScore'));
            case 'levels': return (await getStats('ORDER', 'level'));
            case 'gold': return await getGold('ORDER');
            case 'outerTurret': return (await getTurretsKilled('ORDER',1,2)).outerTurret;
            case 'innerTurret': return (await getTurretsKilled('ORDER',1,2)).innerTurret;
            case 'inhibTurret': return (await getTurretsKilled('ORDER',1,2)).inhibTurret;
            case 'nexusTurret': return (await getTurretsKilled('ORDER',1,2)).nexusTurret;
            case 'totalTurret': return (await getTurretsKilled('ORDER',1,2)).total;
            case 'inhibitor' :  const { count } = await getInhibitorsKilled('ORDER',1,2); return count;
            case 'dragon': return await getDragon('ORDER');
            case 'baron': return await getBaron('ORDER')
            case 'elder': return await getElder('ORDER')
            case 'playersAlive': return aliveCount.order;
            default: return 0;
        }
    } else { // CHAOS team
        switch (dataType) {
            case 'kills': return (await getStats('CHAOS', 'kills'));
            case 'deaths': return (await getStats('CHAOS', 'deaths'));
            case 'assists': return (await getStats('CHAOS', 'assists'));
            case 'cs': return (await getStats('CHAOS', 'creepScore'));
            case 'levels': return (await getStats('CHAOS', 'level'));
            case 'gold': return await getGold('CHAOS');
            case 'outerTurret': return (await getTurretsKilled('CHAOS',2,1)).outerTurret;
            case 'innerTurret': return (await getTurretsKilled('CHAOS',2,1)).innerTurret;
            case 'inhibTurret': return (await getTurretsKilled('CHAOS',2,1)).inhibTurret;
            case 'nexusTurret': return (await getTurretsKilled('CHAOS',2,1)).nexusTurret;
            case 'totalTurret': return (await getTurretsKilled('CHAOS',2,1)).total;
            case 'inhibitor' :  const { count } = await getInhibitorsKilled('CHAOS',2,1); return count;
            case 'dragon': return await getDragon('CHAOS');
            case 'baron': return await getBaron('CHAOS')
            case 'elder': return await getElder('CHAOS')
            case 'playersAlive': return aliveCount.chaos;
            default: return 0;
        }
    }
}

// Main function to calculate win probability
export async function calculateWinProbability() {
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

    const baronBuffAlivePlayers = await getTeamData(activePlayerTeam, 'baron');
    let baronBuff = 0; // Default to 0 if no data
    if (baronBuffAlivePlayers !== null) {
        baronBuff = baronBuffAlivePlayers.playersWithBaron.length / activePlayerTeam.length;
    }
    const elderBuffAlivePlayers = await getTeamData(activePlayerTeam, 'elder');
    let elderBuff = 0; // Default to 0 if no data
    if (elderBuffAlivePlayers !== null) {
        elderBuff = elderBuffAlivePlayers.playersWithElder.length / activePlayerTeam.length;
    }
    const gameTime = await getGameTimeSeconds();

    // Weights for each metric (early, mid, late)
    //Early Game
    const earlyGameWeights = {
        kills: 0.3
        ,deaths: 0.3
        ,assists: 0.2
        ,cs: 0.4
        ,gold: 0.4
        ,outerTurret: 0.15
        ,innerTurret: 0.175
        ,inhibTurret: 0.2
        ,nexusTurret: 0.225
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
        ,outerTurret: 0.1
        ,innerTurret: 0.125
        ,inhibTurret: 0.15
        ,nexusTurret: 0.175
        ,dragon: 0.1
        ,dragonSoul: 0.2
        ,baron: 0.15
        ,elder: 0.15
        ,levels: 0.2
        ,players: 0.325
        ,harold: .2
        ,inhibitor: .15
    };

    //Late Game
    const lateGameWeights = {
        kills: 0.2
        ,deaths: 0.2
        ,assists: 0.1
        ,cs: 0.2
        ,gold: 0.2
        ,outerTurret: 0.1
        ,innerTurret: 0.125
        ,inhibTurret: 0.15
        ,nexusTurret: 0.175
        ,dragon: 0.2
        ,dragonSoul: 0.4
        ,baron: 0.25
        ,elder: 0.25
        ,levels: 0.1
        ,players: 0.5
        ,harold: .15
        ,inhibitor: .2
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

    //     console.log('activeteam:', (activePlayerTeam));
    //     console.log(activePlayerTeam,'killR +:', (killsRatio * midGameWeights.kills).toFixed(2));
    //     console.log(activePlayerTeam,'assistR +:', (assistsRatio * midGameWeights.assists).toFixed(2));
    //     console.log(activePlayerTeam,'deathR -:', (deathsRatio * midGameWeights.deaths).toFixed(2));
    //     console.log(activePlayerTeam,'csR +:', (cSRatio * midGameWeights.cs).toFixed(2));
    //     console.log(activePlayerTeam,'lvlR +:', (levelsRatio * midGameWeights.levels).toFixed(2));
    //     console.log(activePlayerTeam,'goldR +:', (goldRatio * midGameWeights.gold).toFixed(2));
    //     console.log(activePlayerTeam,'outerturrR +:', (turretOuterRatio * midGameWeights.outerTurret).toFixed(2));
    //     console.log(activePlayerTeam,'innerturrR +:', (turretInnerRatio * midGameWeights.innerTurret).toFixed(2));
    //     console.log(activePlayerTeam,'inhibturrR +:', (turretInhibRatio * midGameWeights.inhibTurret).toFixed(2));
    //     console.log(activePlayerTeam,'nexturrR +:', (turretNexusRatio * midGameWeights.nexusTurret).toFixed(2));
    //     console.log(activePlayerTeam,'inhibitorR +:', (inhibitorRatio * midGameWeights.inhibitor).toFixed(2));
    //     console.log(activePlayerTeam,'dragR +:', (dragonRatio * midGameWeights.dragon).toFixed(2));
    //     console.log(activePlayerTeam,'dsoulR +:', (dragonSoul * midGameWeights.dragonSoul).toFixed(2));
    //     console.log(activePlayerTeam,'baronR +:', (baronBuff * midGameWeights.baron).toFixed(2));
    //     console.log(activePlayerTeam,'elderR +:', (elderBuff * midGameWeights.elder).toFixed(2));
    //     console.log(activePlayerTeam,'AliveR +:', (aliveRatio * midGameWeights.players).toFixed(2));
        

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
        console.log(activePlayerTeam,"win prob =", (winProbability).toFixed(2));

        return (winProbability * 100).toFixed(2);
    }
}

export async function getGameEnd() {
    const gameData = await getLiveData();
    const gameEnded = [...gameData.events.Events].reverse().find(event =>
        event.EventName === "GameEnd"
    );

    //console.log(gameEnded ? gameEnded.Result : null);
    return gameEnded ? gameEnded.Result : null;

}

export async function shouldForfeit() {
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

export async function analysis() {

}