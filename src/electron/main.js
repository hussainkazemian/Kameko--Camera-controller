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
  //overlay.webContents.openDevTools();
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
  //let holding = false;

  // check last gesture
  // let lastGesture = null;
  let lastRightGesture;
  let lastLeftGesture;

  // IPC MAIN PROCESS LISTENERS HERE

  /// get gestures from renderer
  ipcMain.on("gestures-channel", (_event, result) => {
    const gesture = result.gestures[0][0].categoryName;

    console.log("Detected gesture:", gesture);
    if (!gesture) {
      //console.log("No gesture received / detected");

      return;
    }

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

    // LEFT - RIGHT MOVEMENT BASED ON INDEX FINGER X POSITION WITH OPEN HAND GESTURE

    const indexFingerTip = result.landmarks[0][8];
    const indexX = monitor.width - indexFingerTip.x * monitor.width;
    //console.log("Index finger X position:", indexX);
    const moveAreaLeft = monitor.width * 0.25;
    const moveAreaRight = monitor.width * 0.75;

    if (gesture === "Open_Hand") {
      if (indexX < moveAreaLeft) {
        // move left
        keyboard.pressKey(Key.A);
        keyboard.releaseKey(Key.D);
      } else if (indexX > moveAreaRight) {
        // move right
        keyboard.pressKey(Key.D);
        keyboard.releaseKey(Key.A);
      } else {
        // release keys
        keyboard.releaseKey(Key.A);
        keyboard.releaseKey(Key.D);
      }
    }

    // OWN GESTURES:
    /*
      Pinch
      Fist
      Middle_Finger_Up
      Open_Hand
      Point_Down
      Point_Up
      Point_Side
      Thumb_Down
      Thumb_Up
      Two_Fingers_Up
      Two_Fingers_Down

      */

    // Gesture Object with gesturenames and corresponding keys ----------------
    const rightGestureObject = {
      // Thumb_Up: { key: Key.W, label: "W" },
      // Thumb_Down: { key: Key.S, label: "S" },
      // Victory: { key: Key.D, label: "D" },
      Two_Fingers_Up: { key: Key.W, label: "W" },
      Two_Fingers_Down: { key: Key.S, label: "S" },
      // Point_Side: { key: Key.D, label: "D" },e
      // Pinch: { key: Key.Escape, label: "Escape" },
    };

    const leftGestureObject = {
      // Thumb_Up: { key: Key.W, label: "W" },
      // Thumb_Down: { key: Key.S, label: "S" },
      // Victory: { key: Key.A, label: "A" },
      Two_Fingers_Up: { key: Key.W, label: "W" },
      Two_Fingers_Down: { key: Key.S, label: "S" },
      // Point_Side: { key: Key.A, label: "A" },
      // Pinch: { key: Key.Escape, label: "Escape" },
    };

    const rightGestureKey = rightGestureObject[rightGesture];
    const leftGestureKey = leftGestureObject[leftGesture];
    const crossReference =
      rightGestureObject[leftGesture] ?? leftGestureObject[rightGesture];

    // KEY PRESSING

    if (rightGestureKey) {
      keyboard.pressKey(rightGestureKey.key);
      //keybordKey(rightGestureKey);
    } else if (!crossReference) {
      //console.log("No gesture detected");
      Object.values(rightGestureObject).forEach(({ key }) => {
        keyboard.releaseKey(key);
      });
    }

    if (leftGestureKey) {
      keyboard.pressKey(leftGestureKey.key);
    } else if (!crossReference) {
      //console.log("No gesture detected");
      Object.values(leftGestureObject).forEach(({ key }) => {
        keyboard.releaseKey(key);
      });
    }

    if (!rightGestureKey && !leftGestureKey) {
      Object.values(leftGestureObject).forEach(({ key }) => {
        keyboard.releaseKey(key);
      });
      Object.values(rightGestureObject).forEach(({ key }) => {
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
      // if (rightGesture == "Closed_Fist" || rightGesture === "Pointing_Up") {
      if (rightGesture == "Fist" || rightGesture === "Point_Up") {
        mousePosition.x = mousePosition.x - (lastposition.x - pointX);
        mousePosition.y = mousePosition.y - (lastposition.y - pointY);
        lastposition.x = pointX;
        lastposition.y = pointY;
        mouse
          .move(mousePosition)
          .catch((error) => console.error("Mouse control error:", error));
      } else {
        lastposition.x = pointX;
        lastposition.y = pointY;
      }
    }
    // if (rightGesture === "Pointing_Up" && lastRightGesture !== "Pointing_Up") {
    if (rightGesture === "Point_Up" && lastRightGesture !== "Point_Up") {
      mouse.pressButton(Button.LEFT);

      //holding = true;
      // } else if (rightGesture !== "Pointing_Up") {
    } else if (rightGesture !== "Point_Up") {
      mouse.releaseButton(Button.LEFT);
    }
    // if (leftGesture === "Closed_Fist" && lastLeftGesture !== "Closed_Fist") {
    if (leftGesture === "Fist" && lastLeftGesture !== "Fist") {
      keyboard.pressKey(Key.E);
      keyboard.releaseKey(Key.E);
    }
    if (
      gesture === "Pinch" &&
      lastRightGesture !== "Pinch" &&
      lastLeftGesture !== "Pinch"
    ) {
      keyboard.pressKey(Key.Escape);
      keyboard.releaseKey(Key.Escape);
    } else {
      keyboard.releaseKey(Key.Escape);
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
