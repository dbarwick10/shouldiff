#!/usr/bin/env node

import { exec, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Store active processes and temp directories for cleanup
const state = {
  serverProcess: null,
  tempDir: null,
  isCleaningUp: false
};

// Enhanced cleanup function
async function cleanup(exitCode = 0) {
  // Prevent multiple cleanup attempts
  if (state.isCleaningUp) return;
  state.isCleaningUp = true;

  console.log('\nInitiating cleanup...');

  try {
    // Kill server process if it exists
    if (state.serverProcess) {
      // Try graceful shutdown first
      state.serverProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        try {
          if (state.serverProcess) {
            state.serverProcess.kill('SIGKILL');
          }
        } catch (err) {
          // Process might already be gone
        }
      }, 5000);
    }

    // Remove temp directory if it exists
    if (state.tempDir && fs.existsSync(state.tempDir)) {
      await new Promise((resolve) => {
        // Wait a bit to ensure files are not in use
        setTimeout(() => {
          try {
            fs.rmSync(state.tempDir, { recursive: true, force: true });
            console.log('Temporary files cleaned up successfully');
          } catch (err) {
            console.error('Warning: Could not remove some temporary files:', err.message);
          }
          resolve();
        }, 1000);
      });
    }

    console.log('Cleanup complete');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    // Ensure process exits even if cleanup had errors
    if (exitCode !== undefined) {
      process.exit(exitCode);
    }
  }
}

// Main setup function
async function setupServer() {
  try {
    console.log('Setting up Shouldiff Server...');
    
    // Create temp directory
    state.tempDir = join(os.tmpdir(), 'shouldiff-temp-' + Date.now());
    console.log('Using temporary directory:', state.tempDir);

    // Ensure fresh directory
    if (fs.existsSync(state.tempDir)) {
      fs.rmSync(state.tempDir, { recursive: true });
    }
    fs.mkdirSync(state.tempDir);

    // Clone repository
    console.log('\nCloning repository...');
    await new Promise((resolve, reject) => {
      exec(
        'git clone -b testMain --single-branch https://github.com/dbarwick10/shouldiff.git .',
        { cwd: state.tempDir },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Git clone failed: ${stderr}`));
            return;
          }
          console.log(stdout);
          resolve();
        }
      );
    });

    // Verify package.json exists
    if (!fs.existsSync(join(state.tempDir, 'package.json'))) {
      throw new Error('package.json not found in root directory');
    }

    // Install dependencies
    console.log('\nInstalling dependencies...');
    await new Promise((resolve, reject) => {
      exec('npm install --production', { cwd: state.tempDir }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`npm install failed: ${stderr}`));
          return;
        }
        console.log(stdout);
        resolve();
      });
    });

    // Start server
    const serverDir = join(state.tempDir, 'server');
    if (!fs.existsSync(join(serverDir, 'server.js'))) {
      throw new Error('server.js not found in server directory');
    }

    console.log('\nStarting server...');
    state.serverProcess = spawn('node', ['server.js'], {
      cwd: serverDir,
      stdio: 'pipe'
    });

    // Handle server output
    state.serverProcess.stdout.pipe(process.stdout);
    state.serverProcess.stderr.pipe(process.stderr);

    // Monitor server process
    state.serverProcess.on('error', (err) => {
      console.error('Server process error:', err);
      cleanup(1);
    });

    state.serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
      cleanup(code);
    });

    // Display instructions
    console.log('\n----------------------------------------');
    console.log('Server is now running!');
    console.log('To stop the server and clean up, press Ctrl+C');
    console.log('or close this window.');
    console.log('----------------------------------------\n');

  } catch (err) {
    console.error('Setup failed:', err);
    await cleanup(1);
  }
}

// Set up process event handlers
process.on('SIGINT', () => cleanup(0));  // Ctrl+C
process.on('SIGTERM', () => cleanup(0)); // Termination request
process.on('SIGHUP', () => cleanup(0));  // Terminal window closed
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  cleanup(1);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  cleanup(1);
});

// Start the server setup
setupServer().catch(async (err) => {
  console.error('Fatal error:', err);
  await cleanup(1);
});