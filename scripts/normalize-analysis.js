#!/usr/bin/env node

import { parseArgs } from 'node:util'
import fs from 'fs/promises'

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

        // Collect min/max for each property
        const ranges = {}

        // First pass: find min/max values
        for (const entry of data) {
            for (const [key, value] of Object.entries(entry.features)) {
                if (typeof value !== 'number') continue

                if (!ranges[key]) {
                    ranges[key] = { min: value, max: value }
                } else {
                    ranges[key].min = Math.min(ranges[key].min, value)
                    ranges[key].max = Math.max(ranges[key].max, value)
                }
            }
        }

        // Second pass: normalize values
        const normalized = data.map(entry => {
            const normalizedFeatures = {}

            for (const [key, value] of Object.entries(entry.features)) {
                if (typeof value !== 'number') {
                    normalizedFeatures[key] = value
                    continue
                }

                const { min, max } = ranges[key]
                if (min === max) {
                    normalizedFeatures[key] = 0 // or 1, depending on preference
                } else {
                    normalizedFeatures[key] = (value - min) / (max - min)
                }
            }

            return {
                timestamp: entry.timestamp,
                features: normalizedFeatures
            }
        })

        // Write the normalized data
        await fs.writeFile(output, JSON.stringify(normalized))
        console.log(`Normalized data written to ${output}`)

        // Also save the ranges for reference
        const rangesFile = output.replace('.json', '-ranges.json')
        await fs.writeFile(rangesFile, JSON.stringify(ranges, null, 2))
        console.log(`Range information written to ${rangesFile}`)

    } catch (error) {
        console.error('Error:', error.message)
        process.exit(1)
    }
}

normalizeAnalysis()
