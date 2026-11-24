// ?vj=1 only: a brief dot in the display's corner when an NFC sticker's message lands, so Aaron
// can see from across a dark room that the tap reached the wall. Never on a plain show page: the
// audience should not see control feedback. docs/nfc-show-controls.md
const COLORS = { 'vj-keep': '#51cf66', 'vj-panic': '#fa5252', 'proposal-answer': '#22b8cf', 'update-params': '#be4bdb' }
const enabled = () => new URLSearchParams(window.location.search).get('vj') === '1'

let timer = null
export const nfcFlash = (message) => {
  if (message?.via !== 'nfc' || !enabled()) return
  let el = document.getElementById('nfc-flash')
  if (!el) {
    el = document.createElement('div')
    el.id = 'nfc-flash'
    el.style.cssText = 'position:fixed;right:14px;top:14px;width:22px;height:22px;border-radius:50%;z-index:10001;pointer-events:none;transition:opacity .35s;opacity:0'
    document.body.appendChild(el)
  }
  el.style.background = COLORS[message.type] ?? '#ffd43b'
  el.dataset.type = message.type
  el.style.opacity = '0.9'
  clearTimeout(timer)
  timer = setTimeout(() => { el.style.opacity = '0' }, 450)
}
