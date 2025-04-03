export const addWebsocketListener = (port = 6970) => {
  const params = new URLSearchParams(window.location.search)
  const wsHost = params.get('remote')

  const fullUrl = `ws://${wsHost}`

  try {
    const socket = new WebSocket(fullUrl)

    socket.addEventListener('open', () => {
      // Connected to WebSocket server
    })

    socket.addEventListener('message', async (event) => {
      let raw
      if (event.data instanceof Blob) {
        raw = await event.data.text()
      } else {
        raw = event.data
      }

      try {
        const json = JSON.parse(raw)
        // if the json has an image, just put all the variables as query params and reload the page
        const { data } = json
        if (data.image) {
          const url = new URL(window.location)
          url.searchParams.set('shader', data.shader)
          url.searchParams.set('image', data.image)
          window.location.href = url.toString()
          return
        }
        window.postMessage(json, '*')
      } catch (e) {
        console.error('[Visualizer] Failed to parse WebSocket message:', e, raw)
      }
    })

    socket.addEventListener('close', () => {
      console.warn('[Visualizer] WebSocket connection closed')
    })

    socket.addEventListener('error', (e) => {
      console.error('[Visualizer] WebSocket error:', e)
    })
  } catch (err) {
    console.error('[Visualizer] WebSocket connection failed:', err)
  }
}

export const addWebsocketController = () => {
  const params = new URLSearchParams(window.location.search)
  const wsHost = params.get('remote')

  let socket
  let messageQueue = []
  let socketReady = false
  let lastShaderUrl = null

  const sendShaderParam = (url) => {
    const queryParams = new URLSearchParams(url.search)
    const message = {
      type: 'update-params',
      data: { ...Object.fromEntries(queryParams.entries()) }
    }

    if (socketReady && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    } else {
      messageQueue.push(message)
    }
  }

  if (wsHost) {
    try {
      socket = new WebSocket(`ws://${wsHost}`)

      socket.addEventListener('open', () => {
        socketReady = true

        messageQueue.forEach(msg => socket.send(JSON.stringify(msg)))
        messageQueue = []

        const initialShader = params.get('shader')
        if (initialShader) sendShaderParam(initialShader)
      })

      socket.addEventListener('close', () => {
        console.warn('[Controller] WebSocket closed')
        socketReady = false
      })

      socket.addEventListener('error', (e) => {
        console.error('[Controller] WebSocket error:', e)
      })
    } catch (e) {
      console.error('[Controller] WebSocket error (setup):', e)
    }
  }

  return {
    sendShader: (url) => sendShaderParam(url)
  }
}

export const interceptNavigation = () => {
  const controller = addWebsocketController()

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]')
    if (!link) return

    const url = new URL(link.href)
    const shader = url.searchParams.get('shader')

    if (url.origin === location.origin && shader) {
      e.preventDefault()
      controller.sendShader(url)
    }
  })
}

export default addWebsocketListener
