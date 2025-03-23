export const addWebsocketListener = (url=window.location.origin, port=6970) => {

  // Connect to local WebSocket server
  try {
    const socket = new WebSocket('ws://localhost:6970')
    socket.addEventListener('open', () => {
      console.log('Connected to WebSocket server')
    })

    socket.addEventListener('message', (event) => {
      console.log('Received message from WebSocket:', event.data)
      try {
        const json = JSON.parse(event.data)
        window.postMessage(json, '*')
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    })

    socket.addEventListener('close', () => {
      console.warn('WebSocket connection closed')
    })

    socket.addEventListener('error', (e) => {
      console.error('WebSocket error:', e)
    })
  } catch (err) {
    console.error('WebSocket connection failed:', err)
  }
}

export const addWebsocketController = (url = window.location.hostname, port = 6970) => {
  const params = new URLSearchParams(window.location.search)
  let socket
  let messageQueue = []
  let socketReady = false

  const sendShaderParam = (shaderName) => {
    const nextUrl = new URL(window.location)
    nextUrl.searchParams.set('shader', shaderName)
    window.history.pushState({}, '', nextUrl)

    const message = {
      type: 'update-params',
      data: { shader: shaderName }
    }

    if (socketReady && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
      console.log('Sent shader param over WebSocket:', message)
    } else {
      console.log('Socket not open yet, queuing message:', message)
      messageQueue.push(message)
    }
  }

  if (params.get('remote') === 'true') {
    try {
      console.log('Connecting to WebSocket:', `ws://${url}:${port}`)
      socket = new WebSocket(`ws://${url}:${port}`)

      socket.addEventListener('open', () => {
        socketReady = true
        console.log('Connected to WebSocket (remote control mode)')

        // Flush queue
        messageQueue.forEach(msg => socket.send(JSON.stringify(msg)))
        messageQueue = []

        // Send initial shader param (if in URL)
        const initialShader = params.get('shader')
        if (initialShader) sendShaderParam(initialShader)
      })

      socket.addEventListener('close', () => {
        console.warn('WebSocket closed (remote mode)')
        socketReady = false
      })
    } catch (e) {
      console.error('WebSocket error (remote mode):', e)
    }
  }

  return {
    sendShader: (shader) => sendShaderParam(shader)
  }
}

export const interceptNavigation = () => {
  console.log('Intercepting navigation')
  const controller = addWebsocketController()
  console.log('Controller:', controller)
  window.addEventListener('popstate', (event) => {
    event.preventDefault()
    console.log('Navigation event:', event)
  })
  // 1. Intercept link clicks and manually send the update
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]')
    if (!link) return // Not a link, ignore
    console.log('Link:', link)
    const url = new URL(link.href)
    const shader = url.searchParams.get('shader')

    if (url.origin === location.origin && shader) {
      e.preventDefault()
      controller.sendShader(shader)
    }
  })

}

export default addWebsocketListener
