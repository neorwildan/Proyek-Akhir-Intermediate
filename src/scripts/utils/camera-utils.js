let cameraStream = null;

export const initCamera = async (videoElement) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    videoElement.srcObject = stream;
    return stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    throw new Error('Tidak dapat mengakses kamera');
  }
};

export const stopCamera = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
};