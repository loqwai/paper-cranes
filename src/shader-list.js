/**
 * @typedef {Object} Shader
 * @property {string} name - Display name of the shader
 * @property {string} fileUrl - URL to the shader source file
 * @property {string} visualizerUrl - URL to view the shader in the visualizer
 * @property {string} visualizerQueryParam - The shader path to use in visualizer URL params
 */

import { useState, useEffect } from 'preact/hooks'

/**
 * Hook to load and manage shader presets
 * @param {string} fileUrl - URL to the shader source file
 * @param {string} visualizerUrl - URL to view the shader in the visualizer
 * @returns {[string[], string]} Array containing [presets, shaderCode]
 */
export const useShaderPresets = (fileUrl, visualizerUrl) => {
    const [presets, setPresets] = useState([])
    const [shaderCode, setShaderCode] = useState('')

    // Fetch shader source code
    useEffect(() => {
        if (!fileUrl) return

        const fetchShaderCode = async () => {
            const res = await fetch(fileUrl)
            const text = await res.text()
            setShaderCode(text)
        }

        fetchShaderCode()
    }, [fileUrl])

    // Extract presets when shader code is loaded
    useEffect(() => {
        if (!shaderCode) return
        setPresets(extractPresets(visualizerUrl, shaderCode))
    }, [shaderCode, visualizerUrl])

    return [presets, shaderCode]
}

/**
 * Extracts preset URLs from shader code
 * @param {string} visualizerUrl - Base visualizer URL
 * @param {string} shaderCode - Raw shader source code
 * @returns {string[]} Array of preset URLs
 */
export const extractPresets = (visualizerUrl, shaderCode) => {
    if (!shaderCode) return []

    return shaderCode
        .split('\n')
        .filter(line => line.includes('http://') || line.includes('https://'))
        .map(line => {
            const presetUrlMatch = line.match(/https?:\/\/[^\s]+/)
            if (!presetUrlMatch) return null
            const url = getPresetUrl(visualizerUrl, line)
            // Filter out URLs without query params
            try {
                const parsed = new URL(url)
                return parsed.search ? url : null
            } catch {
                return null
            }
        })
        .filter(Boolean) // Remove nulls
}

/**
 * Creates a preset URL by combining the visualizer base URL with preset parameters
 * @param {string} visualizerUrl - Base visualizer URL
 * @param {string} line - Line containing a preset URL
 * @returns {string} Combined URL with merged parameters
 */
export const getPresetUrl = (visualizerUrl, line) => {
    const presetUrlMatch = line.match(/https?:\/\/[^\s]+/)
    if (!presetUrlMatch) return visualizerUrl

    const presetUrl = new URL(presetUrlMatch[0])
    const baseUrl = new URL(visualizerUrl, window.location.href)
    const resultUrl = new URL(baseUrl.pathname, window.location.origin)

    // Add preset parameters first
    for (const [key, value] of presetUrl.searchParams) {
        resultUrl.searchParams.set(key, value)
    }

    // Override with visualizer parameters
    for (const [key, value] of baseUrl.searchParams) {
        resultUrl.searchParams.set(key, value)
    }

    resultUrl.pathname = ''
    return resultUrl.toString()
}

/**
 * Gets the edit URL for a visualization
 * @param {string} visualizationUrl - The visualization URL
 * @returns {string} The edit URL
 */
export const getEditUrl = (visualizationUrl) => {
    try {
        visualizationUrl = visualizationUrl.startsWith('/') ? visualizationUrl.slice(1) : visualizationUrl
        const url = new URL(visualizationUrl)
        url.pathname = '/edit.html'
        return url.toString()
    } catch (e) {
        return `edit.html${visualizationUrl}`
    }
}

/**
 * Filters preset properties to show only relevant ones
 * @param {[string, string]} param - Key-value pair from URL params
 * @returns {boolean} Whether to show this property
 */
export const filterPresetProps = ([key]) => {
    if (key === 'shader') return false
    if (key.endsWith('.min')) return false
    if (key.endsWith('.max')) return false
    return true
}

/**
 * Loads the shader list from the server
 * @returns {Promise<Shader[]>} List of shaders
 */
export const loadShaders = async () => {
    try {
        const response = await fetch('/shaders.json')
        return  await response.json()
    } catch (error) {
        console.error('Failed to load shaders:', error)
        // Fallback shaders
        return [

        ]
    }
}
