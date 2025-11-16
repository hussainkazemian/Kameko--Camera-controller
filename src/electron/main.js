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
import { mouse, Point, keyboard, Key, Button } from "@nut-tree-fork/nut-js";

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

app.whenReady().then(() => {
  createTray();
  createWindow();

  const monitor = screen.getPrimaryDisplay().workAreaSize;
  let mousePosition = new Point(monitor.width / 2, monitor.height / 2);
  let lastposition = new Point(monitor.width / 2, monitor.height / 2);
  let holding = false;

  // check last gesture
  // let lastGesture = null;
  let lastRightGesture;
  let lastLeftGesture;

  // IPC MAIN PROCESS LISTENERS HERE

  /// get gestures from renderer
  ipcMain.on("gestures-channel", (_event, result) => {
    const gesture = result.gestures[0][0].categoryName;
    if (!gesture) {
      //console.log("No gesture received / detected");

      return;
    }
    // Handedness
    //const hand = result.handedness[0][0];
    // console.log("handu:", hand.categoryName);

    // ____________________
    // Gesture recognition
    let handRight;
    let handLeft;
    let rightGesture;
    let leftGesture;
    for (let i in result.handedness) {
      if (result.handedness[i][0].categoryName === "Right") {
        handRight = result.landmarks[i];
        rightGesture = result.gestures[i][0].categoryName;
      } else {
        handLeft = result.landmarks[i];
        leftGesture = result.gestures[i][0].categoryName;
      }
    }
    // console.log(leftGesture, rightGesture);

    // let currentGesture = gesture;
    //console.log("Current gesture:", currentGesture);

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
    const rightGestureObject = {
      Thumb_Up: { key: Key.W, label: "R_W" },
      Thumb_Down: { key: Key.S, label: "R_S" },
      Victory: { key: Key.D, label: "D" },
    };

    const leftGestureObject = {
      Thumb_Up: { key: Key.W, label: "L_W" },
      Thumb_Down: { key: Key.S, label: "L_S" },
      Victory: { key: Key.A, label: "A" },
    };

    const rightGestureKey = rightGestureObject[rightGesture];
    const leftGestureKey = leftGestureObject[leftGesture];

    // KEY PRESSING

    if (rightGestureKey) {
      keyboard.pressKey(rightGestureKey.key);
      //keybordKey(rightGestureKey);
    } else {
      //console.log("No gesture detected");
      Object.values(rightGestureObject).forEach(({ key }) => {
        keyboard.releaseKey(key);
      });
    }

    if (leftGestureKey) {
      keyboard.pressKey(leftGestureKey.key);
      //keybordKey(leftGestureKey);
    } else {
      //console.log("No gesture detected");
      Object.values(leftGestureObject).forEach(({ key }) => {
        keyboard.releaseKey(key);
      });
    }
    if (handRight) {
      // MOUSE MOVEMENT
      //mouse.config.mouseSpeed = 30; // set mouse speed
      // this did not work in game
      const wristX = handRight[0].x;
      const wristY = handRight[0].y;
      const pointX = monitor.width - wristX * monitor.width;
      const pointY = wristY * monitor.height;

      // MOUSE MOVEMENT GESTURE
      if (rightGesture == "Closed_Fist") {
        mousePosition.x = mousePosition.x - (lastposition.x - pointX);
        mousePosition.y = mousePosition.y - (lastposition.y - pointY);
        lastposition.x = pointX;
        lastposition.y = pointY;
        mouse
          .move(mousePosition)
          .catch((error) => console.error("Mouse control error:", error));
        // moveMouse(mousePosition);
      } else {
        lastposition.x = pointX;
        lastposition.y = pointY;
      }
      // mousePosition = lastposition; // <-- fixin the issue of jumpy mouse TEST THIS WITH DIGITSL TWIN!
    }
    if (rightGesture === "Pointing_Up" && lastRightGesture !== "Pointing_Up") {
      console.log("debug");
      // mouseKey(holding);
      if (!holding) {
        mouse.pressButton(Button.LEFT);
      } else {
        mouse.releaseButton(Button.LEFT);
      }
      holding = !holding;
    }
    if (leftGesture === "Closed_Fist" && lastLeftGesture !== "Closed_Fist") {
      keyboard.pressKey(Key.E);
      keyboard.releaseKey(Key.E);

      //keybordKey({ key: Key.E, label: "E" });
    }

    lastRightGesture = rightGesture;
    lastLeftGesture = leftGesture;
  });

  // ELECTRON APP EVENTS

  app.on("ready", createWindow);

  app.on("activate", () => {
    if (settingsWindow && settingsWindow.isMinimized()) {
      settingsWindow.show();
    }
    //overlay.show();
  });

  app.on("before-quit", function () {
    isQuitting = true;
    tray.destroy();
  });
});

/* // FUNCTIONS FOR NUT.JS
async function keybordKey(gestureKey) {
  await keyboard.pressKey(gestureKey.key);
}

async function moveMouse(mousePosition) {
  await mouse
    .move(mousePosition)
    .catch((error) => console.error("Mouse control error:", error));
}

async function mouseKey(holding) {
  if (!holding) {
    await mouse.pressButton(Button.LEFT);
  } else {
    await mouse.releaseButton(Button.LEFT);
  }
}
 */
