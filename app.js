import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import './styles.css';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

let handLandmarker;
let runningMode = "VIDEO";
let scene, camera, renderer, handGroup;

function initThreeJS(canvas) {
  scene = new THREE.Scene();

  // Camera field of view and aspect
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  // Center the camera on the scene
  camera.position.set(0, 0, 20); // move back so hands are visible
  camera.lookAt(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  handGroup = new THREE.Group();
  scene.add(handGroup);
}

function updateHandMesh(landmarks, handLabel) {
  const color = handLabel === "Left" ? 0xff0000 : 0x00ff00;
  const sphereMaterial = new THREE.MeshBasicMaterial({ color });
  const lineMaterial = new THREE.LineBasicMaterial({ color });

  const scale = 25;    // bigger hands
  const offsetX = 0;   // center X
  const offsetY = 0;   // center Y

  landmarks.forEach(landmark => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), sphereMaterial);
    sphere.position.set(
      -(landmark.x * scale - offsetX),
      -(landmark.y * scale - offsetY),
      landmark.z * scale
    );
    handGroup.add(sphere);
  });

  const positions = [];
  HAND_CONNECTIONS.forEach(([start, end]) => {
    const startLM = landmarks[start];
    const endLM = landmarks[end];
    positions.push(
      -(startLM.x * scale - offsetX), -(startLM.y * scale - offsetY), startLM.z * scale,
      -(endLM.x * scale - offsetX), -(endLM.y * scale - offsetY), endLM.z * scale
    );
  });

  const lineGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  handGroup.add(lines);
}

function onWindowResize() {
  const canvas = document.getElementById("canvas");
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

async function init() {
  console.log("Starting app initialization...");

  try {
    const canvas = document.getElementById("canvas");
    initThreeJS(canvas);
    window.addEventListener("resize", onWindowResize, false);

    const video = document.getElementById("video");
    video.style.transform = "scaleX(-1)"; // mirror for user view

    // Helper to stop any existing stream tracks before switching
    function stopCurrentStream() {
      const s = video.srcObject;
      if (s && s.getTracks) {
        s.getTracks().forEach(t => t.stop());
      }
      video.srcObject = null;
    }

    async function startStream(deviceId) {
      try {
        // If switching cameras, stop previous tracks
        if (video.srcObject) {
          stopCurrentStream();
        }

        const constraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();
        console.log("Webcam stream started");
        return stream;
      } catch (error) {
        console.error("Webcam access failed:", error);
        // Provide clearer user feedback based on error type
        if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
          alert("Camera access was denied. Please allow access and try again.");
        } else if (error && error.name === 'NotFoundError') {
          alert("No camera found. Please connect a webcam and try again.");
        } else {
          alert("Failed to access webcam. Check permissions and device availability.");
        }
        throw error;
      }
    }

    // 1) Request camera access first to trigger permission prompt
    await startStream();

    // 2) After permission granted and a stream is active, enumerate devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === "videoinput");

      const deviceSelect = document.getElementById("devices");
      const deviceContainer = document.getElementById("camera-select");
      if (videoInputs.length > 1 && deviceSelect) {
        deviceContainer.style.display = "block";
        // Clear existing options first
        deviceSelect.innerHTML = "";
        videoInputs.forEach((d, i) => {
          const option = document.createElement("option");
          option.value = d.deviceId;
          option.text = d.label || `Camera ${i + 1}`;
          deviceSelect.appendChild(option);
        });

        deviceSelect.addEventListener("change", async () => {
          await startStream(deviceSelect.value);
        });
      }
    } catch (e) {
      console.warn("Device enumeration failed:", e);
    }

    // 3) Initialize Mediapipe after we know the environment is ready
    const vision = await FilesetResolver.forVisionTasks("./dist/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "app/models/hand_landmarker.task", delegate: "GPU" },
      runningMode,
      numHands: 2
    });

    await new Promise(resolve => {
      if (video.readyState >= 2) return resolve();
      video.onloadedmetadata = () => resolve();
    });

    detect();

  } catch (error) {
    console.error("Initialization failed:", error);
  }
}

async function detect() {
  const video = document.getElementById("video");
  if (!handLandmarker || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    requestAnimationFrame(detect);
    return;
  }

  try {
    const results = await handLandmarker.detectForVideo(video, performance.now());
    handGroup.clear();

    if (results.landmarks && results.landmarks.length > 0) {
      for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const handLabel = results.handedness[i]?.categoryName || "Unknown"; // Left or Right
        updateHandMesh(landmarks, handLabel);
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(detect);

  } catch (error) {
    console.error("Detection error:", error);
    requestAnimationFrame(detect);
  }
}

init();
