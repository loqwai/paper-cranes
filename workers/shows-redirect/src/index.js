// shows.beadfamous.com/<show>/<rest> -> https://<show>.beadfamous.com/<rest>, query string kept.
//
// Each show repo deploys to its own subdomain (see docs/show-repos.md). This Worker only makes the
// shared, memorable URL work. It redirects instead of proxying, so the show runs at its own
// origin root with no base-path rewriting, and this Worker never needs a change for a new show.

const SHOW = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/
const ZONE = 'beadfamous.com'

/** The redirect target for a request URL, or null when the path names no show. */
export const targetFor = (requestUrl) => {
    const url = new URL(requestUrl)
    const [, show, ...rest] = url.pathname.split('/')
    if (!SHOW.test(show ?? '')) return null
    return `https://${show}.${ZONE}/${rest.join('/')}${url.search}`
}

export default {
    fetch(request) {
        const target = targetFor(request.url)
        if (!target) return new Response(`Paper Cranes shows live at https://shows.${ZONE}/<show>\n`, { status: 404 })
        return Response.redirect(target, 302)
    },
}
