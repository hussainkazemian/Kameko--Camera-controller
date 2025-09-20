const { app, BrowserWindow, session, dialog, Tray, nativeImage } = require('electron');
const path = require('path');

function createWindow() {
    // Resolve platform-specific icon (Windows: .ico, macOS: .icns, else .png)
    const resolveAsset = (filename) => {
        // In production, assets live under process.resourcesPath; in dev, under project root
        const base = process.env.PORTABLE_EXECUTABLE_DIR || process.resourcesPath || __dirname;
        const prodPath = path.join(base, filename);
        if (require('fs').existsSync(prodPath)) return prodPath;
        const devPath = path.join(__dirname, filename);
        if (require('fs').existsSync(devPath)) return devPath;
        // Try project root
        const rootPath = path.join(process.cwd(), 'dist', filename);
        if (require('fs').existsSync(rootPath)) return rootPath;
        return undefined;
    };

    const platformIcon = process.platform === 'win32'
        ? resolveAsset('icon.ico')
        : process.platform === 'darwin'
            ? resolveAsset('icon.icns')
            : resolveAsset('icon.png');

    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#111',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        icon: platformIcon
    });

    // Allow media permission via app-level confirmation (renderer will still prompt OS)
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            dialog.showMessageBox(win, {
                type: 'question',
                buttons: ['Allow', 'Deny'],
                title: 'Camera Permission',
                message: 'This app needs access to your webcam. Do you want to allow it?'
            }).then(result => {
                callback(result.response === 0);
            });
        } else {
            callback(false);
        }
    });

    if (process.env.ELECTRON_START_URL) {
        win.loadURL(process.env.ELECTRON_START_URL);
    } else {
        // __dirname points to dist/ after bundling; index.html is copied to dist/
        win.loadFile(path.join(__dirname, 'index.html'));
    }

    if (process.env.DEBUG) {
        win.webContents.openDevTools({ mode: 'detach' });
    }

    // Keep default system menus (no custom menu template)

    // Optional: system tray to indicate the app is running (no menu changes)
    let tray;
    try {
        const trayImagePath = resolveAsset('icon.png') || resolveAsset('icon.ico');
        if (trayImagePath) {
            const image = nativeImage.createFromPath(trayImagePath);
            if (!image.isEmpty()) {
                tray = new Tray(image);
                tray.setToolTip('Digital Twin - Hand Tracking');
                tray.on('click', () => { if (win) { win.show(); win.focus(); } });
            }
        }
    } catch { /* ignore tray errors if icon missing */ }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
