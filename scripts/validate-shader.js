#!/usr/bin/env node
/**
 * CLI tool for validating shader files
 * Usage: node scripts/validate-shader.js <shader-path>
 */

import { readFile } from 'fs/promises'
import { resolve, relative } from 'path'
import {
  extractMetadata,
  validateShader,
  extractPresets,
  detectsAspectRatio,
  getUsedAudioFeatures
} from './shader-utils.js'

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = {
  error: (msg) => console.log(`${colors.red}ERROR${colors.reset}: ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}WARNING${colors.reset}: ${msg}`),
  success: (msg) => console.log(`${colors.green}OK${colors.reset}: ${msg}`),
  info: (msg) => console.log(`${colors.blue}INFO${colors.reset}: ${msg}`)
}

async function validateShaderFile(filePath) {
  const absolutePath = resolve(filePath)
  const relativePath = relative(process.cwd(), absolutePath)

  console.log(`\n${colors.bold}Validating: ${relativePath}${colors.reset}\n`)

  let content
  try {
    content = await readFile(absolutePath, 'utf-8')
  } catch (err) {
    log.error(`Could not read file: ${err.message}`)
    process.exit(1)
  }

  // Extract and display metadata
  const metadata = extractMetadata(content)
  if (Object.keys(metadata).length > 0) {
    console.log(`${colors.bold}Metadata:${colors.reset}`)
    Object.entries(metadata).forEach(([key, value]) => {
      console.log(`  @${key}: ${JSON.stringify(value)}`)
    })
    console.log()
  }

  // Validate shader
  const { valid, errors, warnings } = validateShader(content)

  if (errors.length > 0) {
    console.log(`${colors.bold}Errors:${colors.reset}`)
    errors.forEach(err => log.error(err))
    console.log()
  }

  if (warnings.length > 0) {
    console.log(`${colors.bold}Warnings:${colors.reset}`)
    warnings.forEach(warn => log.warn(warn))
    console.log()
  }

  // Check aspect ratio handling
  const handlesAspect = detectsAspectRatio(content)
  if (!handlesAspect && !metadata.fullscreen) {
    log.warn('Shader may not handle non-square aspect ratios. Consider adding // @fullscreen: false')
  } else if (handlesAspect && metadata.fullscreen === false) {
    log.info('Shader appears to handle aspect ratio but is marked @fullscreen: false')
  }

  // Show audio features used
  const usedFeatures = getUsedAudioFeatures(content)
  if (usedFeatures.length > 0) {
    console.log(`\n${colors.bold}Audio features used (${usedFeatures.length}):${colors.reset}`)
    console.log(`  ${usedFeatures.join(', ')}`)
  }

  // Show presets
  const presets = extractPresets(content)
  if (presets.length > 0) {
    console.log(`\n${colors.bold}Presets found (${presets.length}):${colors.reset}`)
    presets.forEach((preset, i) => {
      const truncated = preset.length > 80 ? preset.substring(0, 77) + '...' : preset
      console.log(`  ${i + 1}. ${truncated}`)
    })
  }

  // Summary
  console.log()
  if (valid) {
    log.success(`Shader validation passed${warnings.length > 0 ? ` with ${warnings.length} warning(s)` : ''}`)
    return 0
  } else {
    log.error(`Shader validation failed with ${errors.length} error(s)`)
    return 1
  }
}

// Main
const args = process.argv.slice(2)

if (args.length === 0) {
  console.log(`Usage: node scripts/validate-shader.js <shader-path>

Examples:
  node scripts/validate-shader.js shaders/wip/claude/my-shader.frag
  node scripts/validate-shader.js shaders/plasma.frag

Options:
  --help    Show this help message
`)
  process.exit(0)
}

if (args[0] === '--help' || args[0] === '-h') {
  console.log(`Shader Validation Tool

Validates GLSL shader files for the Paper Cranes visualization system.

Usage: node scripts/validate-shader.js <shader-path>

Checks performed:
  - mainImage function presence
  - fragColor output usage
  - Potential divide-by-zero issues
  - Hardcoded resolution values
  - Aspect ratio handling
  - Metadata extraction (@fullscreen, @mobile, etc.)
  - Audio feature usage analysis
  - Preset URL extraction
`)
  process.exit(0)
}

const exitCode = await validateShaderFile(args[0])
process.exit(exitCode)
