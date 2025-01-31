// client/js/webcontainer-setup.js

class WebContainerManager {
    constructor() {
        this.logWindow = null;
        this.webcontainer = null;
        this.isInitialized = false;
    }

    createLogWindow() {
        if (this.logWindow) return this.logWindow;

        this.logWindow = document.createElement('div');
        this.logWindow.id = 'webcontainer-logs';
        this.logWindow.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            height: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            padding: 15px;
            font-family: monospace;
            font-size: 12px;
            overflow-y: auto;
            border-radius: 8px;
            z-index: 1000;
            border: 1px solid #333;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;

        // Add a header
        const header = document.createElement('div');
        header.style.cssText = `
            position: sticky;
            top: 0;
            background: rgba(0, 0, 0, 0.9);
            padding: 5px 0;
            margin-bottom: 10px;
            border-bottom: 1px solid #333;
            font-weight: bold;
        `;
        header.textContent = 'WebContainer Logs';
        this.logWindow.appendChild(header);

        // Add minimize/maximize button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = '−';
        toggleButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 10px;
            background: none;
            border: none;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            padding: 0 5px;
        `;
        
        let isMinimized = false;
        toggleButton.onclick = () => {
            isMinimized = !isMinimized;
            this.logWindow.style.height = isMinimized ? '30px' : '300px';
            toggleButton.textContent = isMinimized ? '+' : '−';
        };
        
        header.appendChild(toggleButton);
        document.body.appendChild(this.logWindow);
        return this.logWindow;
    }

    log(message, type = 'info') {
        const logWindow = this.logWindow || this.createLogWindow();
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.style.marginBottom = '5px';
        
        switch(type) {
            case 'error':
                console.error(message);
                logEntry.style.color = '#ff4444';
                break;
            case 'success':
                console.log(message);
                logEntry.style.color = '#00ff00';
                break;
            case 'warning':
                console.warn(message);
                logEntry.style.color = '#ffff00';
                break;
            default:
                console.log(message);
                logEntry.style.color = '#ffffff';
        }
        
        logEntry.textContent = `[${timestamp}] ${message}`;
        logWindow.appendChild(logEntry);
        logWindow.scrollTop = logWindow.scrollHeight;
    }

    async waitForWebContainer() {
        this.log('Waiting for WebContainer API to load...');
        
        for (let i = 0; i < 50; i++) {
            if (window.WebContainer) {
                this.log('WebContainer API loaded successfully', 'success');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            if (i % 10 === 0) {
                this.log('Still waiting for WebContainer API...');
            }
        }
        
        this.log('WebContainer API failed to load', 'error');
        return false;
    }

    async initialize() {
        if (this.isInitialized) {
            this.log('WebContainer already initialized');
            return;
        }

        try {
            const isAvailable = await this.waitForWebContainer();
            if (!isAvailable) return;

            this.log('Booting WebContainer...');
            this.webcontainer = await window.WebContainer.boot();
            this.log('WebContainer booted successfully', 'success');
            
            this.isInitialized = true;
            
            // Add window resizing capability
            this.makeLogWindowResizable();

        } catch (error) {
            this.log(`Failed to initialize WebContainer: ${error.message}`, 'error');
        }
    }

    makeLogWindowResizable() {
        if (!this.logWindow) return;

        let resizing = false;
        let startY;
        let startHeight;

        const resizeHandle = document.createElement('div');
        resizeHandle.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            cursor: ns-resize;
        `;

        resizeHandle.addEventListener('mousedown', (e) => {
            resizing = true;
            startY = e.clientY;
            startHeight = parseInt(this.logWindow.style.height);
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!resizing) return;
            const delta = startY - e.clientY;
            this.logWindow.style.height = `${startHeight + delta}px`;
        });

        document.addEventListener('mouseup', () => {
            resizing = false;
            document.body.style.userSelect = '';
        });

        this.logWindow.appendChild(resizeHandle);
    }
}

export const webContainerManager = new WebContainerManager();