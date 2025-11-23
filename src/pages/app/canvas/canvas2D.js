import { GestureRecognizer } from "@mediapipe/tasks-vision";
/* import { HAND_CONNECTIONS } from "./handConnections"; */
/* const video = document.getElementById("video"); */

async function draw(results, canvas, canvasCtx, drawingUtils) {
  canvasCtx.save();
  canvas.width = window.screen.width / 6;
  canvas.height = window.screen.height / 6;
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

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
      /*       drawingUtils.drawLandmarks(landmarks, {
        color: "#5555FF",
        lineWidth: 0.2,
      }); */
      const indexFingerTip = [landmarks[8]];
      drawingUtils.drawLandmarks(indexFingerTip, {
        color: "#ffffffff",
        fillColor: "#ffffff73",
        lineWidth: 2,
        radius: 15,
      });
    }
  }
  canvasCtx.restore();
}

export { draw };
