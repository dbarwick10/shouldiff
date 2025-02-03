import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';
import apiRoutes from './api/routes.js';
import { initializeCache } from './features/getItemsAndPrices.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        app.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          next();
          });
        await initializeCache();
        console.log('Item cache initialized successfully');

        app.use(cors());
        app.use(express.json());
        app.use((req, res, next) => {

            res.on('finish', () => {
            });
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            next();
        });

        app.use('/api', apiRoutes);

        app.use(express.static(path.join(__dirname, '..')));

        app.use((err, req, res, next) => {
            console.error('Server error:', err);
            res.status(err.status || 500).json({ error: err.message });
        });

        app.listen(PORT, () => {
            console.log('Server running on port');
            console.log('Available endpoints:');
            console.log('  - GET /api/live-stats');
        });

        
    } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    
    startServer();