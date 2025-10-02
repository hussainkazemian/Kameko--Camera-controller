import "../overlay.css";
/* import { HandScene, draw3D } from "./canvas/canvas3D"; */
import { draw } from "./canvas/canvas2D";
import { DrawingUtils } from "@mediapipe/tasks-vision";
import {
  requestStream,
  enumerateVideoInputs,
  /* stopStream, */
} from "./media/camera";
import { initHandLandmarker } from "./media/mediapipe";

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

  async function detect(handLandmarker = undefined) {
    if (!handLandmarker) {
      console.log("Loading hand model...");
      handLandmarker = (await initHandLandmarker()).handLandmarker;
    }
    try {
      const ts = performance.now();
      const results = await handLandmarker.detectForVideo(video, ts);

      draw(results, canvas, canvasCtx, drawingUtils);
      /* draw3D(results, scene); */
    } catch (e) {
      console.error(e.message + "Detection error");
    }
    requestAnimationFrame(() => detect(handLandmarker));
  }
}

main();
