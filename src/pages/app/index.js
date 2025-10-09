import "../overlay.css";
/* import { HandScene, draw3D } from "./canvas/canvas3D"; */
import { draw } from "./canvas/canvas2D";
import { DrawingUtils } from "@mediapipe/tasks-vision";
import {
  requestStream,
  enumerateVideoInputs,
  /* stopStream, */
} from "./media/camera";
import {
  /* initHandLandmarker, */ initGestureRecognizer,
} from "./media/mediapipe";
/* import { keyboard, Key } from "@nut-tree-fork/nut-js"; */

// Entry bootstrapping of the renderer app.
async function main() {
  const status = document.getElementById("status");
  const canvas = document.getElementById("canvas");
  const video = document.getElementById("video");
  const deviceContainer = document.getElementById("camera-select");
  const deviceSelect = document.getElementById("devices");
  if (!canvas || !video) {
    console.error("Canvas or video element not found in DOM");
    if (status) status.textContent = "Error: canvas/video element not found.";
    return;
  }

  //////////////////
  // for 3D canvas
  /*   const scene = new HandScene(canvas); */
  //////
  // for 2D canvas
  const canvasCtx = canvas.getContext("2d");
  canvas.width = 1280; // canvas resolution
  canvas.height = 720;
  const drawingUtils = new DrawingUtils(canvasCtx);
  canvas.style.transform = "rotateY(180deg)"; // mirror 2D canvas
  ////////////////////

  // Enumerate Video inpput devices then executes a prompt for video detection --> requestStream
  const inputs = await enumerateVideoInputs().then(async (_inputs) => {
    if (_inputs.length === 0) {
      // if no devices found Will return empty array withot executing
      console.log("No Video inpput device found...");
      return [];
    }
    try {
      await requestStream(video, _inputs[0].deviceId, detect); // triggers permission prompt and starts detection
    } catch (e) {
      console.error(e);
    }
    return _inputs; // returns _inputs for const inputs
  });

  // if camera devices have been found camera selection dropdown menu will be enamble
  // TODO move to setting menu
  if (inputs.length > 1) {
    deviceContainer.style.display = "block";
    deviceSelect.innerHTML = "";
    inputs.forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.text = d.label || `Camera ${i + 1}`;
      deviceSelect.appendChild(opt);
    });
    deviceSelect.addEventListener("change", async () => {
      try {
        console.log(
          `Switching to: ${
            deviceSelect.options[deviceSelect.selectedIndex].text
          }`
        );
        await requestStream(video, deviceSelect.value, detect);
      } catch (e) {
        console.error(e.message + "Failed to switch camera");
      }
    });
  }

  async function detect(
    /* handLandmarker = undefined, */
    gestureRecognizer = undefined
  ) {
    if (/* !handLandmarker ||  */ !gestureRecognizer) {
      console.log("Loading hand model...");
      /* handLandmarker = (await initHandLandmarker()).handLandmarker; */
      gestureRecognizer = (await initGestureRecognizer()).gestureRecognizer;
    }
    try {
      const ts = performance.now();
      /*       const results = await handLandmarker.detectForVideo(video, ts); */
      const results = await gestureRecognizer.recognizeForVideo(video, ts);
      if (results.gestures && results.gestures.length > 0) {
        const gesture = results.gestures[0][0];
        console.log(gesture.categoryName);
      }

      draw(results, canvas, canvasCtx, drawingUtils);
      /* draw3D(results, scene); */

      /*       '// Eleenn tunnistus
      if (results.gestures && results.gestures.length > 0) {
        const gesture = results.gestures[0][0];
        console.log(`Tunnistettu ele: ${gesture.categoryName}`);
        document.getElementById(
          "gesture"
        ).innerHTML = `<p>Ele: ${gesture.categoryName}</p>`;

        const key_output = document.getElementById("key_output");

        let currentGesture = gesture.categoryName;
        let currentKey;

        // siistitty versio ----------------
        const gestureObject = {
          Thumb_Up: { key: Key.W, label: "W" },
          Thumb_Down: { key: Key.S, label: "S" },
          Victory: { key: Key.A, label: "A" },
          Open_Palm: { key: Key.D, label: "D" },
          Closed_Fist: { key: Key.Space, label: "space" },
        };
        const gestureKey = gestureObject[currentGesture];

        if (gestureKey) {
          currentKey = await keyboard.pressKey(gestureKey.key);
          key_output.innerText = `Key: ${gestureKey.label}`;
        } else {
          key_output.innerText = "Key: ";
          Object.values(gestureObject).forEach(async ({ key }) => {
            await keyboard.releaseKey(key);
            currentKey = null;
          });
        }
      }
      // --------------------------------- */
    } catch (e) {
      console.error(e.message + "Detection error");
    }
    requestAnimationFrame(() =>
      detect(/* handLandmarker, */ gestureRecognizer)
    );
  }
}

main();
