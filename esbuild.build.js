#!/usr/bin/env node

import { build } from 'esbuild'
import { ensureDistDirectory, createBuildOptions } from './esbuild.common.js'

async function main() {
    await ensureDistDirectory()
    const getConfigs = createBuildOptions(false)
    const { copyOptions, bundleOptions } = await getConfigs()

    await Promise.all([
        build(copyOptions),
        build(bundleOptions),
    ])
}

main()
