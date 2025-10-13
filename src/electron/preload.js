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
  // test
  etittavaFunkkis: (msg) => {
    console.log("etittavaFunkkis called from renderer:", msg);
  },
});
