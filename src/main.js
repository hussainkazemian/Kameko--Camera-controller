import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

// Luodaan Gesture Recognizer *******************

let gestureRecognizer;
let webcamRunning = false;
const runningMode = "VIDEO";

const createGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks("./wasm");
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "./src/model/gesture_recognizer.task",
      delegate: "GPU",
    },
    runningMode: runningMode, // IMAGE tai VIDEO
    numHands: 2, // käsien lkm
  });

  // Käynnistetään kamera vasta kun gesture recognizer on valmis
  startWebCamera();
};
createGestureRecognizer();

// **********************************************

// WEBCAMERA JA CANVAS ************************

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

// Käynnistetään kamera
const startWebCamera = () => {
  if (webcamRunning === true) {
    return;
  }
  webcamRunning = true;
  const constraints = { video: true };

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
    video.addEventListener("loadeddata", () => {
      // asetetaan canvasin koko videon kokoon
      canvasElement.width = video.videoWidth;
      canvasElement.height = video.videoHeight;

      predictWebcam();
    });
  });
};
// **********************************************

// Ennustetaan ja piirretään tulokset ***********

let lastVideoTime = -1;
let results = undefined;

const predictWebcam = async () => {
  const webcamElement = document.getElementById("webcam");
  let nowInMs = Date.now();

  if (webcamElement.currentTime !== lastVideoTime) {
    lastVideoTime = webcamElement.currentTime;
    // tallennetaan landmarkit ja gesturet
    results = gestureRecognizer.recognizeForVideo(webcamElement, nowInMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  const drawingUtils = new DrawingUtils(canvasCtx);

  // Piirretään HAND LANDMARKS
  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        GestureRecognizer.HAND_CONNECTIONS,
        {
          color: "#00FF00",
          lineWidth: 1,
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#9069c0ff",
        lineWidth: 2,
      });
      const indexFingerTip = [landmarks[8]];
      drawingUtils.drawLandmarks(indexFingerTip, {
        color: "#FF0000",
        lineWidth: 3,
      });
    }
  }
  canvasCtx.restore();

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
};
