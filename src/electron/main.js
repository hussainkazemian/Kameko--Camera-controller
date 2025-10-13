const {
  app,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  /* nativeImage, */
  dialog,
  session,
  ipcMain,
} = require("electron");

const path = require("path");

// save a reference to the Tray object globally to avoid garbage collection
let tray = null;

const dir = __dirname;

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
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    /*     webPreferences: {
      nodeIntegration: true, //  enables or disables Node.js APIs in the renderer process.
      contextIsolation: false,
    }, */
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // Isolates the context between main and renderer processes for security.
    },
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

  overlay.loadFile(path.join(dir, "overlay.html"));
  overlay.webContents.openDevTools();
  //Makes it so user can click an interract through window.

  overlay.setAlwaysOnTop(true, "screensaver");
  overlay.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });
  // overlay.setIgnoreMouseEvents(true);
  /*   overlay.on("blur", () => {
    overlay.focus();
  }); */ // DISABLED FOR TESTING REASONS

  const settingsWindow = new BrowserWindow({
    width,
    height,
    resizable: true,
    frame: true,
    title: "Settings",
    icon: "./images/webcam_large2.png",
  });

  settingsWindow.loadFile(path.join(dir, "settings.html"));
  //closing windows now wont delete the windows but hide it
  settingsWindow.on("close", (e) => {
    e.preventDefault(); // Prevents quit
    settingsWindow.hide();
  });
};
async function test() {
  return "Main: Async testaus toimii";
}

app.whenReady().then(() => {
  // IPC MAIN PROCESS LISTENERS HERE
  // test ipcMain.on ja ipcRenderer.send kommunikaatio - yksisuuntainen
  ipcMain.on("testi-channel", (_event, msg) => {
    console.log("Testi ipcMain, viesti renderetiltä:", msg);
  });
  // ipcMain.handle ja Renderer.invoke asynkroninen kom. testi - kaksisuuntainen
  ipcMain.handle("prefix:testaaAsyc", test);

  console.log("ipcMain listener for testi-channel registered");

  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("before-quit", function () {
    tray.destroy();
  });
});
