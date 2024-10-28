import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
app.commandLine.appendSwitch('ignore-certificate-errors');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
		icon: "shouldiff_app\\Icon\\leeg.ico",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
			webSecurity: false,
        },
    });

    win.loadFile(path.join('public', 'index.html'));
	win.setMenu(null)
}



app.whenReady().then(() => {
    createWindow();

    // Start server.js as a child process
    const server = spawn('node', [path.join(process.cwd(), 'server.js')]);

    server.stdout.on('data', (data) => {
        console.log(`Server output: ${data}`);
    });

    server.stderr.on('data', (data) => {
        console.error(`Server error: ${data}`);
    });

    server.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
