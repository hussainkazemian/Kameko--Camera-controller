import { GestureRecognizer } from "@mediapipe/tasks-vision";
/* import { HAND_CONNECTIONS } from "./handConnections"; */
/* const video = document.getElementById("video"); */

async function draw(results, canvas, canvasCtx, drawingUtils) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = window.screen.width;
  canvas.height = window.screen.height;
  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        GestureRecognizer.HAND_CONNECTIONS,
        {
          color: "#5555FF",
          lineWidth: 1,
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#5555FF",
        lineWidth: 0.5,
      });
    }
  }
  canvasCtx.restore();
}

export { draw };
