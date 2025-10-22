import {
  FilesetResolver,
  HandLandmarker,
  GestureRecognizer,
} from "@mediapipe/tasks-vision";

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

// Load the wasm assets and create a HandLandmarker instance.
// Returns { handLandmarker }
export async function initHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks("./wasm");
  try {
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "models/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "LIVE_STREAM",
      /*       min_hand_detection_confidence: 0.5,
      min_hand_presence_confidence: 0.5,
      min_tracking_confidence: 0.5, */
      numHands: 2,
    });
    return { handLandmarker };
  } catch (e) {
    console.warn("GPU delegate failed, falling back to CPU:", e?.message || e);
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "models/hand_landmarker.task",
        delegate: "CPU",
      },
      runningMode: "LIVE_STREAM",
      numHands: 2,
    });
    return { handLandmarker };
  }
}
