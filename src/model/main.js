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
    console.log(`Tunnistettu ele: ${gesture.categoryName}`);
    document.getElementById("gesture").innerHTML =
      `<p>Ele: ${gesture.categoryName}</p>`;

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
    // ---------------------------------

    // tunnistettu ele -> nut.js key press
    // if (currentGesture === "Thumb_Up") {
    //   key_output.innerText = "W";
    //   currentKey = await keyboard.pressKey(Key.W);
    // } else if (currentGesture === "Thumb_Down") {
    //   key_output.innerText = "S";
    //   currentKey = await keyboard.pressKey(Key.S);
    // } else if (currentGesture === "Victory") {
    //   key_output.innerText = "A";
    //   currentKey = await keyboard.pressKey(Key.A);
    // } else if (currentGesture === "Open_Palm") {
    //   key_output.innerText = "D";
    //   currentKey = await keyboard.pressKey(Key.D);
    // } else if (currentGesture === "Closed_Fist") {
    //   key_output.innerText = "space";
    //   currentKey = await keyboard.pressKey(Key.Space);
    // } else {
    //   key_output.innerText = `Key: `;
    //   await keyboard.releaseKey(Key.W);
    //   await keyboard.releaseKey(Key.A);
    //   await keyboard.releaseKey(Key.S);
    //   await keyboard.releaseKey(Key.D);
    //   await keyboard.releaseKey(Key.Space);
    // }
  }
  canvasCtx.restore();

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
};
