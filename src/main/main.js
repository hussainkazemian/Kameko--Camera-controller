const {
  app,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  nativeImage,
  dialog,
  session,
} = require("electron");

const path = require("path");

// save a reference to the Tray object globally to avoid garbage collection
let tray = null;

// Creates tray on windows desktop corner
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

// Creates all windows
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

  // Allow media permission via app-level confirmation (renderer will still prompt OS)
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        dialog
          .showMessageBox(overlay, {
            type: "question",
            buttons: ["Allow", "Deny"],
            title: "Camera Permission",
            message:
              "This app needs access to your webcam. Do you want to allow it?",
          })
          .then((result) => {
            callback(result.response === 0);
          });
      } else {
        callback(false);
      }
    }
  );

  //Prevents overlay from being minimized
  overlay.on("minimize", (event) => {
    event.preventDefault();
    overlay.restore();
  });

  overlay.loadFile(path.join(__dirname, "overlay.html"));
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

  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
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
