const { app, BrowserWindow, screen } = require("electron/main");

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const win = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    frame: false,
  });

  win.loadFile("overlay.html");
  win.setIgnoreMouseEvents(true);
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
