export function applyKaiserWindow(sharedBuffer, beta = 5.658) {
    // The shared buffer is assumed to be a Float32Array buffer
    const audioBuffer = new Float32Array(sharedBuffer)
    const N = audioBuffer.length
    const I0Beta = I0(beta) // Calculate the zeroth order modified Bessel function of the first kind for beta

    for (let n = 0; n < N; n++) {
        const windowValue = I0(beta * Math.sqrt(1 - Math.pow((2 * n) / (N - 1) - 1, 2))) / I0Beta
        // Directly modify the shared buffer's data
        audioBuffer[n] *= windowValue
    }

    // No need to return the buffer as it's directly modified
}

// Calculate the zeroth order modified Bessel function of the first kind
// This approximation is suitable for the window function calculation
function I0(x) {
    let sum = 1.0
    let y = x / 2.0
    let term = 1.0
    let k = 1

    while (term > 1e-6 * sum) {
        // Continue until the added value is insignificant
        term *= (y / k) ** 2
        sum += term
        k++
    }

    return sum
}
