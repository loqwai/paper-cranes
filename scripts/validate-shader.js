#!/usr/bin/env node
/**
 * CLI tool for validating shader files
 * Usage: node scripts/validate-shader.js <shader-path>
 */

import { readFile, writeFile, unlink } from 'fs/promises'
import { resolve, relative, join, dirname } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import {
  extractMetadata,
  validateShader,
  extractPresets,
  detectsAspectRatio,
  getUsedAudioFeatures
} from './shader-utils.js'
import { shaderWrapper } from '../src/shader-transformers/shader-wrapper.js'

// Get glslangValidator binary path
const require = createRequire(import.meta.url)
const glslangValidator = require('glslang-validator-prebuilt')

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = {
  error: (msg) => console.log(`${colors.red}ERROR${colors.reset}: ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}WARNING${colors.reset}: ${msg}`),
  success: (msg) => console.log(`${colors.green}OK${colors.reset}: ${msg}`),
  info: (msg) => console.log(`${colors.blue}INFO${colors.reset}: ${msg}`)
}

/**
 * Wraps shader using the actual frontend shader-wrapper
 * This ensures validation matches runtime behavior exactly
 */
const wrapShaderForValidation = (shader) => {
  try {
    return shaderWrapper(shader)
  } catch (e) {
    // If wrapper fails (e.g., no mainImage), return original for error reporting
    return shader
  }
}

/**
 * Compiles shader using glslangValidator
 * Returns { success: boolean, errors: string[] }
 */
const compileShader = async (shaderContent) => {
  const tempFile = join(tmpdir(), `shader-validate-${Date.now()}.frag`)
  const wrapped = wrapShaderForValidation(shaderContent)

  // Find the marker line (31CF3F64...) to calculate offset for error line numbers
  const wrapperLines = wrapped.split('\n')
  const markerLineIndex = wrapperLines.findIndex(line => line.includes('31CF3F64-9176-4686-9E52-E3CFEC21FE72'))

  try {
    await writeFile(tempFile, wrapped)

    try {
      // Run glslangValidator
      execSync(`"${glslangValidator.path}" "${tempFile}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      return { success: true, errors: [], wrapped }
    } catch (err) {
      // Parse error output
      const output = err.stdout || err.stderr || err.message
      const errors = []

      // Parse error lines like: "ERROR: 0:123: 'xxx' : syntax error"
      const errorRegex = /ERROR:\s*\d+:(\d+):\s*(.+)/g
      let match
      while ((match = errorRegex.exec(output)) !== null) {
        const wrappedLineNum = parseInt(match[1])
        const message = match[2]

        // Adjust line number to original file (subtract wrapper header lines)
        const originalLineNum = markerLineIndex > 0 ? wrappedLineNum - markerLineIndex - 1 : wrappedLineNum
        if (originalLineNum > 0) {
          errors.push(`Line ${originalLineNum}: ${message}`)
        } else {
          errors.push(`(wrapper) Line ${wrappedLineNum}: ${message}`)
        }
      }

      if (errors.length === 0 && output) {
        errors.push(output.trim())
      }

      return { success: false, errors, wrapped }
    }
  } finally {
    try {
      await unlink(tempFile)
    } catch {}
  }
}

async function validateShaderFile(filePath, options = {}) {
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

  // Static analysis
  const { valid: staticValid, errors: staticErrors, warnings } = validateShader(content)

  // GLSL compilation
  console.log(`${colors.bold}Compiling GLSL...${colors.reset}`)
  const { success: compileSuccess, errors: compileErrors } = await compileShader(content)

  if (compileSuccess) {
    log.success('GLSL compilation successful')
  } else {
    console.log(`${colors.bold}Compilation Errors:${colors.reset}`)
    compileErrors.forEach(err => log.error(err))
  }
  console.log()

  // Static errors
  if (staticErrors.length > 0) {
    console.log(`${colors.bold}Static Analysis Errors:${colors.reset}`)
    staticErrors.forEach(err => log.error(err))
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
  const allValid = staticValid && compileSuccess
  const totalWarnings = warnings.length
  const totalErrors = staticErrors.length + compileErrors.length

  if (allValid) {
    log.success(`Shader validation passed${totalWarnings > 0 ? ` with ${totalWarnings} warning(s)` : ''}`)
    return 0
  } else {
    log.error(`Shader validation failed with ${totalErrors} error(s)`)
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
  - GLSL compilation (using glslangValidator)
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
