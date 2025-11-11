const {
  app,
  BrowserWindow,
  screen,
  Tray,
  Menu,
  // nativeImage,
  dialog,
  session,
  ipcMain,
} = require("electron");
import { mouse, Point, keyboard, Key } from "@nut-tree-fork/nut-js";

if (require("electron-squirrel-startup")) {
  app.quit();
}
const path = require("path");

// hides doc macOS
// const is_mac = process.platform === "darwin";
// if (is_mac) {
//   app.dock.hide();
// }

// save a reference to the Tray object globally to avoid garbage collection
let tray = null;

const dir = __dirname;

// Creates tray on windows desktop corner
const createTray = () => {
  // console.log("Tray icon path:", iconPath);
  // console.log("App resources path:", process.resourcesPath);
  let trayIcon;
  if (app.isPackaged) {
    // production
    trayIcon = path.join(
      process.resourcesPath,
      "app.asar",
      "dist",
      "images",
      "webcam.png"
    );
  } else {
    // development
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
  settingsWindow.on("close", () => {
    // e.preventDefault(); // Prevents quit <--- ! prevent app closing completely, dont use
    settingsWindow.hide();
  });
};

async function test() {
  return "Main: Async testaus toimii";
}

app.whenReady().then(async () => {
  createTray();
  createWindow();

  let mousePosition = await mouse.getPosition();
  const monitor = screen.getPrimaryDisplay().workAreaSize;
  let lastposition = new Point(0, 0);
  // IPC MAIN PROCESS LISTENERS HERE
  // test ipcMain.on ja ipcRenderer.send kommunikaatio - yksisuuntainen
  ipcMain.on("testi-channel", (_event, msg) => {
    console.log("Testi ipcMain, viesti renderetiltä:", msg);
  });
  // ipcMain.handle ja Renderer.invoke asynkroninen kom. testi - kaksisuuntainen
  ipcMain.handle("prefix:testaaAsyc", test);

  /// get gestures from renderer
  ipcMain.on("gestures-channel", async (_event, result) => {
    const gesture = result.gestures[0][0].categoryName;
    if (!gesture) {
      console.log("No gesture received / detected");

      return;
    }
    // Handedness
    const hand = result.handedness[0][0];
    console.log("handu:", hand.categoryName);

    let suunta = null;

    for (const landmarks of result.landmarks) {
      const wrist = landmarks[0].x;
      const sormi = landmarks[8].x;

      if (sormi < wrist) {
        suunta = "oikea";
        console.log(suunta);
      } else {
        suunta = "vasen";
        console.log(suunta);
      }
    }
    // ____________________
    // Gesture recognition

    // const key_output = document.getElementById("key_output");
    let currentGesture = gesture;
    console.log("Current gesture:", currentGesture);
    // let currentKey;

    // siistitty versio ----------------
    const gestureObject = {
      // Left: { key: Key.A, label: "A" },
      // Right: { key: Key.D, label: "D" },
      Thumb_Up: { key: Key.W, label: "W" },
      Victory: { key: Key.A, label: "A" },
      Open_Palm: { key: Key.D, label: "D" },
      Closed_Fist: { key: Key.S, label: "S" },
    };
    const gestureKey = gestureObject[currentGesture];

    // KEY PRESSING

    if (gestureKey) {
      // if (currentGesture === "Open_Palm") {
      //   if (hand.index === 1 && suunta === "vasen") {
      //     gestureKey.key = Key.A;
      //   } else if (hand.index === 0 && suunta === "oikea") {
      //     gestureKey.key = Key.D;
      //   }
      // }

      // PAINA NAPPIA
      await keyboard.pressKey(gestureKey.key);
      // key_output.innerText = `Key: ${gestureKey.label}`;
    } else {
      console.log("No gesture detected");
      // key_output.innerText = "Key: ";
      Object.values(gestureObject).forEach(({ key }) => {
        keyboard.releaseKey(key);
        console.log("Released key:", key);
      });
    }

    // MOUSE MOVEMENT
    if (result?.landmarks) {
      const wristX = result.landmarks[0][0].x;
      const wristY = result.landmarks[0][0].y;
      const pointX = monitor.width - wristX * monitor.width;
      const pointY = wristY * monitor.height;
      // this did not work in game
      mousePosition.x = mousePosition.x - (lastposition.x - pointX);
      mousePosition.y = mousePosition.y - (lastposition.y - pointY);

      /*       mousePosition.x = pointX;
      mousePosition.y = pointY; */
    }
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
  });

  console.log("ipcMain listener for testi-channel registered");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("before-quit", function () {
    tray.destroy();
  });

  // app.on("window-all-closed", () => {
  //   // if (process.platform !== "darwin") {
  //   app.quit();
  //   // }
  // });
});
