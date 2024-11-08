// routes/api.js
import express from 'express';
import apiController from '../controllers/apiController.js';

const router = express.Router();

router.get('/test', apiController.test);
router.get('/puuid', apiController.getPuuid);
router.get('/match-stats', apiController.getMatchStats);
router.get('/liveclientdata/allgamedata', apiController.getLiveClientData);

export default router;
