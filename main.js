const { app, BrowserWindow, session, dialog } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,     // renderer can use require()
      contextIsolation: true,    // safer separation
      sandbox: true
    }
  });

  // Handle camera/mic requests from renderer
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['Allow', 'Deny'],
        title: 'Camera Permission',
        message: 'This app needs access to your webcam. Do you want to allow it?'
      }).then(result => {
        callback(result.response === 0); // 0 = "Allow"
      });
    } else {
      callback(false);
    }
  });

  win.loadFile('index.html');
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
