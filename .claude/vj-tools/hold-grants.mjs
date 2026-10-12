import { chromium } from 'playwright'

const CDP_URL = process.argv[2]
const origin = process.argv[3]
const browser = await chromium.connectOverCDP(CDP_URL)
const context = browser.contexts()[0]
await context.grantPermissions(['microphone', 'midi', 'midi-sysex'], { origin })
const page = context.pages()[0]
const r = await page.evaluate(async () => {
  await import('/src/midi.js?retry=' + Date.now())
  await new Promise(r => setTimeout(r, 500))
  const a = await navigator.requestMIDIAccess()
  return [...a.inputs.values()].map(i => `${i.name}:${i.connection}`)
})
console.log('midi inputs', JSON.stringify(r))
process.on('SIGTERM', () => process.exit(0))
setInterval(() => {}, 1 << 30)
