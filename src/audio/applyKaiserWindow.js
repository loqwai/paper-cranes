export function applyKaiserWindow(audioBuffer, beta = 5.658) {
    // Beta default based on common use
    const N = audioBuffer.length
    const windowedBuffer = new Float32Array(N)
    const I0Beta = I0(beta) // Calculate the zeroth order modified Bessel function of the first kind for beta

    for (let n = 0; n < N; n++) {
        const windowValue = I0(beta * Math.sqrt(1 - Math.pow((2 * n) / (N - 1) - 1, 2))) / I0Beta
        windowedBuffer[n] = audioBuffer[n] * windowValue
    }

    return windowedBuffer
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
