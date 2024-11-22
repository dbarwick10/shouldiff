import { getActivePlayerTeam, getActivePlayer, getGameTimeSeconds, getStats, getGold, getTurretsKilled } from "../features/liveGameStats.js"

export async function getLiveData() {
    console.log('Entering getLiveData'); // Added logging

    try {
        const acttivePlayer = await getActivePlayer();
        const activePlayerTeam = await getActivePlayerTeam();
        const gameTime = await getGameTimeSeconds();
        const stats = await getStats(teamOrPlayerName, statType);
        const gold = await getGold();
        const turretsKilled = await getTurretsKilled();
        console.log('Received active game data'); // Log received data

        if (!activePlayerTeam || !gameTime || !stats) {
            console.log('No game data received');
            return { kills: [], deaths: [], assists: [] };
        }

        const { kills, deaths, assists } = stats;
        console.log('Calculated active player stats:', kills, deaths, assists);
        return { kills, deaths, assists };
    } catch (error) {
        console.error('Complete error in getLiveData:', error);
        return { kills: [], deaths: [], assists: [] };
    }
}