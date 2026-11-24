// The pad's view of the wall (docs/phone-wall.md): is there a second screen, did he project, is the
// wall alive. Pure, so the whole lifecycle is a table test (state.test.js).
//
//   none ──screen──▶ available ──project──▶ connecting ──linked──▶ presenting
//    ▲                  │                       │ failed                │ unlinked
//    └────no screen─────┘◀──────────────────────┘                      ▼
//                                     presenting ◀──────linked────── lost ──dismiss──▶ none/available
//
// `linked` is accepted from any state: a wall opened some other way (a Chrome window he put on the
// external display himself) links the pad with no tap at all.

export const initialWall = Object.freeze({ state: 'none', screen: false, via: null })

export const stepWall = (s, event) => {
  switch (event.type) {
    case 'screen': {
      const screen = Boolean(event.present)
      if (s.state === 'none' && screen) return { ...s, screen, state: 'available' }
      if (s.state === 'available' && !screen) return { ...s, screen, state: 'none' }
      return { ...s, screen }
    }
    case 'project':
      if (s.state === 'available' || s.state === 'lost') return { ...s, state: 'connecting' }
      return s
    case 'failed':
      if (s.state !== 'connecting') return s
      return { ...s, state: s.via ? 'lost' : s.screen ? 'available' : 'none' }
    case 'linked':
      return { ...s, state: 'presenting', via: event.via ?? s.via ?? 'channel' }
    case 'unlinked':
      if (s.state !== 'presenting') return s
      return { ...s, state: 'lost' }
    case 'dismiss':
      if (s.state !== 'lost') return s
      return { ...s, state: s.screen ? 'available' : 'none', via: null }
    default:
      return s
  }
}

/** What the pad draws for a state: nothing new on a phone with no second screen. */
export const wallView = (s) => ({
  chip: { none: null, available: null, connecting: 'WALL…', presenting: 'WALL ✓', lost: 'NO WALL' }[s.state],
  project: s.state === 'available' || (s.state === 'lost' && s.screen),
  banner: s.state === 'lost',
})
