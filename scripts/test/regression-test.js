import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

class RegressionTester {
    constructor(options = {}) {
        this.baselineDir = options.baselineDir || './regression/baselines';
        this.comparisonDir = options.comparisonDir || './regression/comparisons';
        this.diffDir = options.diffDir || './regression/diffs';
        this.threshold = options.threshold || 0.1; // 10% difference allowed
        this.pixelThreshold = options.pixelThreshold || 0.1; // Per-pixel threshold
    }

    async init() {
        // Create directories
        [this.baselineDir, this.comparisonDir, this.diffDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async captureBaseline(shaderPath, options = {}) {
        const {
            frames = 5,
            frameInterval = 1000, // ms between frames
            width = 800,
            height = 800,
            knobs = {} // knob values for consistent testing
        } = options;

        const shaderName = shaderPath.split('/').pop().replace('.frag', '');
        const baselineSubDir = path.join(this.baselineDir, shaderName);
        
        if (!fs.existsSync(baselineSubDir)) {
            fs.mkdirSync(baselineSubDir, { recursive: true });
        }

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width, height }
        });
        const page = await context.newPage();

        // Build URL with knob parameters
        const knobParams = Object.entries(knobs)
            .map(([k, v]) => `&${k}=${v}`)
            .join('');
        const url = `http://localhost:6969/?shader=${shaderPath}&embed=true${knobParams}`;

        console.log(`\nCapturing baseline for: ${shaderName}`);
        console.log(`URL: ${url}`);

        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000); // Let shader initialize

            const captures = [];
            
            for (let i = 0; i < frames; i++) {
                const filename = `frame-${String(i).padStart(3, '0')}.png`;
                const filepath = path.join(baselineSubDir, filename);
                
                await page.screenshot({ path: filepath });
                console.log(`  Captured frame ${i + 1}/${frames}`);
                
                captures.push({
                    frame: i,
                    time: i * frameInterval,
                    filename,
                    hash: this.hashFile(filepath)
                });
                
                if (i < frames - 1) {
                    await page.waitForTimeout(frameInterval);
                }
            }

            // Save metadata
            const metadata = {
                shader: shaderPath,
                shaderName,
                captureDate: new Date().toISOString(),
                frames,
                frameInterval,
                resolution: { width, height },
                knobs,
                url,
                captures
            };

            const metadataPath = path.join(baselineSubDir, 'baseline-metadata.json');
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            
            console.log('✓ Baseline captured successfully');
            return metadata;

        } finally {
            await context.close();
            await browser.close();
        }
    }

    async runRegression(shaderPath, options = {}) {
        const shaderName = shaderPath.split('/').pop().replace('.frag', '');
        const baselineSubDir = path.join(this.baselineDir, shaderName);
        const metadataPath = path.join(baselineSubDir, 'baseline-metadata.json');

        if (!fs.existsSync(metadataPath)) {
            throw new Error(`No baseline found for ${shaderName}. Run captureBaseline first.`);
        }

        const baselineMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const { frames, frameInterval, resolution, knobs } = baselineMetadata;

        const comparisonSubDir = path.join(this.comparisonDir, shaderName);
        const diffSubDir = path.join(this.diffDir, shaderName);
        
        [comparisonSubDir, diffSubDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: resolution
        });
        const page = await context.newPage();

        console.log(`\nRunning regression test for: ${shaderName}`);
        console.log(`Comparing against baseline from: ${baselineMetadata.captureDate}`);

        const results = {
            shader: shaderPath,
            shaderName,
            testDate: new Date().toISOString(),
            baselineDate: baselineMetadata.captureDate,
            passed: true,
            frames: []
        };

        try {
            await page.goto(baselineMetadata.url, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1000); // Let shader initialize

            for (let i = 0; i < frames; i++) {
                const filename = `frame-${String(i).padStart(3, '0')}.png`;
                const baselinePath = path.join(baselineSubDir, filename);
                const comparisonPath = path.join(comparisonSubDir, filename);
                const diffPath = path.join(diffSubDir, filename);
                
                await page.screenshot({ path: comparisonPath });
                
                // Compare images
                const diffResult = await this.compareImages(
                    baselinePath,
                    comparisonPath,
                    diffPath
                );
                
                const framePassed = diffResult.percentDiff <= this.threshold;
                if (!framePassed) {
                    results.passed = false;
                }
                
                results.frames.push({
                    frame: i,
                    time: i * frameInterval,
                    passed: framePassed,
                    percentDiff: diffResult.percentDiff,
                    pixelsDiff: diffResult.pixelsDiff,
                    totalPixels: diffResult.totalPixels
                });
                
                console.log(`  Frame ${i + 1}: ${framePassed ? '✓' : '✗'} ` +
                    `(${(diffResult.percentDiff * 100).toFixed(2)}% difference)`);
                
                if (i < frames - 1) {
                    await page.waitForTimeout(frameInterval);
                }
            }

            // Save test results
            const resultsPath = path.join(comparisonSubDir, 'regression-results.json');
            fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
            
            console.log(`\nRegression test ${results.passed ? 'PASSED' : 'FAILED'}`);
            
            if (!results.passed) {
                console.log('View differences in:', diffSubDir);
            }
            
            return results;

        } finally {
            await context.close();
            await browser.close();
        }
    }

    async compareImages(baselinePath, comparisonPath, diffPath) {
        const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
        const comparison = PNG.sync.read(fs.readFileSync(comparisonPath));
        
        const { width, height } = baseline;
        const diff = new PNG({ width, height });
        
        const pixelsDiff = pixelmatch(
            baseline.data,
            comparison.data,
            diff.data,
            width,
            height,
            { threshold: this.pixelThreshold }
        );
        
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
        
        const totalPixels = width * height;
        const percentDiff = pixelsDiff / totalPixels;
        
        return {
            pixelsDiff,
            totalPixels,
            percentDiff
        };
    }

    hashFile(filepath) {
        const fileBuffer = fs.readFileSync(filepath);
        const hashSum = createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    async captureAllBaselines() {
        const shaders = [
            'claude-generated/quantum-particles',
            'claude-generated/liquid-crystal',
            'claude-generated/neural-network',
            'claude-generated/geometric-bloom',
            'claude-generated/aurora-waves',
            'claude-generated/fractal-garden',
            'claude-generated/time-crystals',
            'claude-generated/sonic-mandala',
            'claude-generated/digital-rain',
            'claude-generated/cosmic-web'
        ];

        // Standard knob settings for consistent testing
        const standardKnobs = {
            knob_1: 0.5,
            knob_2: 0.5,
            knob_3: 0.5,
            knob_4: 0.5,
            knob_5: 0.5
        };

        for (const shader of shaders) {
            try {
                await this.captureBaseline(shader, { knobs: standardKnobs });
            } catch (error) {
                console.error(`Failed to capture baseline for ${shader}:`, error.message);
            }
        }
    }

    async runAllRegressions() {
        const shaders = fs.readdirSync(this.baselineDir)
            .filter(dir => fs.statSync(path.join(this.baselineDir, dir)).isDirectory());

        const results = [];
        let passed = 0;
        let failed = 0;

        for (const shaderName of shaders) {
            try {
                // Reconstruct shader path from directory name
                const shaderPath = `claude-generated/${shaderName}`;
                const result = await this.runRegression(shaderPath);
                
                if (result.passed) {
                    passed++;
                } else {
                    failed++;
                }
                
                results.push(result);
            } catch (error) {
                console.error(`Failed to run regression for ${shaderName}:`, error.message);
                failed++;
            }
        }

        console.log(`\n=== Regression Test Summary ===`);
        console.log(`Total: ${results.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);

        return results;
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const shaderPath = process.argv[3];
    
    const tester = new RegressionTester();
    
    async function run() {
        await tester.init();
        
        switch (command) {
            case 'baseline':
                if (!shaderPath) {
                    console.log('Usage: node regression-test.js baseline <shader-path>');
                    console.log('       node regression-test.js baseline all');
                    process.exit(1);
                }
                
                if (shaderPath === 'all') {
                    await tester.captureAllBaselines();
                } else {
                    await tester.captureBaseline(shaderPath);
                }
                break;
                
            case 'test':
                if (!shaderPath) {
                    console.log('Usage: node regression-test.js test <shader-path>');
                    console.log('       node regression-test.js test all');
                    process.exit(1);
                }
                
                if (shaderPath === 'all') {
                    await tester.runAllRegressions();
                } else {
                    await tester.runRegression(shaderPath);
                }
                break;
                
            default:
                console.log(`
Regression Testing for Paper Cranes Shaders

Commands:
  baseline <shader-path>  - Capture baseline images for a shader
  baseline all           - Capture baselines for all shaders
  test <shader-path>     - Run regression test against baseline
  test all              - Run regression tests for all shaders

Examples:
  node regression-test.js baseline claude-generated/quantum-particles
  node regression-test.js test claude-generated/quantum-particles
  node regression-test.js baseline all
  node regression-test.js test all

Shader paths are relative to the shaders directory.
                `);
        }
    }
    
    run().catch(console.error);
}

export { RegressionTester };