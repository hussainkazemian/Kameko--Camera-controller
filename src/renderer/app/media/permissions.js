// Camera permissions and device management utilities.
// Exposes: requestStream(deviceId?), enumerateVideoInputs(), stopStream(stream|videoEl)
export function stopStream(target) {
    const stream = target && target.srcObject ? target.srcObject : target;
    if (stream && stream.getTracks) {
        stream.getTracks().forEach(t => t.stop());
    }
    if (target && target.srcObject) target.srcObject = null;
}

export async function requestStream(videoEl, deviceId) {
    // deviceId optional: if provided, request exactly that device; else prompt default
    const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoEl) {
            stopStream(videoEl); // ensure previous is closed
            videoEl.srcObject = stream;
            await videoEl.play();
        }
        return stream;
    } catch (error) {
        // Map common errors to user-friendly messages
        if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
            throw new Error('Camera access denied by user or system.');
        } else if (error && error.name === 'NotFoundError') {
            throw new Error('No camera device found.');
        } else {
            throw new Error('Failed to access webcam. Check device and permissions.');
        }
    }
}

export async function enumerateVideoInputs() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
}
