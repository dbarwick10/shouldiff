// webcontainer-init.js
import { webContainerManager } from './webcontainer-setup.js';
import { startDevServer } from './webcontainer.config.js';

async function initializeWebContainer() {
    try {
        await webContainerManager.initialize();
        
        if (webContainerManager.isInitialized) {
            await startDevServer();
        }
    } catch (error) {
        webContainerManager.log('Failed to initialize development environment', 'error');
        console.error('Development environment initialization failed:', error);
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebContainer);
} else {
    initializeWebContainer();
}