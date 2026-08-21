/**
 * vjpad-edit.js — the SETUP screen for the VJ pad.
 *
 * Deliberately not part of the performance surface. It is reachable only by a
 * long-press on the header status line — a gesture nothing else on the page
 * uses, on the one strip that has no pads on it — and it replaces the pad grid
 * entirely while open, so there is no way to be half in it mid-show.
 *
 * Everything here is thumb-sized and, wherever possible, keyboard-free:
 * a knob is re-assigned with ± steppers or by picking from a sheet of the knobs
 * the SHADER ITSELF declares (which arrive already named). The one place a
 * keyboard appears is renaming, which nothing can replace, and which is never
 * needed to get a working pad.
 */
import { freeKnob } from './vjpad-layout.js'

const HUES = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee', '#f97316', '#60a5fa']

const el = (tag, cls, html) => {
    const node = document.createElement(tag)
    if (cls) node.className = cls
    if (html !== undefined) node.innerHTML = html
    return node
}

const knobNumber = (key) => {
    const match = /^knob_(\d+)$/.exec(key)
    return match ? Number(match[1]) : null
}

/** press-and-hold repeat, so travelling K131 → K160 is one gesture, not thirty taps */
const holdRepeat = (button, step) => {
    let timer = null
    let interval = null
    const stop = () => {
        clearTimeout(timer)
        clearInterval(interval)
        timer = interval = null
    }
    button.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        step()
        timer = setTimeout(() => (interval = setInterval(step, 90)), 420)
    })
    ;['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => button.addEventListener(type, stop))
}

/**
 * @param {{
 *   host: HTMLElement, sheet: HTMLElement,
 *   getShader: () => string|null, getBank: () => object, getBanks: () => object[],
 *   getShaderKnobs: () => {n:number,label?:string}[],
 *   getOverrides: () => object, setOverrides: (ov: object) => void,
 *   onClose: () => void,
 * }} api
 */
export const mountEditor = (api) => {
    let open = false

    /* every mutation goes through here: patch the sparse override tree, persist,
       and let the pad rebuild itself from the resolved layout. One path in, so
       the editor can never show something the instrument would not. */
    const mutate = (fn) => {
        const overrides = api.getOverrides()
        const shader = api.getShader() ?? '*'
        const bankName = api.getBank().name
        overrides[shader] ??= {}
        overrides[shader].banks ??= {}
        overrides[shader].banks[bankName] ??= {}
        fn(overrides[shader].banks[bankName], overrides[shader], overrides)
        api.setOverrides(overrides)
        render()
    }

    const setAxis = (padIndex, axis, patch) =>
        mutate((bank) => {
            bank.pads ??= {}
            bank.pads[padIndex] ??= {}
            bank.pads[padIndex][axis] = { ...(bank.pads[padIndex][axis] ?? {}), ...patch }
        })

    /* ── the knob sheet: one tap assigns a knob the shader has already named ── */
    const closeSheet = () => {
        api.sheet.hidden = true
        api.sheet.innerHTML = ''
    }

    const openSheet = (title, current, onPick) => {
        const knobs = api.getShaderKnobs()
        api.sheet.innerHTML = ''
        api.sheet.hidden = false
        api.sheet.appendChild(el('div', 'sheettitle', title))
        const list = el('div', 'sheetlist')
        if (!knobs.length) list.appendChild(el('div', 'sheetempty', 'this shader declares no knobs — use ± instead'))
        let here = null
        knobs.forEach((knob) => {
            const chip = el('button', 'sheetchip', `K${knob.n}<small>${knob.label ?? 'unnamed'}</small>`)
            chip.type = 'button'
            if (knob.n === current) {
                chip.classList.add('on')
                here = chip
            }
            chip.addEventListener('click', () => {
                closeSheet()
                onPick(knob)
            })
            list.appendChild(chip)
        })
        api.sheet.appendChild(list)
        // 30 knobs is a long list; open it where the axis already is rather than
        // making a thumb scroll to find where it started.
        requestAnimationFrame(() => here?.scrollIntoView({ block: 'center' }))
        const cancel = el('button', 'sheetcancel', 'CANCEL')
        cancel.type = 'button'
        cancel.addEventListener('click', closeSheet)
        api.sheet.appendChild(cancel)
    }

    /* ── one row per axis ─────────────────────────────────────────────────── */
    const axisRow = (pad, padIndex, which) => {
        const axis = pad[which]
        const row = el('div', 'erow')
        row.style.setProperty('--hue', pad.hue)
        row.appendChild(el('div', 'ewhere', `${pad.name}<small>${which.toUpperCase()}</small>`))

        const name = el('button', 'ename', axis.label)
        name.type = 'button'
        name.addEventListener('click', () => {
            const next = prompt(`Name for ${pad.name} ${which.toUpperCase()}`, axis.label)
            if (next?.trim()) setAxis(padIndex, which, { label: next.trim().toUpperCase().slice(0, 14) })
        })
        row.appendChild(name)

        const n = knobNumber(axis.key)
        const key = el('button', 'ekey' + (n === null ? ' named' : ''), n === null ? axis.key : `K${n}`)
        key.type = 'button'
        key.addEventListener('click', () =>
            openSheet(`${pad.name} ${which.toUpperCase()} →`, n, (knob) =>
                setAxis(padIndex, which, { key: `knob_${knob.n}`, label: knob.label ?? `K${knob.n}` })
            )
        )
        row.appendChild(key)

        // ± only makes sense on a knob_N; a named uniform (navX, energySpring)
        // has no neighbour to step to, so the steppers stay out of the way.
        const nudge = (delta) => {
            if (n === null) return
            const next = Math.min(200, Math.max(1, n + delta))
            const declared = api.getShaderKnobs().find((knob) => knob.n === next)
            setAxis(padIndex, which, { key: `knob_${next}`, label: declared?.label ?? `K${next}` })
        }
        const minus = el('button', 'estep', '−')
        const plus = el('button', 'estep', '+')
        minus.type = plus.type = 'button'
        minus.disabled = plus.disabled = n === null
        holdRepeat(minus, () => nudge(-1))
        holdRepeat(plus, () => nudge(1))
        row.append(minus, plus)
        return row
    }

    const render = () => {
        if (!open) return
        const bank = api.getBank()
        const shader = api.getShader() ?? 'any shader'
        api.host.innerHTML = ''

        const head = el('div', 'ehead')
        const done = el('button', 'ebig done', 'DONE<small>back to playing</small>')
        done.type = 'button'
        done.addEventListener('click', () => close())
        head.appendChild(done)
        const title = el('button', 'etitle', `${bank.name}<small>${shader}</small>`)
        title.type = 'button'
        title.addEventListener('click', () => {
            const next = prompt('Bank name', bank.name)
            if (next?.trim()) mutate((patch) => (patch.name = next.trim().toUpperCase().slice(0, 12)))
        })
        head.appendChild(title)
        api.host.appendChild(head)

        const rows = el('div', 'erows')
        bank.pads.forEach((pad, i) => {
            rows.appendChild(axisRow(pad, i, 'x'))
            rows.appendChild(axisRow(pad, i, 'y'))
        })
        if (!bank.pads.length) rows.appendChild(el('div', 'sheetempty', 'no pads yet — tap + PAD'))
        api.host.appendChild(rows)

        const foot = el('div', 'efoot')
        const addPad = el('button', 'ebig', '+ PAD')
        addPad.type = 'button'
        addPad.addEventListener('click', () => {
            const n = freeKnob(api.getBanks())
            const i = bank.pads.length
            mutate((patch) => {
                patch.extraPads ??= []
                patch.extraPads.push({
                    name: `PAD ${i + 1}`,
                    hue: HUES[i % HUES.length],
                    x: { key: `knob_${n}`, label: `K${n}`, min: 0, max: 1, def: 0 },
                    y: { key: `knob_${n + 1}`, label: `K${n + 1}`, min: 0, max: 1, def: 0 },
                })
            })
        })

        const addBank = el('button', 'ebig', '+ BANK')
        addBank.type = 'button'
        addBank.addEventListener('click', () => {
            const n = freeKnob(api.getBanks())
            mutate((_patch, forShader) => {
                forShader.added ??= []
                const name = `MINE ${forShader.added.length + 1}`
                forShader.added.push({
                    name,
                    live: 'PHONE',
                    note: `knob_${n}–${n + 3} · added on this phone`,
                    mirror: false,
                    pads: [0, 1].map((p) => ({
                        name: `PAD ${p + 1}`,
                        hue: HUES[p % HUES.length],
                        x: { key: `knob_${n + p * 2}`, label: `K${n + p * 2}`, min: 0, max: 1, def: 0 },
                        y: { key: `knob_${n + p * 2 + 1}`, label: `K${n + p * 2 + 1}`, min: 0, max: 1, def: 0 },
                    })),
                })
            })
        })

        const reset = el('button', 'ebig danger', 'RESET<small>this bank</small>')
        reset.type = 'button'
        reset.addEventListener('click', () => {
            const overrides = api.getOverrides()
            delete overrides[api.getShader() ?? '*']?.banks?.[bank.name]
            api.setOverrides(overrides)
            render()
        })

        foot.append(addPad, addBank, reset)
        api.host.appendChild(foot)
    }

    const close = () => {
        open = false
        closeSheet()
        api.host.hidden = true
        api.onClose()
    }

    return {
        get isOpen() {
            return open
        },
        open() {
            open = true
            api.host.hidden = false
            render()
        },
        close,
        render,
    }
}
