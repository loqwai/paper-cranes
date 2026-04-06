#!/usr/bin/env node

import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, relative } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = dirname(__dirname)
const shadersDir = join(projectRoot, 'shaders')

const writeMode = process.argv.includes('--write')

async function findFragFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findFragFiles(fullPath))
    } else if (entry.name.endsWith('.frag')) {
      files.push(fullPath)
    }
  }
  return files
}

function extractUniqueKnobs(content) {
  // Match knob_\d+ but NOT followed by another digit (word-boundary-aware)
  const regex = /knob_(\d+)(?!\d)/g
  const knobNumbers = new Set()
  let match
  while ((match = regex.exec(content)) !== null) {
    knobNumbers.add(parseInt(match[1], 10))
  }
  return [...knobNumbers].sort((a, b) => a - b)
}

function isAlreadySequential(knobNumbers) {
  if (knobNumbers.length === 0) return true
  return knobNumbers.every((num, i) => num === i + 1)
}

function remapContent(content, mapping) {
  // Single-pass replacement using a regex that matches any knob_\d+ (not followed by another digit)
  // This avoids double-replacement issues entirely
  const regex = /knob_(\d+)(?!\d)/g
  return content.replace(regex, (fullMatch, numStr) => {
    const num = parseInt(numStr, 10)
    if (mapping.has(num)) {
      return `knob_${mapping.get(num)}`
    }
    return fullMatch
  })
}

async function processFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8')
  const knobNumbers = extractUniqueKnobs(content)

  if (knobNumbers.length === 0) return null

  if (isAlreadySequential(knobNumbers)) {
    return { filePath, skipped: true, knobNumbers }
  }

  // Build the mapping: sorted knob numbers -> 1, 2, 3, ...
  const mapping = new Map()
  knobNumbers.forEach((num, i) => {
    mapping.set(num, i + 1)
  })

  const newContent = remapContent(content, mapping)

  if (writeMode) {
    await fs.writeFile(filePath, newContent, 'utf-8')
  }

  return { filePath, skipped: false, knobNumbers, mapping }
}

async function main() {
  console.log(writeMode ? 'WRITE MODE: Changes will be written to files.\n' : 'DRY RUN: No files will be modified. Use --write to apply changes.\n')

  const fragFiles = await findFragFiles(shadersDir)
  fragFiles.sort()

  let processed = 0
  let skipped = 0
  let noKnobs = 0

  for (const filePath of fragFiles) {
    const result = await processFile(filePath)
    const relPath = relative(projectRoot, filePath)

    if (result === null) {
      noKnobs++
      continue
    }

    if (result.skipped) {
      skipped++
      console.log(`  SKIP ${relPath} (already sequential: knob_1..knob_${result.knobNumbers.length})`)
      continue
    }

    processed++
    console.log(`  ${writeMode ? 'WRITE' : 'WOULD REMAP'} ${relPath}`)
    for (const [oldNum, newNum] of result.mapping) {
      if (oldNum !== newNum) {
        console.log(`    knob_${oldNum} -> knob_${newNum}`)
      }
    }
  }

  console.log(`\nSummary:`)
  console.log(`  ${fragFiles.length} .frag files found`)
  console.log(`  ${noKnobs} files with no knobs`)
  console.log(`  ${skipped} files already sequential (skipped)`)
  console.log(`  ${processed} files ${writeMode ? 'remapped' : 'would be remapped'}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
