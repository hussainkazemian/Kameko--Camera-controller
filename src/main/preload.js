const { contextBridge } = require('electron');

// Expose a minimal, safe API surface to the renderer if needed.
contextBridge.exposeInMainWorld('appBridge', {
    getInfo: () => ({ name: 'Digital Twin', version: '1.0.0' })
});
