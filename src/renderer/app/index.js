import '../styles/styles.css';
import { HandScene } from './hand/handScene';
import { requestStream, enumerateVideoInputs, stopStream } from './media/permissions';
import { initHandLandmarker } from './media/mediapipe';

// Entry bootstrapping of the renderer app.
(async function main() {
    const status = document.getElementById('status');
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    const deviceContainer = document.getElementById('camera-select');
    const deviceSelect = document.getElementById('devices');

    if (!canvas || !video) {
        console.error('Canvas or video element not found in DOM');
        if (status) status.textContent = 'Error: canvas/video element not found.';
        return;
    }

    const scene = new HandScene(canvas);
    video.style.transform = 'scaleX(-1)';

    function setStatus(msg) {
        if (status) status.textContent = msg;
        console.log('[status]', msg);
    }

    try {
        setStatus('Requesting camera access...');
        await requestStream(video); // triggers permission prompt
        setStatus('Camera access granted. Enumerating devices...');

        // Enumerate after permission to get labels
        const inputs = await enumerateVideoInputs();
        if (inputs.length > 1) {
            deviceContainer.style.display = 'block';
            deviceSelect.innerHTML = '';
            inputs.forEach((d, i) => {
                const opt = document.createElement('option');
                opt.value = d.deviceId;
                opt.text = d.label || `Camera ${i + 1}`;
                deviceSelect.appendChild(opt);
            });
            deviceSelect.addEventListener('change', async () => {
                try {
                    setStatus(`Switching to: ${deviceSelect.options[deviceSelect.selectedIndex].text}`);
                    await requestStream(video, deviceSelect.value);
                } catch (e) {
                    setStatus(e.message || 'Failed to switch camera');
                }
            });
        }

        setStatus('Loading hand model...');
        const { handLandmarker } = await initHandLandmarker();

        setStatus('Starting detection...');
        await new Promise(resolve => {
            if (video.readyState >= 2) return resolve();
            video.onloadedmetadata = () => resolve();
        });

        async function detect() {
            if (!handLandmarker || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
                requestAnimationFrame(detect);
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
                        if (typeof score === 'number' && score < minScore) continue;
                        const handLabel = handness?.categoryName || 'Unknown';
                        scene.updateHand(lm, handLabel);
                    }
                }
                scene.render();
            } catch (e) {
                setStatus(e.message || 'Detection error');
            }
            requestAnimationFrame(detect);
        }

        detect();
    } catch (e) {
        setStatus(e.message || 'Initialization failed');
    }
})();
