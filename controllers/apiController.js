// controllers/apiController.js
import riotApiModel from '../models/riotApiModel.js';

const test = (req, res) => {
    res.json({ message: 'API is working' });
};

const getPuuid = async (req, res) => {
    console.log('Received request for PUUID:', req.query);
    const { summonerName, region, tagline } = req.query;

    if (!summonerName) {
        return res.status(400).json({ error: 'Missing summonerName parameter' });
    }

    try {
        const puuidData = await riotApiModel.fetchPuuid(summonerName, region, tagline);
        res.json(puuidData);
    } catch (error) {
        console.error('Server error in getPuuid:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const getMatchStats = async (req, res) => {
    console.log('Received request for match stats:', req.query);
    const { puuid, region } = req.query;

    if (!puuid) {
        return res.status(400).json({ error: 'Missing puuid parameter' });
    }

    try {
        const matchStats = await riotApiModel.fetchMatchStats(puuid, region);
        res.json(matchStats);
    } catch (error) {
        console.error('Server error in getMatchStats:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const getLiveClientData = async (req, res) => {
    try {
        const data = await riotApiModel.fetchLiveClientData();
        res.json(data);
    } catch (error) {
        console.error('Error in getLiveClientData:', error);
        res.status(500).json({ error: 'Failed to fetch game data from proxy server' });
    }
};

export default {
    test,
    getPuuid,
    getMatchStats,
    getLiveClientData
};
