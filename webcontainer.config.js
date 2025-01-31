import { webContainerManager } from './webcontainer-setup.js';

export const files = {
  'package.json': {
    file: {
      contents: `{
        name: "shouldiff_app",
        version: "1.0.0",
        type: "module",
        scripts: {
          start: "node server.js",
          dev: "node server.js"
        },
        dependencies: {
          cors: "^2.8.5",
          dotenv: "^16.4.7",
          express: "^4.18.2",
          "node-fetch": "^3.3.2"
        }
      }`,
    }
  },
  'server.js': {
    file: {
      contents: `import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    app.use((req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    });

    app.use(cors());
    app.use(express.json());
    
    app.use(express.static(path.join(__dirname, '..')));

    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(err.status || 500).json({ error: err.message });
    });

    app.listen(PORT, () => {
      console.log('Server running on port ' + PORT);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();`
    }
  }
};

export async function startDevServer() {
  if (!window.WebContainer) {
    webContainerManager.log('WebContainer not initialized', 'error');
    return;
  }
   const webcontainer = window.WebContainer || window.webcontainer;
  if (!webcontainer) {
    webContainerManager.log('WebContainer object is undefined', 'error');
    return;
  }

  try {
    webContainerManager.log('Mounting project files...');
    await webContainerManager.webcontainer.mount(files);
    webContainerManager.log('Project files mounted successfully', 'success');

    webContainerManager.log('Installing dependencies...');
    const installProcess = await window.webcontainer.spawn('npm', ['install']);
    
    installProcess.output.pipeTo(new WritableStream({
      write(data) {
        webContainerManager.log('npm install: ' + data);
      }
    }));

    const installExitCode = await installProcess.exit;
    
    if (installExitCode !== 0) {
      throw new Error('Installation failed');
    }
    webContainerManager.log('Dependencies installed successfully', 'success');

    webContainerManager.log('Starting development server...');
    const serverProcess = await window.webcontainer.spawn('npm', ['run', 'dev']);
    
    serverProcess.output.pipeTo(new WritableStream({
      write(data) {
        webContainerManager.log('server: ' + data);
      }
    }));

    window.webcontainer.on('server-ready', (port, url) => {
      webContainerManager.log('Development server is ready at ' + url, 'success');
      window.API_BASE_URL = url;
    });

  } catch (error) {
    webContainerManager.log('Error in startDevServer: ' + error.message, 'error');
    throw error;
  }
}