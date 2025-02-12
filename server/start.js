#!/usr/bin/env node

import { exec, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import os from 'os';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Store active processes and temp directories for cleanup
const state = {
  serverProcess: null,
  tempDir: null,
  isCleaningUp: false,
  cleanupFile: null // File to track cleanup state
};

// Enhanced cleanup function
async function cleanup(exitCode = 0) {
  if (state.isCleaningUp) return;
  state.isCleaningUp = true;

  console.log('\nInitiating cleanup...');

  try {
    // Kill server process if it exists
    if (state.serverProcess) {
      console.log('Stopping server process...');
      await new Promise((resolve) => {
        // Try graceful shutdown first
        state.serverProcess.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        const forceKillTimeout = setTimeout(() => {
          if (state.serverProcess) {
            console.log('Force killing server process...');
            state.serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        // Wait for the process to exit
        state.serverProcess.on('exit', () => {
          clearTimeout(forceKillTimeout);
          resolve();
        });
      });
    }

    // Remove temp directory if it exists
    if (state.tempDir && fs.existsSync(state.tempDir)) {
      console.log('Removing temporary directory...');
      await new Promise((resolve) => {
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

    // Remove cleanup file if it exists
    if (state.cleanupFile && fs.existsSync(state.cleanupFile)) {
      fs.unlinkSync(state.cleanupFile);
    }

    console.log('Cleanup complete');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    if (exitCode !== undefined) {
      process.exit(exitCode);
    }
  }
}

// Handle process termination signals
function setupSignalHandlers() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down...`);
      cleanup(0);
    });
  });

  // Windows-specific handling
  if (process.platform === 'win32') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('SIGINT', () => cleanup(0));
    rl.on('SIGTERM', () => cleanup(0));

    // Detect terminal window closure on Windows
    process.on('exit', () => {
      if (!state.isCleaningUp) {
        console.log('Terminal window closed, initiating cleanup...');
        cleanup(0);
      }
    });
  }
}

// Create a cleanup file to track abrupt termination
function createCleanupFile() {
  state.cleanupFile = join(os.tmpdir(), `shouldiff-cleanup-${process.pid}.lock`);
  fs.writeFileSync(state.cleanupFile, 'cleanup pending');
}

// Check for orphaned cleanup files on startup
function checkForOrphanedCleanup() {
  const tempDir = os.tmpdir();
  const files = fs.readdirSync(tempDir);
  files.forEach((file) => {
    if (file.startsWith('shouldiff-cleanup-')) {
      const filePath = join(tempDir, file);
      console.log(`Found orphaned cleanup file: ${filePath}`);
      fs.unlinkSync(filePath); // Clean up orphaned files
    }
  });
}

// Main setup function
async function setupServer() {
  try {
    console.log('Setting up Shouldiff Server...');

    // Check for orphaned cleanup files
    checkForOrphanedCleanup();

    // Create cleanup file
    createCleanupFile();

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
setupSignalHandlers();

// Start the server setup
setupServer().catch(async (err) => {
  console.error('Fatal error:', err);
  await cleanup(1);
});