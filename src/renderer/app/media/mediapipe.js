import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Load the wasm assets and create a HandLandmarker instance.
// Returns { handLandmarker }
export async function initHandLandmarker() {
    const vision = await FilesetResolver.forVisionTasks('./wasm');
    try {
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: 'app/models/hand_landmarker.task', delegate: 'GPU' },
            runningMode: 'VIDEO',
            numHands: 2
        });
        return { handLandmarker };
    } catch (e) {
        console.warn('GPU delegate failed, falling back to CPU:', e?.message || e);
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: 'app/models/hand_landmarker.task', delegate: 'CPU' },
            runningMode: 'VIDEO',
            numHands: 2
        });
        return { handLandmarker };
    }
}
