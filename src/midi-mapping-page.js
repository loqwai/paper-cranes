import { createMidiMapper } from './midi/MidiMapper.js'

const STORAGE_KEY = 'cranes-midi-profiles'
const KNOB_GRID_SIZE = 32

const mapper = createMidiMapper()

const state = {
  selectedDevice: null,
  liveDevices: new Set(),
  lastValues: {},
  flashUntil: {},
  learningIdx: null,
}

const els = {
  status: document.getElementById('status'),
  devices: document.getElementById('devices'),
  mappings: document.getElementById('mappings'),
  knobs: document.getElementById('knobs'),
}

const parseCCKey = (key) => {
  const [cc, channel] = key.split('_')
  return { cc: Number(cc), channel: channel ? Number(channel) : 1 }
}

const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profiles: mapper.getAllProfiles() }))
}

const ensureSelectedDevice = () => {
  const names = Object.keys(mapper.getAllProfiles())
  if (state.selectedDevice && !names.includes(state.selectedDevice)) state.selectedDevice = null
  if (!state.selectedDevice && names.length > 0) state.selectedDevice = names[0]
}

const renderDevices = () => {
  const profiles = mapper.getAllProfiles()
  const names = Object.keys(profiles)

  if (names.length === 0) {
    els.devices.innerHTML = '<div class="empty">No devices yet.<br>Plug one in and wiggle a knob.</div>'
    return
  }

  els.devices.innerHTML = ''
  for (const name of names) {
    const profile = profiles[name]
    const count = Object.keys(profile.mappings).length
    const div = document.createElement('div')
    div.className = 'device'
    if (name === state.selectedDevice) div.classList.add('active')
    if (state.liveDevices.has(name)) div.classList.add('live')
    div.dataset.device = name
    div.innerHTML = `<div>${name}</div><div class="meta">${count} mapping${count === 1 ? '' : 's'}</div>`
    div.addEventListener('click', () => {
      state.selectedDevice = name
      renderStructure()
    })
    els.devices.appendChild(div)
  }
}

const renderMappings = () => {
  const device = state.selectedDevice
  if (!device) {
    els.mappings.innerHTML = '<div class="empty">Select a device.</div>'
    return
  }
  const profile = mapper.getProfile(device)
  const entries = profile ? Object.entries(profile.mappings) : []
  if (entries.length === 0) {
    els.mappings.innerHTML = '<div class="empty">No mappings yet. Wiggle a knob on the device.</div>'
    return
  }
  entries.sort((a, b) => a[1] - b[1])

  els.mappings.innerHTML = ''
  for (const [ccKey, knobIndex] of entries) {
    const { cc, channel } = parseCCKey(ccKey)

    const row = document.createElement('div')
    row.className = 'row'
    row.dataset.cckey = ccKey
    row.innerHTML = `
      <div class="cc">CC ${cc}${channel !== 1 ? ` ch${channel}` : ''}</div>
      <input class="knob-input" type="number" min="1" max="200" value="${knobIndex}" />
      <div class="bar"><div class="bar-fill"></div></div>
      <button class="unmap" title="Remove mapping">×</button>
    `
    const input = row.querySelector('.knob-input')
    input.addEventListener('change', () => {
      const newIndex = parseInt(input.value, 10)
      if (!Number.isFinite(newIndex) || newIndex < 1) {
        input.value = knobIndex
        return
      }
      remapCC(device, ccKey, newIndex)
    })
    row.querySelector('.unmap').addEventListener('click', () => {
      unmapCC(device, ccKey)
    })
    els.mappings.appendChild(row)
  }
}

const renderKnobs = () => {
  const device = state.selectedDevice
  const profile = device ? mapper.getProfile(device) : null
  const knobToCC = {}
  if (profile) {
    for (const [ccKey, idx] of Object.entries(profile.mappings)) {
      knobToCC[idx] = ccKey
    }
  }

  const maxIdx = Math.max(KNOB_GRID_SIZE, ...Object.keys(knobToCC).map(Number))

  els.knobs.innerHTML = ''
  for (let i = 1; i <= maxIdx; i++) {
    const ccKey = knobToCC[i]
    const tile = document.createElement('div')
    tile.className = 'knob'
    if (ccKey) tile.classList.add('mapped')
    if (state.learningIdx === i) tile.classList.add('learning')
    tile.dataset.idx = String(i)
    if (ccKey) tile.dataset.cckey = ccKey

    const ccLabel = ccKey ? `CC ${parseCCKey(ccKey).cc}` : '—'
    const label = state.learningIdx === i ? 'learning…' : ccLabel

    tile.innerHTML = `
      <div class="idx">knob_${i}</div>
      <div class="cc-label">${label}</div>
      <div class="bar knob-bar"><div class="bar-fill"></div></div>
    `
    tile.addEventListener('click', () => startLearn(i))
    els.knobs.appendChild(tile)
  }
}

const renderStructure = () => {
  ensureSelectedDevice()
  renderDevices()
  renderMappings()
  renderKnobs()
}

const updateLive = () => {
  const device = state.selectedDevice
  if (!device) return
  const now = performance.now()

  els.mappings.querySelectorAll('.row').forEach((row) => {
    const ccKey = row.dataset.cckey
    const value = state.lastValues[`${device}|${ccKey}`] ?? 0
    const fill = row.querySelector('.bar-fill')
    fill.style.width = `${(value / 127 * 100).toFixed(1)}%`
    const flashing = (state.flashUntil[`${device}|${ccKey}`] ?? 0) > now
    row.classList.toggle('flash', flashing)
  })

  els.knobs.querySelectorAll('.knob').forEach((tile) => {
    const ccKey = tile.dataset.cckey
    const value = ccKey ? (state.lastValues[`${device}|${ccKey}`] ?? 0) : 0
    const fill = tile.querySelector('.bar-fill')
    fill.style.width = `${(value / 127 * 100).toFixed(1)}%`
  })
}

const remapCC = (device, ccKey, newIndex) => {
  const profile = mapper.getProfile(device)
  if (!profile) return
  for (const [k, v] of Object.entries(profile.mappings)) {
    if (v === newIndex) delete profile.mappings[k]
  }
  profile.mappings[ccKey] = newIndex
  profile.updatedAt = new Date().toISOString()
  persist()
  renderStructure()
}

const unmapCC = (device, ccKey) => {
  const profile = mapper.getProfile(device)
  if (!profile) return
  delete profile.mappings[ccKey]
  profile.updatedAt = new Date().toISOString()
  persist()
  renderStructure()
}

const startLearn = (knobIndex) => {
  if (mapper.isLearning()) mapper.cancelLearn()
  state.learningIdx = knobIndex
  mapper.startLearn(knobIndex).then(() => {
    state.learningIdx = null
    renderStructure()
  }).catch(() => {
    state.learningIdx = null
    renderStructure()
  })
  renderStructure()
}

const handleCC = (deviceName, cc, channel, value) => {
  const wasNewDevice = !state.liveDevices.has(deviceName)
  state.liveDevices.add(deviceName)
  const ccKey = channel === 1 ? `${cc}` : `${cc}_${channel}`

  state.lastValues[`${deviceName}|${ccKey}`] = value
  state.flashUntil[`${deviceName}|${ccKey}`] = performance.now() + 200

  const profileExisted = mapper.getProfile(deviceName) != null
  const hadMapping = profileExisted && mapper.mapCCToKnob(deviceName, cc, channel) != null

  if (mapper.isLearning()) {
    mapper.handleLearnCC(deviceName, cc, channel)
    renderStructure()
    return
  }

  if (!hadMapping) {
    mapper.autoAssign(deviceName, cc, channel)
    renderStructure()
    return
  }

  if (wasNewDevice) renderStructure()
}

const attachInput = (input) => {
  input.addEventListener('midimessage', (message) => {
    const [command, control, value] = message.data
    const isCC = (command & 0xf0) === 0xb0
    if (!isCC) return
    const channel = (command & 0x0f) + 1
    const deviceName = input.name || 'Unknown MIDI Device'
    handleCC(deviceName, control, channel, value)
  })
}

navigator.requestMIDIAccess().then((midiAccess) => {
  const updateStatus = () => {
    els.status.textContent = `MIDI ready · ${midiAccess.inputs.size} input${midiAccess.inputs.size === 1 ? '' : 's'} connected`
  }
  updateStatus()
  midiAccess.inputs.forEach(attachInput)
  midiAccess.addEventListener('statechange', (e) => {
    if (e.port.type === 'input' && e.port.state === 'connected') attachInput(e.port)
    updateStatus()
  })
}).catch((err) => {
  els.status.textContent = `MIDI failed: ${err.message}`
})

renderStructure()

const tick = () => {
  updateLive()
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
