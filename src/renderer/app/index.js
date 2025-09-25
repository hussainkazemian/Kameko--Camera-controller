import "../styles/overlay.css";
import { HandScene } from "./hand/handScene";
import {
  requestStream,
  enumerateVideoInputs,
  stopStream,
} from "./media/permissions";
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

  const scene = new HandScene(canvas);
  video.style.transform = "scaleX(-1)";

  function setStatus(msg) {
    if (status) status.textContent = msg;
    console.log("[status]", msg);
  }

  // Enumerate Video inpput devices then executes a prompt for video detection --> requestStream
  const inputs = await enumerateVideoInputs().then(async (_inputs) => {
    if (_inputs.length === 0) {
      // if no devices found Will return empty array withot executing
      setStatus("No Video inpput device found...");
      return [];
    }
    setStatus("Requesting camera access...");
    await requestStream(video, _inputs[0].deviceId, detect); // triggers permission prompt and starts detection
    setStatus("Camera access granted. Enumerating devices...");
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
        setStatus(
          `Switching to: ${
            deviceSelect.options[deviceSelect.selectedIndex].text
          }`
        );
        await requestStream(video, deviceSelect.value, detect);
      } catch (e) {
        setStatus(e.message + "Failed to switch camera");
      }
    });
  }

  // THIS IS CURENTLY NOT USED AND SHOULD NOT BE USED UNLES NECESSARY
  /*   setStatus("Starting detection...");
  await new Promise((resolve) => {
    if (video.readyState >= 2) return resolve();
    video.onloadedmetadata = () => resolve();
  }); */

  async function detect(handLandmarker = undefined) {
    if (!handLandmarker) {
      setStatus("Loading hand model...");
      handLandmarker = (await initHandLandmarker()).handLandmarker;
    }
    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      // will stop the function if video element is not ready
      // technically redundant due to a check on a higher level
      console.error("Video was not ready");
      return;
    }
    try {
      const ts = performance.now();
      const results = await handLandmarker.detectForVideo(video, ts);
      scene.clearHands();

      // Minimal gating: if score is present and extremely low, skip; otherwise render
      const minScore = 0.1;
      if (results.landmarks && results.landmarks.length > 0) {
        for (let i = 0; i < results.landmarks.length; i++) {
          const lm = results.landmarks[i];
          const handness = results.handedness?.[i];
          const score = handness?.score;
          if (typeof score === "number" && score < minScore) continue;
          const handLabel = handness?.categoryName || "Unknown";
          scene.updateHand(lm, handLabel);
        }
      }
      scene.render();
    } catch (e) {
      setStatus(e.message + "Detection error");
    }
    requestAnimationFrame(() => detect(handLandmarker));
  }
}

main();
