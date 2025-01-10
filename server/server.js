import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';
import apiRoutes from './api/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log('Memory usage before request:', getMemoryStats());

    console.log('Request received:', {
        url: req.url,
        method: req.method,
        origin: req.headers.origin,
        path: req.path
    });

    res.on('finish', () => {
        console.log(`Memory usage after ${req.method} ${req.url}:`, getMemoryStats());
    });

    next();
});

app.use('/api', apiRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({ error: err.message });
});

function formatMemoryUsage(bytes) {
    return `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;
}

function getMemoryStats() {
    const memoryData = process.memoryUsage();
    return {
        rss: formatMemoryUsage(memoryData.rss), 
        heapTotal: formatMemoryUsage(memoryData.heapTotal),
        heapUsed: formatMemoryUsage(memoryData.heapUsed),
        external: formatMemoryUsage(memoryData.external)
    };
}

const MEMORY_LOG_INTERVAL = 600000;
setInterval(() => {
    console.log('Periodic memory check:', getMemoryStats());
}, MEMORY_LOG_INTERVAL);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  - GET /api/live-stats');
});

process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server shut down.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server shut down.');
        process.exit(0);
    });
});