// ?video=<label substring> opens the camera / capture card whose label contains it; ?video=default
// takes the OS default camera. A name that matches nothing is an error, never another device.
// ?video_mix=<0..1>, default 1: how much of the backbuffer is live video vs the real last frame.
// Absent or empty (?video_mix=) means the default.
export const parseVideoMix = (raw) => {
    const mix = Number(raw || 1)
    if (Number.isNaN(mix) || mix < 0 || mix > 1) throw new Error(`video_mix "${raw}" must be a number in 0..1`)
    return mix
}

const SIZE = { width: { ideal: 1920 }, height: { ideal: 1080 } }

// Labels are blank until camera permission is granted. Only then probe, because the probe opens the
// OS default camera, and a busy default would block a request for some other, free device.
const listVideoInputs = async () => {
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput')
    if (inputs.some(d => d.label)) return inputs
    const permission = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    permission.getTracks().forEach(track => track.stop())
    return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput')
}

const pickVideoInput = async (wanted) => {
    if (wanted === 'default') return {}
    const inputs = await listVideoInputs()
    const match = inputs.find(d => d.label.toLowerCase().includes(wanted.toLowerCase()))
    if (!match) throw new Error(`video "${wanted}" not found; inputs: ${inputs.map(d => d.label).join(', ')}`)
    return { deviceId: { exact: match.deviceId } }
}

export const openVideoInput = async (wanted) => {
    if (!wanted) throw new Error('video param is empty; use video=default or a label substring')
    const stream = await navigator.mediaDevices.getUserMedia({ video: { ...SIZE, ...(await pickVideoInput(wanted)) }, audio: false })
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    await video.play()
    const track = stream.getVideoTracks()[0]
    window.cranes.videoInputLabel = track.label
    // An unplugged card ends the track and the last frame would freeze on screen with no error.
    track.addEventListener('ended', () => {
        console.error(`video input "${track.label}" ended`)
        window.cranes.videoInputLabel = null
    })
    return video
}
