import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

// WITH CUSTOM GESTUREMODEL
export async function initGestureRecognizer() {
  // Determine where the wasm assets are at runtime. In packaged apps Electron
  // places extra resources under process.resourcesPath; we expose that path via
  // the preload bridge as `appBridge.getResourcesPath()` so the renderer can
  // find the emitted `dist/wasm` folder. Fall back to the local `./wasm` for
  // development.
  const resourcesPath =
    window.appBridge && window.appBridge.getResourcesPath
      ? window.appBridge.getResourcesPath()
      : "";
  const wasmBase = resourcesPath ? `${resourcesPath}/dist/wasm` : "./wasm";
  const vision = await FilesetResolver.forVisionTasks(wasmBase);
  try {
    const gestureRecognizer = await GestureRecognizer.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: "models/gesture_recognizer.task",
          delegate: "GPU",
        },
        runningMode: "LIVE_STREAM", // IMAGE tai VIDEO
        numHands: 2, // käsien lkm
      }
    );
    return { gestureRecognizer };
  } catch (e) {
    console.warn("GPU delegate failed, falling back to CPU:", e?.message || e);
    const gestureRecognizer = await GestureRecognizer.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: "models/gesture_recognizer.task",
          delegate: "CPU",
        },
        runningMode: "LIVE_STREAM",
        numHands: 2,
      }
    );
    return { gestureRecognizer };
  }
}
