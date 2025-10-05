#!/usr/bin/env node

import { context } from 'esbuild'
import { ensureDistDirectory, createBuildOptions } from '../../esbuild.common.js'

async function main() {
    await ensureDistDirectory()
    const getConfigs = createBuildOptions(true)
    const { copyOptions, bundleOptions } = await getConfigs()

    const ctxCopy = await context(copyOptions)
    const ctxBundle = await context(bundleOptions)

    await ctxCopy.watch()
    await ctxBundle.watch()

    await ctxBundle.serve({
        servedir: 'dist',
        port: 6970,
        host: '0.0.0.0'
    })
}

main()
