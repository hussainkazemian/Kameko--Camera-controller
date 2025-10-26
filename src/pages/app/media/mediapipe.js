import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

// WITH CUSTOM GESTUREMODEL
export async function initGestureRecognizer() {
  const vision = await FilesetResolver.forVisionTasks("./wasm");
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
