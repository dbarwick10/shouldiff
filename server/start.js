#!/usr/bin/env node

import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Setting up Shouldiff Server...');

// Create temp directory if it doesn't exist
const tempDir = join(__dirname, 'shouldiff-temp');
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
}
fs.mkdirSync(tempDir);

// Clone the repository
console.log('Cloning repository...');
exec('git clone -b testMain --single-branch https://github.com/dbarwick10/shouldiff.git .', 
  { cwd: tempDir },
  (error) => {
    if (error) {
      console.error('Error cloning repository:', error);
      return;
    }

    // Navigate to server directory
    const serverDir = join(tempDir, 'server');
    
    // Install dependencies using a specific npm command
    console.log('Installing dependencies...');
    exec('npm ci --production', { cwd: serverDir }, (error) => {
      if (error) {
        console.log('Trying alternative installation method...');
        exec('npm install --production', { cwd: serverDir }, (error) => {
          if (error) {
            console.error('Error installing dependencies:', error);
            return;
          }
          startServer(serverDir);
        });
      } else {
        startServer(serverDir);
      }
    });
  }
);

function startServer(serverDir) {
  // Start the server in a new window (Windows-specific)
  console.log('Starting server in new window...');
  const cmd = 'start cmd.exe /K "cd /d "' + serverDir + '" && node server.js"';
  exec(cmd, { shell: true });
  
  console.log('Server window opened! You can close it when you\'re done.');
  process.exit(0);
}