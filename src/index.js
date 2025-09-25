const {
  app,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  nativeImage,
} = require("electron/main");

const path = require("path");

// save a reference to the Tray object globally to avoid garbage collection
let tray = null;

const createTray = () => {
  tray = new Tray("./images/webcam2.png");
  tray.setToolTip("Camera Controller");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Settings",
      click: () => {
        const wins = BrowserWindow.getAllWindows();
        if (wins.length === 0) {
          wins[0].show();
        } else {
          wins[0].show();
        }
      },
    },
    {
      label: "Exit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
};

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  const overlay = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: true,
  });

  //Prevents overlay from being minimized
  overlay.on("minimize", (event) => {
    event.preventDefault();
    overlay.restore();
  });

  overlay.loadFile(path.join(__dirname, "public/overlay.html"));
  //Makes it so user can click an interract through window.
  overlay.setIgnoreMouseEvents(true);

  const settingsWindow = new BrowserWindow({
    width,
    height,
    resizable: true,
    frame: true,
    title: "Settings",
    icon: "./images/webcam_large2.png",
  });

  settingsWindow.loadFile(path.join(__dirname, "public/settings.html"));
  //closing windows now wont delete the windows but hide it
  settingsWindow.on("close", (e) => {
    e.preventDefault(); // Prevents quit
    settingsWindow.hide();
  });
};

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("before-quit", function (evt) {
    tray.destroy();
  });
});
