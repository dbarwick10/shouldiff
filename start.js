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
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Clone the repository
exec('git clone https://github.com/dbarwick10/shouldiff.git .', 
  { cwd: tempDir },
  (error) => {
    if (error) {
      console.error('Error cloning repository:', error);
      return;
    }

    // Navigate to server directory
    const serverDir = join(tempDir, 'server');
    
    // Install dependencies
    console.log('Installing dependencies...');
    exec('npm install', { cwd: serverDir }, (error) => {
      if (error) {
        console.error('Error installing dependencies:', error);
        return;
      }

      // Start the server in a new window (Windows-specific)
      console.log('Starting server in new window...');
      exec('start cmd.exe /K npm start', { cwd: serverDir, shell: true });
      
      console.log('Server window opened! You can close it when you\'re done.');
      process.exit(0); // Exit this process since server runs in new window
    });
  }
);