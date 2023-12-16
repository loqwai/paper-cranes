
function mu(i, amplitudeSpect) {
  let numerator = 0;
  let denominator = 0;

  for (let k = 0; k < amplitudeSpect.length; k++) {
    numerator += Math.pow(k, i) * Math.abs(amplitudeSpect[k]);
    denominator += amplitudeSpect[k];
  }

  if (denominator === 0) return 0; // Prevent division by zero
  return numerator / denominator;
}

function calculateSpectralCentroid(ampSpectrum) {
  return mu(1, ampSpectrum);
}


onmessage = function(event) {
  const spectralCentroid = calculateSpectralCentroid(event.data);
  postMessage(spectralCentroid);
};
