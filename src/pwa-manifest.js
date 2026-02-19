const params = new URLSearchParams(window.location.search)
const shader = params.get('shader')

const safeFilename = shader ? shader.replace(/\//g, '--') : 'default'
const manifestHref = `/manifests/${safeFilename}.json`

const link = document.createElement('link')
link.rel = 'manifest'
link.href = manifestHref
document.head.appendChild(link)

if (shader) {
  const displayName = shader.includes('/')
    ? shader.split('/').pop().replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : shader.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  document.title = `Paper Cranes - ${displayName}`
}
