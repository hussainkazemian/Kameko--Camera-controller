const { contextBridge, ipcRenderer } = require("electron");
console.log("preload.js loaded");

// Expose a minimal, safe API surface to the renderer if needed.
contextBridge.exposeInMainWorld("appBridge", {
  getInfo: () => ({ name: "Digital Twin", version: "1.0.0" }),
  // IPC
  sendHelloFromRenderer: (msg) => {
    console.log("sendHelloFromRenderer called with msg:", msg);
    ipcRenderer.send("testi-channel", msg);
  },
  testaaAsyc: () => ipcRenderer.invoke("prefix:testaaAsyc"),

  // test
  etittavaFunkkis: (msg) => {
    console.log("etittavaFunkkis called from renderer:", msg);
  },

  // gesturet
  sendGesture: (gesture) => {
    console.log("sendGesture called with gesture:", gesture);
    ipcRenderer.send("gestures-channel", gesture);
  },
  // Return the runtime resources path (useful in packaged apps)
  getResourcesPath: () => {
    try {
      return process.resourcesPath || "";
    } catch {
      return "";
    }
  },
});
