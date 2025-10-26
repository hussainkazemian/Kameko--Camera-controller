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
import { mouse, Point, keyboard, Key } from "@nut-tree-fork/nut-js";

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
  //overlay.webContents.openDevTools();
  //Makes it so user can click an interract through window.

  overlay.setAlwaysOnTop(true, "screensaver");
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
  settingsWindow.on("close", (e) => {
    e.preventDefault(); // Prevents quit
    settingsWindow.hide();
  });
};
async function test() {
  return "Main: Async testaus toimii";
}

//########################################

//########################################

app.whenReady().then(() => {
  let mousePosition = new Point();
  const lastposition = new Point();
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
    /*     console.log(
      "Received gesture from renderer: " +
        gesture +
        " " +
        result.handedness[0][0].categoryName,
      result.handedness[1][0].categoryName
    ); */

    // Here you can add code to handle the received gesture
    //_______________________________________________________
    // Eleenn tunnistus

    // const key_output = document.getElementById("key_output");
    let currentGesture = gesture;
    // let currentKey;

    // siistitty versio ----------------
    const gestureObject = {
      Thumb_Up: { key: Key.W, label: "W" },
      Thumb_Down: { key: Key.S, label: "S" },
      Victory: { key: Key.A, label: "A" },
      Open_Palm: { key: Key.D, label: "D" },
      //Closed_Fist: { key: Key.Space, label: "space" },
    };
    const gestureKey = gestureObject[currentGesture];

    if (gestureKey) {
      // currentKey =
      await keyboard.pressKey(gestureKey.key);
      //key_output.innerText = `Key: ${gestureKey.label}`;
    } else {
      // key_output.innerText = "Key: ";
      Object.values(gestureObject).forEach(async ({ key }) => {
        await keyboard.releaseKey(key);
        // currentKey = null;
      });
    }
    //########################################
    if (result?.landmarks) {
      const wristX = result.landmarks[0][0].x;
      const wristY = result.landmarks[0][0].y;
      const pointX = 1920 - wristX * 1920;
      const pointY = wristY * 1080;
      // this did not work in game
      /*       mousePosition.x = mousePosition.x - (lastposition.x - pointX);
      mousePosition.y = mousePosition.y - (lastposition.y - pointY);
      lastposition.x = pointX;
      lastposition.y = pointY; */
      mousePosition.x = pointX;
      mousePosition.y = pointY;
    }
    if (gesture == "Closed_Fist") {
      await mouse
        .move(mousePosition)
        .catch((error) => console.error("Mouse control error:", error));
    } else {
      mousePosition = await mouse.getPosition();
      /*       console.log(mousePosition.x, mousePosition.y);
      console.log(lastposition, position); */
    }

    //########################################

    //_______________________________________________________
  });

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
