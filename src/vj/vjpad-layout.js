/**
 * vjpad-layout.js — where a VJ pad's banks and pads come from.
 *
 * The pad used to hardcode one shader's parameters. Making it generic without
 * making it fiddlier means config has to be LAYERED, never asked for:
 *
 *   1. vjpad-layouts.json  — checked in, shared, the tuned presets. Hand-written
 *                            because a bank carries things a shader comment
 *                            cannot: ranges, curves, colours, pad grouping and
 *                            NON-knob param names (navX, waveletBassSpring…).
 *   2. the shader itself   — every knob_N it reads, with the name its own source
 *                            gives it (see extractKnobs in scripts/shader-utils).
 *                            This is the ZERO-CONFIG layer: a shader nobody has
 *                            written a layout for still gets correctly-numbered,
 *                            usually correctly-named pads.
 *   3. this phone          — sparse per-device patches from the EDIT screen,
 *                            stored in localStorage exactly like the MIDI
 *                            mapper's per-device profiles.
 *
 * Later layers patch earlier ones; nothing replaces anything wholesale, so a
 * relabelled axis cannot silently drop the range and curve underneath it.
 */

import { parseKnobs } from '../../scripts/shader-utils.js'

const OVERRIDES_KEY = 'cranes-vjpad-layout'

/** default knob mirror range for a bank with no explicit knobBase: bank i owns knob_(101 + i*10 ...) */
export const KNOB_BASE = 100

/** pad colours for auto-generated banks, cycled so neighbours never share one */
const AUTO_HUES = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee', '#f97316', '#60a5fa']

/** @param {string} glob @param {string} value */
const globMatches = (glob, value) => {
    if (glob === '*') return true
    const rx = new RegExp('^' + glob.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? '[^]*' : '\\' + c)) + '$')
    return rx.test(value)
}

/** Does this bank belong on screen for the selected shader? No shader selected = show everything. */
export const bankMatches = (bank, shader) => {
    const globs = bank.match ?? ['*']
    if (!shader) return true
    return globs.some((glob) => globMatches(glob, shader))
}

/**
 * Fill in an axis. `suffix`/`decimals` exist because JSON cannot hold the
 * formatter function the pad's readout wants.
 */
export const normalizeAxis = (raw, fallbackKey = 'knob_1') => {
    const key = raw?.key || fallbackKey
    const min = Number.isFinite(raw?.min) ? raw.min : 0
    const max = Number.isFinite(raw?.max) ? raw.max : 1
    const decimals = Number.isFinite(raw?.decimals) ? raw.decimals : 2
    const suffix = raw?.suffix ?? ''
    return {
        key,
        label: raw?.label || key.replace(/^knob_/, 'K'),
        min,
        max,
        def: Number.isFinite(raw?.def) ? raw.def : min,
        ...(raw?.curve === 'exp' ? { curve: 'exp' } : {}),
        ...(suffix || decimals !== 2 ? { fmt: (v) => v.toFixed(decimals) + suffix, suffix, decimals } : {}),
    }
}

const normalizePad = (raw, index) => ({
    name: raw?.name || `PAD ${index + 1}`,
    hue: raw?.hue || AUTO_HUES[index % AUTO_HUES.length],
    x: normalizeAxis(raw?.x),
    y: normalizeAxis(raw?.y),
})

/**
 * A bank's private knob mirror range. Explicit `knobBase` keeps a bank's
 * mirrors stable no matter where it lands in the list — the lattice banks mirror
 * onto the very knobs they drive, which is only true at a fixed position.
 * `mirror: false` (auto banks) means "these axes are already knobs, don't echo".
 */
const normalizeBank = (raw, index) => ({
    name: raw?.name || `BANK ${index + 1}`,
    match: raw?.match ?? ['*'],
    live: raw?.live ?? '',
    note: raw?.note ?? '',
    quietGate: !!raw?.quietGate,
    knobBase: raw?.mirror === false ? null : Number.isFinite(raw?.knobBase) ? raw.knobBase : KNOB_BASE + index * 10 + 1,
    source: raw?.source || 'file',
    pads: (raw?.pads ?? []).map(normalizePad),
})

/** The knob_N this bank echoes an axis onto, or null when the bank does not mirror. */
export const mirrorKnob = (bank, padIndex, isY) =>
    bank.knobBase === null ? null : `knob_${bank.knobBase + padIndex * 2 + (isY ? 1 : 0)}`

/* ── the zero-config layer ────────────────────────────────────────────────
   A shader with no layout still reads specific knobs and usually names them in
   its own comments. Correctly-numbered unlabelled pads beat a pad of somebody
   else's parameters, so this always runs — it just has nothing to add when the
   file layout already covers every knob. */
export const autoBanks = (shaderKnobs = [], boundKeys = new Set()) => {
    const free = shaderKnobs.filter((knob) => !boundKeys.has(`knob_${knob.n}`))
    if (!free.length) return []

    const banks = []
    for (let i = 0; i < free.length; i += 10) {
        const chunk = free.slice(i, i + 10)
        const pads = []
        for (let j = 0; j < chunk.length; j += 2) {
            // An odd tail gets the NEXT knob number rather than a second copy of
            // its neighbour — a pad whose two axes drive the same uniform fights
            // itself, which is a far worse surprise than one inert axis.
            const a = chunk[j]
            const b = chunk[j + 1] ?? { n: a.n + 1 }
            pads.push({
                name: (a.label || `K${a.n}`).split(' ')[0],
                hue: AUTO_HUES[(pads.length + banks.length) % AUTO_HUES.length],
                x: { key: `knob_${a.n}`, label: a.label || `K${a.n}`, min: 0, max: 1, def: 0 },
                y: { key: `knob_${b.n}`, label: b.label || `K${b.n}`, min: 0, max: 1, def: 0 },
            })
        }
        banks.push({
            name: `K${chunk[0].n}${chunk.length > 1 ? `–${chunk[chunk.length - 1].n}` : ''}`,
            live: 'AUTO',
            note: `knob_${chunk[0].n}–${chunk[chunk.length - 1].n} · read by this shader · names from its own source`,
            mirror: false,
            source: 'auto',
            pads,
        })
    }
    return banks
}

/* ── the per-phone layer ──────────────────────────────────────────────────
   Sparse patches only: { shader: { banks: { NAME: { pads: { 0: { x: {key,label} } } } }, added: [bank] } }
   Anything not mentioned keeps the checked-in value. */
export const loadOverrides = () => {
    try {
        return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}') ?? {}
    } catch {
        return {}
    }
}

export const saveOverrides = (overrides) => {
    try {
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
    } catch {}
}

const patchAxis = (axis, patch) => (patch ? normalizeAxis({ ...axis, ...patch }, axis.key) : axis)

const patchBank = (bank, patch) => {
    if (!patch) return bank
    const padPatches = patch.pads ?? {}
    return {
        ...bank,
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.note ? { note: patch.note } : {}),
        pads: bank.pads
            .map((pad, i) => {
                const p = padPatches[i]
                if (!p) return pad
                if (p.removed) return null
                return { ...pad, ...(p.name ? { name: p.name } : {}), ...(p.hue ? { hue: p.hue } : {}), x: patchAxis(pad.x, p.x), y: patchAxis(pad.y, p.y) }
            })
            .filter(Boolean)
            .concat((patch.extraPads ?? []).map((pad, i) => normalizePad(pad, bank.pads.length + i))),
    }
}

/**
 * The full bank list for one shader: checked-in banks that match it, patched by
 * this phone, then this phone's own banks, then auto banks for anything the
 * shader reads that none of the above already covers.
 *
 * @param {{layouts: object, shader: string|null, shaderKnobs: {n:number,label?:string}[], overrides: object}} input
 * @returns {object[]} normalized banks, in screen order
 */
export const resolveBanks = ({ layouts, shader, shaderKnobs = [], overrides = {} }) => {
    const ov = overrides[shader] ?? {}
    const bankPatches = ov.banks ?? {}

    const fromFile = (layouts?.banks ?? [])
        .filter((bank) => bankMatches(bank, shader))
        .map((bank, i) => patchBank(normalizeBank(bank, i), bankPatches[bank.name]))

    const added = (ov.added ?? []).map((bank, i) =>
        patchBank(normalizeBank({ ...bank, source: 'device' }, fromFile.length + i), bankPatches[bank.name])
    )

    const banks = [...fromFile, ...added]
    const bound = new Set(banks.flatMap((bank) => bank.pads.flatMap((pad) => [pad.x.key, pad.y.key])))
    // Auto banks are patchable too — relabelling one of them on the phone is the
    // most likely edit anyone will ever make, since they are the ones that arrive
    // unnamed.
    const auto = autoBanks(shaderKnobs, bound).map((bank, i) =>
        patchBank(normalizeBank(bank, banks.length + i), bankPatches[bank.name])
    )
    return [...banks, ...auto]
}

/** Lowest knob_N in `range` that no bank already drives — used when the EDIT screen adds a pad. */
export { parseKnobs }

export const freeKnob = (banks, from = 161, to = 200) => {
    const used = new Set(banks.flatMap((bank) => bank.pads.flatMap((pad) => [pad.x.key, pad.y.key])))
    for (let n = from; n <= to; n++) if (!used.has(`knob_${n}`)) return n
    return from
}
