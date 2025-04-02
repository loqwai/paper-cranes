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
    return shader
}
