#!/usr/bin/env node

import { parseArgs } from 'node:util'
import fs from 'fs/promises'
import { normalizeAnalysisData } from '../src/audio/normalizer.js'

const options = {
    input: {
        type: 'string',
        short: 'i',
        default: 'audio-analysis.json'
    },
    output: {
        type: 'string',
        short: 'o',
        default: 'normalized-analysis.json'
    },
    help: {
        type: 'boolean',
        short: 'h'
    }
}

const {
    values: { help, input, output }
} = parseArgs({ options })

if (help) {
    console.log(`
Usage: normalize-analysis [options]

Options:
  -i, --input   Input JSON file (default: "audio-analysis.json")
  -o, --output  Output JSON file (default: "normalized-analysis.json")
  -h, --help    Show this help message

Description:
  Normalizes all properties in an audio analysis file to values between 0 and 1,
  where 0 represents the minimum value found for that property across all timestamps,
  and 1 represents the maximum value.
`)
    process.exit(0)
}

async function normalizeAnalysis() {
    try {
        // Read and parse the input file
        const data = JSON.parse(await fs.readFile(input, 'utf8'))

        // Use shared normalizer
        const { normalized, ranges } = normalizeAnalysisData(data)

        // Write the normalized data
        await fs.writeFile(output, JSON.stringify(normalized))

        // Also save the ranges for reference
        const rangesFile = output.replace('.json', '-ranges.json')
        await fs.writeFile(rangesFile, JSON.stringify(ranges, null, 2))

    } catch (error) {
        console.error('Error:', error.message)
        process.exit(1)
    }
}

normalizeAnalysis()
