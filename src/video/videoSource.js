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

const pickVideoInput = async (wanted) => {
    if (wanted === 'default') return {}
    // Permission first: device labels are blank until it is granted.
    const permission = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    permission.getTracks().forEach(track => track.stop())
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput')
    const match = inputs.find(d => d.label.toLowerCase().includes(wanted.toLowerCase()))
    if (!match) throw new Error(`video "${wanted}" not found; inputs: ${inputs.map(d => d.label).join(', ')}`)
    return { deviceId: { exact: match.deviceId } }
}

export const openVideoInput = async (wanted) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { ...SIZE, ...(await pickVideoInput(wanted)) }, audio: false })
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    await video.play()
    window.cranes.videoInputLabel = stream.getVideoTracks()[0].label
    return video
}
