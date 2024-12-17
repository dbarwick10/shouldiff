import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
app.commandLine.appendSwitch('ignore-certificate-errors');

function createWindow() {
    const win = new BrowserWindow({
        width: 1366,
        height: 768,  
		icon: "shouldiff_app\\Icon\\leeg.ico",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
			webSecurity: false,
            allowRunningInsecureContent: true,
        },
    });

    win.loadFile(path.join(app.getAppPath(), 'index.html'));
	win.setMenu(null)
}

    app.whenReady().then(() => {
        createWindow();
    
        const server = spawn('node', [path.join(app.getAppPath(), 'server/server.js')], {
            stdio: 'pipe', // Pipe stdout and stderr
        });
    
        // Log server output
        server.stdout.on('data', (data) => {
            console.log(`Server output: ${data}`);
        });
    
        server.stderr.on('data', (data) => {
            console.error(`Server error: ${data}`);
        });
    
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
