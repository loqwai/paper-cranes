export function applyHanningWindow(audioBuffer) {
  const N = audioBuffer.length;
  const windowedBuffer = new Float32Array(N);

  for (let n = 0; n < N; n++) {
      const windowValue = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
      windowedBuffer[n] = audioBuffer[n] * windowValue;
  }

  return windowedBuffer;
}
