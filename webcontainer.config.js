// webcontainer.config.js
import { webContainerManager } from './webcontainer-setup.js';

// Define initial file structure with proper content format
export const files = {
  'package.json': {
    // File content must be a string for the WebContainer
    file: {
    contents: `{
      name: "shouldiff_app",
      version: "1.0.0",
      type: "module",
      scripts: {
        start: "node server/server.js",
        dev: "node server/server.js"
      },
      dependencies: {
        cors: "^2.8.5",
        dotenv: "^16.4.7",
        express: "^4.18.2",
        "node-fetch": "^3.3.2"
      }
    }`
  },
  },
  'server/server.js': {
    content: `import express from 'express';
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
    app.use(cors());
    app.use(express.json());
    
    app.use(express.static(path.join(__dirname, '..')));

    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(err.status || 500).json({ error: err.message });
    });

    app.listen(PORT, () => {
      console.log(\`Server running on port \${PORT}\`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();`
  }
};

export async function startDevServer() {
  if (!window.WebContainer) {
    webContainerManager.log('WebContainer not initialized', 'error');
    return;
  }

  try {
    // Mount files
    webContainerManager.log('Mounting project files...');
    await window.webcontainer.mount(files);
    webContainerManager.log('Project files mounted successfully', 'success');

    // Install dependencies
    webContainerManager.log('Installing dependencies...');
    const installProcess = await window.webcontainer.spawn('npm', ['install']);
    
    // Show install progress
    installProcess.output.pipeTo(new WritableStream({
      write(data) {
        webContainerManager.log(`npm install: ${data}`);
      }
    }));

    const installExitCode = await installProcess.exit;
    
    if (installExitCode !== 0) {
      throw new Error('Installation failed');
    }
    webContainerManager.log('Dependencies installed successfully', 'success');

    // Start the server
    webContainerManager.log('Starting development server...');
    const serverProcess = await window.webcontainer.spawn('npm', ['run', 'dev']);
    
    // Show server output
    serverProcess.output.pipeTo(new WritableStream({
      write(data) {
        webContainerManager.log(`server: ${data}`);
      }
    }));

    window.webcontainer.on('server-ready', (port, url) => {
      webContainerManager.log(`Development server is ready at ${url}`, 'success');
      window.API_BASE_URL = url;
    });

  } catch (error) {
    webContainerManager.log(`Error in startDevServer: ${error.message}`, 'error');
    throw error;
  }
}