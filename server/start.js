#!/usr/bin/env node

import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use system temp directory for better cleanup
const tempDir = join(os.tmpdir(), 'shouldiff-temp-' + Date.now());

console.log('Setting up Shouldiff Server...');
console.log('Using temporary directory:', tempDir);

// Create fresh temp directory
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
}
fs.mkdirSync(tempDir);

// Clone the repository
console.log('\nCloning repository...');
exec('git clone -b testMain --single-branch https://github.com/dbarwick10/shouldiff.git .', 
  { cwd: tempDir },
  (error, stdout, stderr) => {
    if (error) {
      console.error('Error cloning repository:', stderr);
      return;
    }
    console.log(stdout);

    // Navigate to server directory
    const serverDir = join(tempDir, 'server');
    
    // Install dependencies
    console.log('\nInstalling dependencies...');
    exec('npm install --production', { cwd: serverDir }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error installing dependencies:', stderr);
        return;
      }
      console.log(stdout);

      // Start the server in the same window
      console.log('\nStarting server...');
      const server = exec('node server.js', { cwd: serverDir });

      // Pipe the server output to console
      server.stdout.pipe(process.stdout);
      server.stderr.pipe(process.stderr);

      // Clear instructions for the user
      console.log('\n----------------------------------------');
      console.log('Server is now running!');
      console.log('To stop the server and clean up, press Ctrl+C.');
      console.log('----------------------------------------\n');

      // Handle cleanup when the process is terminated
      const cleanup = () => {
        console.log('\nStopping server and cleaning up...');
        server.kill();
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('Cleanup complete. Goodbye!');
        process.exit();
      };

      // Set up cleanup handlers
      process.on('SIGINT', cleanup);  // Ctrl+C
      process.on('SIGTERM', cleanup); // Kill
      server.on('exit', cleanup);     // Server exit
    });
  }
);