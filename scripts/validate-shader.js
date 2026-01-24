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
 * Wraps shader with the same header used at runtime
 * This mimics src/shader-transformers/shader-wrapper.js
 */
const wrapShaderForValidation = (shader) => {
  // List of audio feature uniforms
  const audioFeatures = [
    'bass', 'bassNormalized', 'bassMean', 'bassMedian', 'bassMin', 'bassMax', 'bassStandardDeviation', 'bassZScore',
    'mids', 'midsNormalized', 'midsMean', 'midsMedian', 'midsMin', 'midsMax', 'midsStandardDeviation', 'midsZScore',
    'treble', 'trebleNormalized', 'trebleMean', 'trebleMedian', 'trebleMin', 'trebleMax', 'trebleStandardDeviation', 'trebleZScore',
    'energy', 'energyNormalized', 'energyMean', 'energyMedian', 'energyMin', 'energyMax', 'energyStandardDeviation', 'energyZScore',
    'spectralCentroid', 'spectralCentroidNormalized', 'spectralCentroidMean', 'spectralCentroidMedian', 'spectralCentroidMin', 'spectralCentroidMax', 'spectralCentroidStandardDeviation', 'spectralCentroidZScore',
    'spectralFlux', 'spectralFluxNormalized', 'spectralFluxMean', 'spectralFluxMedian', 'spectralFluxMin', 'spectralFluxMax', 'spectralFluxStandardDeviation', 'spectralFluxZScore',
    'spectralSpread', 'spectralSpreadNormalized', 'spectralSpreadMean', 'spectralSpreadMedian', 'spectralSpreadMin', 'spectralSpreadMax', 'spectralSpreadStandardDeviation', 'spectralSpreadZScore',
    'spectralRolloff', 'spectralRolloffNormalized', 'spectralRolloffMean', 'spectralRolloffMedian', 'spectralRolloffMin', 'spectralRolloffMax', 'spectralRolloffStandardDeviation', 'spectralRolloffZScore',
    'spectralRoughness', 'spectralRoughnessNormalized', 'spectralRoughnessMean', 'spectralRoughnessMedian', 'spectralRoughnessMin', 'spectralRoughnessMax', 'spectralRoughnessStandardDeviation', 'spectralRoughnessZScore',
    'spectralKurtosis', 'spectralKurtosisNormalized', 'spectralKurtosisMean', 'spectralKurtosisMedian', 'spectralKurtosisMin', 'spectralKurtosisMax', 'spectralKurtosisStandardDeviation', 'spectralKurtosisZScore',
    'spectralEntropy', 'spectralEntropyNormalized', 'spectralEntropyMean', 'spectralEntropyMedian', 'spectralEntropyMin', 'spectralEntropyMax', 'spectralEntropyStandardDeviation', 'spectralEntropyZScore',
    'spectralCrest', 'spectralCrestNormalized', 'spectralCrestMean', 'spectralCrestMedian', 'spectralCrestMin', 'spectralCrestMax', 'spectralCrestStandardDeviation', 'spectralCrestZScore',
    'spectralSkew', 'spectralSkewNormalized', 'spectralSkewMean', 'spectralSkewMedian', 'spectralSkewMin', 'spectralSkewMax', 'spectralSkewStandardDeviation', 'spectralSkewZScore',
    'pitchClass', 'pitchClassNormalized', 'pitchClassMean', 'pitchClassMedian', 'pitchClassMin', 'pitchClassMax', 'pitchClassStandardDeviation', 'pitchClassZScore'
  ]

  const audioUniforms = audioFeatures.map(f => `uniform float ${f};`).join('\n')

  // Generate knob uniforms (1-200, excluding those already defined)
  const existingKnobs = new Set(
    [...shader.matchAll(/uniform\s+float\s+knob_(\d+)/g)].map(m => parseInt(m[1]))
  )
  const knobUniforms = Array.from({ length: 200 }, (_, i) => i + 1)
    .filter(i => !existingKnobs.has(i))
    .map(i => `uniform float knob_${i};`)
    .join('\n')

  // Check if shader already has #version
  if (shader.includes('#version')) {
    return shader
  }

  // Full wrapper matching runtime behavior
  return `#version 300 es
precision highp float;

out vec4 fragColor;

// ShaderToy compatibility
uniform vec4 iMouse;
uniform float iTime;
uniform vec3 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform int iFrame;

// Audio features
${audioUniforms}
uniform bool beat;

// Knobs
${knobUniforms}

// Paper Cranes built-ins
uniform float time;
uniform vec2 resolution;
uniform int frame;
uniform sampler2D prevFrame;
uniform sampler2D initialFrame;
uniform float iRandom;
uniform vec2 touch;
uniform bool touched;

float random(vec2 st, float seed) {
    st = vec2(st.x * cos(seed) - st.y * sin(seed), st.x * sin(seed) + st.y * cos(seed));
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 11118.5453123);
}

float random(vec2 st) { return random(st, iRandom); }
float staticRandom(vec2 st) { return random(st, 0.); }

float mapValue(float val, float inMin, float inMax, float outMin, float outMax) {
    float normalized = outMin + (outMax - outMin) * (val - inMin) / (inMax - inMin);
    return clamp(normalized, outMin, outMax);
}

vec4 getLastFrameColor(vec2 uv) { return texture(prevFrame, uv); }
vec4 getInitialFrameColor(vec2 uv) { return texture(initialFrame, uv); }

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0) hue += 1.0;
    else if (hue > 1.0) hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0) res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0) res = f2;
    else if ((3.0 * hue) < 2.0) res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x, s = hsl.y, l = hsl.z;
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    return vec3(hue2rgb(p, q, h + 1.0/3.0), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0/3.0));
}

vec3 rgb2hsl(vec3 c) {
    float maxColor = max(max(c.r, c.g), c.b);
    float minColor = min(min(c.r, c.g), c.b);
    float delta = maxColor - minColor;
    float h = 0.0, s = 0.0, l = (maxColor + minColor) * 0.5;
    if (delta > 0.0) {
        s = l < 0.5 ? delta / (maxColor + minColor) : delta / (2.0 - maxColor - minColor);
        if (c.r == maxColor) h = (c.g - c.b) / delta + (c.g < c.b ? 6.0 : 0.0);
        else if (c.g == maxColor) h = (c.b - c.r) / delta + 2.0;
        else h = (c.r - c.g) / delta + 4.0;
        h /= 6.0;
    }
    return vec3(h, s, l);
}

vec2 centerUv(vec2 res, vec2 coord) { return (coord / res - 0.5) * 2.0 + 0.5; }
vec2 centerUv(vec2 coord) { return centerUv(resolution, coord); }

vec3 hslmix(vec3 c1, vec3 c2, float t) {
    vec3 hsl1 = rgb2hsl(c1);
    vec3 hsl2 = rgb2hsl(c2);
    vec3 hsl = mix(hsl1, hsl2, t);
    return hsl2rgb(hsl);
}

float pingpong(float t) { return 0.5 + 0.5 * sin(3.14159265359 * t); }
float animateSmooth(float t) { return t * t * (3.0 - 2.0 * t); }
float animateEaseInOutCubic(float t) {
    t = pingpong(t);
    return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
}

// SHADER_MARKER_LINE
${shader}

void main(void) {
    mainImage(fragColor, gl_FragCoord.xy);
}
`
}

/**
 * Compiles shader using glslangValidator
 * Returns { success: boolean, errors: string[] }
 */
const compileShader = async (shaderContent) => {
  const tempFile = join(tmpdir(), `shader-validate-${Date.now()}.frag`)
  const wrapped = wrapShaderForValidation(shaderContent)

  // Find the marker line to calculate offset
  const wrapperLines = wrapped.split('\n')
  const markerLineIndex = wrapperLines.findIndex(line => line.includes('SHADER_MARKER_LINE'))

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
        const originalLineNum = wrappedLineNum - markerLineIndex - 1
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
