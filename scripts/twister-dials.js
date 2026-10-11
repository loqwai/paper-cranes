#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const SHEET = new URL('../docs/twister-cheatsheet.md', import.meta.url)
const CDP_URL = `http://127.0.0.1:${process.env.SHOW_CDP_PORT || '9333'}`
const WIDTH = 16

const layout = () => readFileSync(SHEET, 'utf8')
  .split('\n')
  .filter(line => /^\| \*\*R\d\*\*/.test(line))
  .map(line => line.split('|').slice(2, -1).map(cell => cell.trim()))

const bar = (v) => '█'.repeat(Math.round(v * 10)).padEnd(10, '·')

const cell = (label, k, v) => `K${String(k).padEnd(3)}${label}`.slice(0, WIDTH).padEnd(WIDTH) + '\n' + `${bar(v)} ${v.toFixed(2)}`.padEnd(WIDTH)

const render = (knobs) => {
  const rows = layout().map((labels, r) => labels.map((label, c) => {
    const k = r * 4 + c + 1
    return cell(label, k, knobs[`knob_${k}`] ?? 0).split('\n')
  }))
  const lines = rows.flatMap(row => [row.map(c => c[0]).join('  '), row.map(c => c[1]).join('  '), ''])
  return `\x1b[2J\x1b[H${lines.join('\n')}\n${new Date().toLocaleTimeString()}  ·  all 0 = show look`
}

const browser = await chromium.connectOverCDP(CDP_URL)
const page = browser.contexts()[0].pages().find(p => p.url().includes('jam.html'))
if (!page) throw new Error('no jam.html page on the show browser')

for (;;) {
  const knobs = await page.evaluate(() => Object.fromEntries(Object.entries({ ...window.cranes.manualFeatures, ...window.cranes.messageParams }).filter(([k]) => k.startsWith('knob_'))))
    .catch(() => ({}))
  process.stdout.write(render(knobs))
  await new Promise(r => setTimeout(r, 250))
}
