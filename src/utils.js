// A static host answers a missing /shaders/x.frag with 200 and the site's index.html
// (single-page-app fallback), so the status alone cannot tell a missing shader apart.
const looksLikeWebPage = (text) => /^\s*<(!doctype html|html)/i.test(text)

export const getRelativeOrAbsoluteShaderUrl = async (url) => {
    //if the url is not a full url, then it's a relative url
    if (!url.includes('http')) {
        // Add .frag extension if it doesn't exist
        if (!url.endsWith('.frag')) {
            url = `${url}.frag`
        }
        url = `/shaders/${url}`
    }
    const res = await fetch(url, {mode: 'no-cors'})
    const shader = await res.text()
    if (res.type !== 'opaque' && !res.ok) throw new Error(`shader ${url} not found (HTTP ${res.status})`)
    if (looksLikeWebPage(shader)) throw new Error(`shader ${url} not found (the host sent a web page)`)
    return shader
}
