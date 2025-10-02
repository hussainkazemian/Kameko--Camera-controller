import * as THREE from "three";
import { HAND_CONNECTIONS } from "./handConnections";

// HandScene encapsulates the Three.js scene, camera, renderer and rendering helpers.
// Responsibilities:
// - Initialize and resize a full-viewport canvas.
// - Render landmarks as spheres and bones as lines.
// - Provide helpers to clear and update the hand meshes per frame.

export class HandScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    // Wider FOV and proper aspect; near/far planes suitable for 3D hand depth
    this.camera = new THREE.PerspectiveCamera(
      70,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // crisper lines/points
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Position camera farther back so the hand appears larger and centralized after scaling
    this.camera.position.set(0, 0, 35);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(1, 2, 2);

    this.scene.add(ambientLight);
    this.scene.add(directionalLight);

    this.handGroup = new THREE.Group();
    this.scene.add(this.handGroup);

    // Materials reused per frame to avoid allocations
    this.materials = {
      left: {
        sphere: new THREE.MeshBasicMaterial({ color: 0xff5555 }),
        line: new THREE.LineBasicMaterial({ color: 0xff5555 }),
      },
      right: {
        sphere: new THREE.MeshBasicMaterial({ color: 0x55ff55 }),
        line: new THREE.LineBasicMaterial({ color: 0x55ff55 }),
      },
      unknown: {
        sphere: new THREE.MeshBasicMaterial({ color: 0x9999ff }),
        line: new THREE.LineBasicMaterial({ color: 0x9999ff }),
      },
    };

    window.addEventListener("resize", () => this.onResize());
  }

  onResize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  clearHands() {
    this.handGroup.clear();
  }
  // Inside export class HandScene { ... }
  getFrustumSizeAtZ(z = 0) {
    const distance = Math.abs(this.camera.position.z - z);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.camera.aspect;
    return { width, height };
  }

  // Update the scene with new landmarks from one hand.
  // landmarks: Array<{x,y,z}>
  // handedness: 'Left' | 'Right' | 'Unknown'
  // Replace updateHand(landmarks, handedness) with:
  updateHand(landmarks, handedness) {
    const mats =
      this.materials[(handedness || "unknown").toLowerCase()] ||
      this.materials.unknown;

    // World-space size of the viewport at z=0
    const { width, height } = this.getFrustumSizeAtZ(0);

    // Slight margin so points/lines don’t go past edges
    const margin = 0.95;
    const halfW = (width * margin) / 2;
    const halfH = (height * margin) / 2;

    // Mirror on X for user-facing camera (selfie view)
    const mapX = (x) => (x - 0.5) * (2 * halfW) * -1;
    // Invert Y because image Y grows downward; 0.5 centers it
    const mapY = (y) => (0.5 - y) * (2 * halfH);
    // Depth scale small relative to width so Z is visible but not exaggerated
    const zScale = width * 0.02;

    // Slightly bigger points relative to viewport size
    const pointSize = Math.max(0.35, width * 0.008);
    const sphereGeom = new THREE.SphereGeometry(pointSize, 12, 12);

    // Points
    for (const lm of landmarks) {
      const sphere = new THREE.Mesh(sphereGeom, mats.sphere);
      sphere.position.set(mapX(lm.x), mapY(lm.y), (lm.z || 0) * zScale);
      this.handGroup.add(sphere);
    }

    // Bones
    const positions = [];
    for (const [a, b] of HAND_CONNECTIONS) {
      const la = landmarks[a];
      const lb = landmarks[b];
      positions.push(
        mapX(la.x),
        mapY(la.y),
        (la.z || 0) * zScale,
        mapX(lb.x),
        mapY(lb.y),
        (lb.z || 0) * zScale
      );
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    const lines = new THREE.LineSegments(lineGeometry, mats.line);
    this.handGroup.add(lines);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

export function draw3D(results, scene) {
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
}
