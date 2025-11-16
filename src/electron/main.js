const {
  app,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  dialog,
  session,
  ipcMain,
} = require("electron");
import { mouse, Point, keyboard, Key } from "@nut-tree-fork/nut-js";
import { overlay } from "three/tsl";

if (require("electron-squirrel-startup")) {
  app.quit();
}
const path = require("path");

// save a reference to the Tray object globally to avoid garbage collection
let tray = null;
let settingsWindow = null;
let isQuitting = false;

const dir = __dirname;

// Creates tray on windows desktop corner
const createTray = () => {
  let trayIcon;
  if (app.isPackaged) {
    // production path to icon
    trayIcon = path.join(
      process.resourcesPath,
      "app.asar",
      "dist",
      "images",
      "webcam.png"
    );
  } else {
    // development path to icon
    trayIcon = path.join(__dirname, "images", "webcam.png");
  }

  //Creates the tray
  tray = new Tray(trayIcon);
  // Hover text
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
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // Isolates the context between main and renderer processes for security.
    },
  });

  overlay.loadFile(path.join(dir, "overlay.html"));
  // overlay.webContents.openDevTools();
  //Makes it so user can click an interract through window.

  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });
  overlay.setIgnoreMouseEvents(true);
  /*   overlay.on("blur", () => {
    overlay.focus();
  }); */ // DISABLED FOR TESTING REASONS

  let settingsWindow = new BrowserWindow({
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
    if (!isQuitting) {
      e.preventDefault();
      settingsWindow.hide();
    }
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
};

app.whenReady().then(async () => {
  createTray();
  createWindow();

  let mousePosition = await mouse.getPosition();
  const monitor = screen.getPrimaryDisplay().workAreaSize;
  let lastposition = new Point(0, 0);

  // check last gesture
  let lastGesture = null;

  // IPC MAIN PROCESS LISTENERS HERE

  /// get gestures from renderer
  ipcMain.on("gestures-channel", async (_event, result) => {
    const gesture = result.gestures[0][0].categoryName;
    if (!gesture) {
      console.log("No gesture received / detected");

      return;
    }
    // Handedness
    const hand = result.handedness[0][0];
    // console.log("handu:", hand.categoryName);

    // ____________________
    // Gesture recognition

    let currentGesture = gesture;
    console.log("Current gesture:", currentGesture);

    // MEDIAPIPE GESTURES:
    /*
      Closed_Fist 
      Open_Palm 
      Pointing_Up 
      Thumb_Down 
      Thumb_Up 
      Victory
      ILoveYou🤘
      None
    */

    // Gesture Object with gesturenames and corresponding keys ----------------
    const gestureObject = {
      Thumb_Up: { key: Key.W, label: "W" },
      Victory: { key: Key.A, label: "A" },
      Thumb_Down: { key: Key.S, label: "S" },
      Open_Palm: { key: Key.D, label: "D" },
      Closed_Fist: { key: Key.E, label: "E" },
    };
    const gestureKey = gestureObject[currentGesture];

    // // KEY PRESSING

    if (gestureKey) {
      await keyboard.pressKey(gestureKey.key);
    } else {
      console.log("No gesture detected");
      Object.values(gestureObject).forEach(({ key }) => {
        keyboard.releaseKey(key);
      });
    }

    // MOUSE MOVEMENT
    //mouse.config.mouseSpeed = 30; // set mouse speed
    if (result?.landmarks) {
      const wristX = result.landmarks[0][0].x;
      const wristY = result.landmarks[0][0].y;
      const pointX = monitor.width - wristX * monitor.width;
      const pointY = wristY * monitor.height;
      // this did not work in game
      mousePosition.x = mousePosition.x - (lastposition.x - pointX) * 0.05;
      mousePosition.y = mousePosition.y - (lastposition.y - pointY) * 0.05;

      /*       mousePosition.x = pointX;
      mousePosition.y = pointY; */
    }

    // MOUSE MOVEMENT GESTURE
    if (gesture == "Pointing_Up") {
      await mouse
        .move(mousePosition)
        .catch((error) => console.error("Mouse control error:", error));
    } else {
      lastposition.x = mousePosition.x;
      lastposition.y = mousePosition.y;
      /* mousePosition = await mouse.getPosition(); */
      /*       console.log(mousePosition.x, mousePosition.y);
      console.log(lastposition, position); */
    }
    mousePosition = lastposition; // <-- fixin the issue of jumpy mouse TEST THIS WITH DIGITSL TWIN!

    if (gesture === "Closed_Fist" && lastGesture !== "Closed_Fist") {
      setTimeout(async () => {
        await mouse.leftClick();
      }, 2000);
      // lastGesture = "Open_Palm";
    }

    lastGesture = gesture;
  });

  // ELECTRON APP EVENTS

  app.on("ready", createWindow);

  app.on("activate", () => {
    if (settingsWindow && settingsWindow.isMinimized()) {
      settingsWindow.show();
    }
    overlay.show();
  });

  app.on("before-quit", function () {
    isQuitting = true;
    tray.destroy();
  });
});
