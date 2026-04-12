const STORAGE_KEY = 'cranes-midi-profiles'

const makeCCKey = (ccNumber, channel) =>
  channel === 1 ? `${ccNumber}` : `${ccNumber}_${channel}`

const loadProfiles = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 1, profiles: {} }
    const data = JSON.parse(raw)
    if (data.version === 1) return data
    return { version: 1, profiles: {} }
  } catch {
    return { version: 1, profiles: {} }
  }
}

const saveProfiles = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const createMidiMapper = () => {
  let data = loadProfiles()
  let learnResolve = null
  let learnReject = null
  let learnTargetKnobIndex = null

  const persist = () => saveProfiles(data)

  const getProfile = (deviceName) => data.profiles[deviceName] ?? null

  const getAllProfiles = () => ({ ...data.profiles })

  const deleteProfile = (deviceName) => {
    delete data.profiles[deviceName]
    persist()
  }

  const ensureProfile = (deviceName) => {
    if (!data.profiles[deviceName]) {
      data.profiles[deviceName] = {
        deviceName,
        updatedAt: new Date().toISOString(),
        mappings: {},
      }
    }
    return data.profiles[deviceName]
  }

  const mapCCToKnob = (deviceName, ccNumber, channel) => {
    const profile = getProfile(deviceName)
    if (!profile) return null
    const key = makeCCKey(ccNumber, channel)
    const knobIndex = profile.mappings[key]
    if (knobIndex == null) return null
    return `knob_${knobIndex}`
  }

  const getNextAvailableIndex = (profile) => {
    const usedIndices = new Set(Object.values(profile.mappings))
    let index = 1
    while (usedIndices.has(index)) index++
    return index
  }

  const autoAssign = (deviceName, ccNumber, channel) => {
    const profile = ensureProfile(deviceName)
    const key = makeCCKey(ccNumber, channel)

    // Already mapped
    const existing = profile.mappings[key]
    if (existing != null) return `knob_${existing}`

    const index = getNextAvailableIndex(profile)
    profile.mappings[key] = index
    profile.updatedAt = new Date().toISOString()
    persist()
    return `knob_${index}`
  }

  const isLearning = () => learnTargetKnobIndex != null

  const startLearn = (targetKnobIndex) => {
    cancelLearn()
    learnTargetKnobIndex = targetKnobIndex
    return new Promise((resolve, reject) => {
      learnResolve = resolve
      learnReject = reject
    })
  }

  const cancelLearn = () => {
    if (learnReject) {
      learnReject(new Error('Learn cancelled'))
    }
    learnResolve = null
    learnReject = null
    learnTargetKnobIndex = null
  }

  const handleLearnCC = (deviceName, ccNumber, channel) => {
    if (!isLearning()) return false

    const profile = ensureProfile(deviceName)
    const key = makeCCKey(ccNumber, channel)

    // Remove any existing mapping that points to this knob index
    for (const [k, v] of Object.entries(profile.mappings)) {
      if (v === learnTargetKnobIndex) delete profile.mappings[k]
    }

    // Remove any existing mapping for this CC (reassigning it)
    delete profile.mappings[key]

    profile.mappings[key] = learnTargetKnobIndex
    profile.updatedAt = new Date().toISOString()
    persist()

    const result = { deviceName, ccNumber, channel, knobIndex: learnTargetKnobIndex, ccKey: key }
    const resolve = learnResolve
    learnResolve = null
    learnReject = null
    learnTargetKnobIndex = null
    if (resolve) resolve(result)
    return true
  }

  const getMappedCC = (deviceName, knobIndex) => {
    const profile = getProfile(deviceName)
    if (!profile) return null
    for (const [key, idx] of Object.entries(profile.mappings)) {
      if (idx === knobIndex) return key
    }
    return null
  }

  return {
    getProfile,
    getAllProfiles,
    deleteProfile,
    mapCCToKnob,
    autoAssign,
    isLearning,
    startLearn,
    cancelLearn,
    handleLearnCC,
    getMappedCC,
  }
}
