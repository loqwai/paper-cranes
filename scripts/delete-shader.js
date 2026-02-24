#!/usr/bin/env node

import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = dirname(__dirname)

async function deleteShader(url, { exit = true } = {}) {
  try {
    // Extract shader parameter from URL
    const match = url.match(/shader=([^&]+)/)
    if (!match) {
      console.error('Error: Could not find shader parameter in URL')
      if (exit) process.exit(1)
      return
    }

    // Decode the shader path (e.g., claude%2Fchromadepth-apollonian -> claude/chromadepth-apollonian)
    const shaderPath = decodeURIComponent(match[1])

    // Construct full file path
    const filePath = join(projectRoot, 'shaders', `${shaderPath}.frag`)

    // Delete the file
    await fs.unlink(filePath)
    console.log(`✓ Deleted: ${shaderPath}`)
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Error: Shader file not found: ${error.path}`)
    } else {
      console.error(`Error: ${error.message}`)
    }
    if (exit) process.exit(1)
  }
}

if (process.argv.includes('--interactive')) {
  const readline = await import('readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log('Paste a URL and press Enter to delete the shader. Ctrl+C to quit.')
  rl.on('line', async (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    await deleteShader(trimmed, { exit: false })
  })
} else {
  const url = process.argv[2]
  if (!url) {
    console.error('Usage: npm run delete <url>')
    console.error('Example: npm run delete "http://localhost:6969/?shader=claude%2Fchromadepth-apollonian"')
    process.exit(1)
  }
  deleteShader(url)
}
