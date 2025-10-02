import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { keyboard, Key } = require("@nut-tree-fork/nut-js");

// Luodaan Gesture Recognizer *******************

let gestureRecognizer;
let webcamRunning = false;
const runningMode = "VIDEO";

const createGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU",
    },
    runningMode: runningMode, // IMAGE tai VIDEO
    numHands: 2, // käsien lkm
  });
};

createGestureRecognizer();

// **********************************************

// WEBCAMERA JA CANVAS ************************

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

// Käynnistetään kamera
const startWebCamera = () => {
  if (!gestureRecognizer) {
    setTimeout(startWebCamera, 200);
    return;
  }
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
startWebCamera();
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

  // Eleenn tunnistus
  if (results.gestures && results.gestures.length > 0) {
    const gesture = results.gestures[0][0];
    console.log(`Tunnistettu ele: ${gesture.categoryName} (${gesture.score})`);
    document.getElementById("gesture").innerHTML =
      `<p>Ele: ${gesture.categoryName}</p>`;

    const key_output = document.getElementById("key_output");

    // tunnistettu ele nut.js
    if (gesture && gesture.categoryName === "Thumb_Up") {
      // console.log("w");
      key_output.innerHTML = "W";
      await keyboard.pressKey(Key.W);
      await keyboard.releaseKey(Key.W); // tsekkaa tää myöhemmin
    } else if (gesture && gesture.categoryName === "Thumb_Down") {
      key_output.innerHTML = "S";
      await keyboard.pressKey(Key.S);
      await keyboard.releaseKey(Key.S);
    } else if (gesture && gesture.categoryName === "Victory") {
      key_output.innerHTML = "A";
      await keyboard.pressKey(Key.A);
      await keyboard.releaseKey(Key.A);
    } else if (gesture && gesture.categoryName === "Open_Palm") {
      key_output.innerHTML = "D";
      await keyboard.pressKey(Key.D);
      await keyboard.releaseKey(Key.D);
    } else {
      key_output.innerHTML = `Key: `;
    }
  }

  canvasCtx.restore();

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
  // nut.js testi
  // window.addEventListener("keydown", async (event) => {
  //   if (event.key.toLowerCase() === "w") {
  //     await keyboard.pressKey(Key.W);
  //     await keyboard.releaseKey(Key.W);
  //     document.getElementById("key_output").innerText = "W painettu!";
  //   }
  // });
};