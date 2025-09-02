import { FetchError } from '../types/global.js'

const SHADER_EXTENSION = '.frag'
const SHADER_BASE_PATH = '/shaders/'

export const getRelativeOrAbsoluteShaderUrl = async (url: string): Promise<string> => {
  let resolvedUrl = url

  if (!url.includes('http')) {
    if (!url.endsWith(SHADER_EXTENSION)) {
      resolvedUrl = `${url}${SHADER_EXTENSION}`
    }
    resolvedUrl = `${SHADER_BASE_PATH}${resolvedUrl}`
  }

  let response: Response
  try {
    response = await fetch(resolvedUrl, { 
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'error'
    })
  } catch (err) {
    throw new FetchError(
      `Network error loading shader from ${resolvedUrl}`,
      resolvedUrl,
      undefined,
      err
    )
  }

  if (!response.ok) {
    throw new FetchError(
      `HTTP ${response.status}: ${response.statusText}`,
      resolvedUrl,
      response.status
    )
  }

  let shaderContent: string
  try {
    shaderContent = await response.text()
  } catch (err) {
    throw new FetchError(
      `Failed to read shader content from ${resolvedUrl}`,
      resolvedUrl,
      response.status,
      err
    )
  }

  if (!shaderContent.trim()) {
    throw new FetchError(
      `Empty shader content loaded from ${resolvedUrl}`,
      resolvedUrl,
      response.status
    )
  }

  return shaderContent
}