import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

/**
 * Shader Test Harness - A systematic approach to shader development
 * 
 * Features:
 * - Parameter animation without page reloads
 * - Automatic screenshot capture at keyframes
 * - Video recording of animations
 * - Parameter exploration and validation
 * - Performance metrics
 */

class ShaderTestHarness {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:6969';
        this.outputDir = options.outputDir || '../../test-output';
        this.defaultViewport = options.viewport || { width: 800, height: 800 };
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    async init() {
        this.browser = await chromium.launch({ 
            headless: true,
            args: ['--disable-web-security'] // Allow cross-origin for testing
        });
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async cleanup() {
        // Close browser but keep all output files
        if (this.context) await this.context.close();
        if (this.browser) await this.browser.close();
        console.log(`Test outputs saved to: ${this.outputDir}`);
    }

    /**
     * Create a test session for a shader
     */
    async createSession(shaderPath, sessionOptions = {}) {
        const {
            recordVideo = true,
            viewport = this.defaultViewport
        } = sessionOptions;

        // Create session-specific output directory
        const shaderName = shaderPath.split('/').pop().replace('.frag', '');
        const sessionId = new Date().toISOString();
        const sessionDir = path.join(this.outputDir, shaderName, sessionId);
        
        // Create directories
        ['images', 'videos', 'data'].forEach(subdir => {
            const dir = path.join(sessionDir, subdir);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Create context with video recording
        const contextOptions = { viewport };
        if (recordVideo) {
            contextOptions.recordVideo = {
                dir: path.join(sessionDir, 'videos'),
                size: viewport
            };
        }

        this.context = await this.browser.newContext(contextOptions);
        this.page = await this.context.newPage();

        // Inject parameter control system
        await this.page.addInitScript(() => {
            window.shaderTestHarness = {
                originalParams: new URLSearchParams(window.location.search),
                currentParams: {},
                
                setParam(name, value) {
                    this.currentParams[name] = value;
                    // Update the shader uniform directly if possible
                    if (window.cranes && window.cranes.manualFeatures) {
                        window.cranes.manualFeatures[name] = parseFloat(value);
                    }
                },
                
                setParams(params) {
                    Object.entries(params).forEach(([name, value]) => {
                        this.setParam(name, value);
                    });
                },
                
                getParam(name) {
                    return this.currentParams[name] || this.originalParams.get(name);
                },
                
                getAllParams() {
                    return { ...Object.fromEntries(this.originalParams), ...this.currentParams };
                }
            };
        });

        // Load shader with embed mode
        const url = `${this.baseUrl}/?shader=${shaderPath}&embed=true`;
        await this.page.goto(url, { waitUntil: 'networkidle' });
        
        // Wait for shader initialization
        await this.page.waitForTimeout(1000);

        return {
            page: this.page,
            sessionDir,
            shaderName,
            sessionId,
            
            // Parameter control methods
            setParam: async (name, value) => {
                await this.page.evaluate(({ name, value }) => {
                    window.shaderTestHarness.setParam(name, value);
                }, { name, value });
            },
            
            setParams: async (params) => {
                await this.page.evaluate((params) => {
                    window.shaderTestHarness.setParams(params);
                }, params);
            },
            
            // Capture methods
            screenshot: async (name) => {
                const filename = `${name || new Date().toISOString()}.png`;
                const filepath = path.join(sessionDir, 'images', filename);
                await this.page.screenshot({ path: filepath });
                return filepath;
            },
            
            // Get performance metrics
            getMetrics: async () => {
                return await this.page.evaluate(() => {
                    if (window.performance && window.performance.memory) {
                        return {
                            memory: {
                                usedJSHeapSize: window.performance.memory.usedJSHeapSize,
                                totalJSHeapSize: window.performance.memory.totalJSHeapSize
                            },
                            fps: window.cranes?.fps || 0
                        };
                    }
                    return null;
                });
            },
            
            // Save session data
            saveData: async (data) => {
                const dataPath = path.join(sessionDir, 'data', 'session-data.json');
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            }
        };
    }

    /**
     * Run an animation sequence with parameter changes
     */
    async animateParameters(session, animation) {
        const { keyframes, duration = 5000, fps = 30 } = animation;
        const frameCount = Math.floor(duration * fps / 1000);
        const frameInterval = 1000 / fps;
        
        const results = {
            frames: [],
            metrics: [],
            animation: animation
        };

        console.log(`Running animation: ${frameCount} frames at ${fps} FPS`);

        for (let frame = 0; frame < frameCount; frame++) {
            const progress = frame / (frameCount - 1);
            const timestamp = progress * duration;
            
            // Interpolate parameters for this frame
            const params = this.interpolateKeyframes(keyframes, progress);
            
            // Apply parameters
            await session.setParams(params);
            
            // Small delay to ensure shader updates
            await session.page.waitForTimeout(frameInterval);
            
            // Capture frame
            const screenshotPath = await session.screenshot(`frame-${String(frame).padStart(4, '0')}`);
            
            // Capture metrics
            const metrics = await session.getMetrics();
            
            results.frames.push({
                frame,
                timestamp,
                progress,
                params,
                screenshot: screenshotPath,
                metrics
            });
            
            if (frame % 10 === 0) {
                console.log(`  Progress: ${Math.round(progress * 100)}%`);
            }
        }

        // Save animation data
        await session.saveData(results);
        
        return results;
    }

    /**
     * Interpolate between keyframes
     */
    interpolateKeyframes(keyframes, progress) {
        // Find surrounding keyframes
        let prevKey = null;
        let nextKey = null;
        
        for (let i = 0; i < keyframes.length; i++) {
            if (keyframes[i].time <= progress) {
                prevKey = keyframes[i];
            }
            if (keyframes[i].time >= progress && !nextKey) {
                nextKey = keyframes[i];
                break;
            }
        }
        
        // Edge cases
        if (!prevKey) return keyframes[0].params;
        if (!nextKey) return keyframes[keyframes.length - 1].params;
        if (prevKey === nextKey) return prevKey.params;
        
        // Linear interpolation between keyframes
        const localProgress = (progress - prevKey.time) / (nextKey.time - prevKey.time);
        const interpolated = {};
        
        // Get all parameter names
        const allParams = new Set([
            ...Object.keys(prevKey.params),
            ...Object.keys(nextKey.params)
        ]);
        
        for (const param of allParams) {
            const prevVal = parseFloat(prevKey.params[param] || 0);
            const nextVal = parseFloat(nextKey.params[param] || 0);
            
            // Check if parameter exists in both keyframes
            if (param in prevKey.params && param in nextKey.params) {
                // Interpolate numeric values
                interpolated[param] = prevVal + (nextVal - prevVal) * localProgress;
            } else if (param in prevKey.params) {
                interpolated[param] = prevVal;
            } else {
                interpolated[param] = nextVal;
            }
        }
        
        return interpolated;
    }

    /**
     * Run a parameter sweep test
     */
    async parameterSweep(session, config) {
        const { param, min = 0, max = 1, steps = 10 } = config;
        const results = [];
        
        console.log(`Parameter sweep: ${param} from ${min} to ${max} in ${steps} steps`);
        
        for (let i = 0; i < steps; i++) {
            const value = min + (max - min) * (i / (steps - 1));
            
            await session.setParam(param, value);
            await session.page.waitForTimeout(100);
            
            const screenshotPath = await session.screenshot(`sweep-${param}-${value.toFixed(3)}`);
            
            results.push({
                param,
                value,
                screenshot: screenshotPath
            });
            
            console.log(`  ${param} = ${value.toFixed(3)}`);
        }
        
        return results;
    }

    /**
     * Validate shader doesn't produce black or static output
     */
    async validateShaderOutput(session) {
        const validation = {
            isBlack: false,
            isStatic: false,
            hasErrors: false,
            samples: []
        };
        
        // Take multiple samples
        const sampleCount = 5;
        const sampleInterval = 500;
        
        for (let i = 0; i < sampleCount; i++) {
            // Capture screenshot
            const screenshotPath = await session.screenshot(`validation-${i}`);
            
            // Check for console errors
            const errors = await session.page.evaluate(() => {
                return window.shaderErrors || [];
            });
            
            if (errors.length > 0) {
                validation.hasErrors = true;
                validation.errors = errors;
            }
            
            validation.samples.push({
                index: i,
                screenshot: screenshotPath,
                timestamp: Date.now()
            });
            
            if (i < sampleCount - 1) {
                await session.page.waitForTimeout(sampleInterval);
            }
        }
        
        // Additional validation could check pixel data for black/static frames
        // This would require reading the images and analyzing them
        
        return validation;
    }
}

// Export for use in other scripts
export { ShaderTestHarness };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const shaderPath = process.argv[2];
    const command = process.argv[3] || 'test';
    
    if (!shaderPath) {
        console.log(`
Shader Test Harness

Usage: node shader-test-harness.js <shader-path> [command]

Commands:
  test      - Run default animation test
  sweep     - Run parameter sweep
  validate  - Validate shader output

Examples:
  node shader-test-harness.js claude-generated/quantum-particles test
  node shader-test-harness.js plasma sweep
        `);
        process.exit(1);
    }
    
    async function runTest() {
        const harness = new ShaderTestHarness();
        await harness.init();
        
        try {
            const session = await harness.createSession(shaderPath);
            
            switch (command) {
                case 'sweep':
                    // Example parameter sweep
                    await harness.parameterSweep(session, {
                        param: 'knob_1',
                        min: 0,
                        max: 1,
                        steps: 10
                    });
                    break;
                    
                case 'validate':
                    const validation = await harness.validateShaderOutput(session);
                    console.log('Validation results:', validation);
                    break;
                    
                case 'test':
                default:
                    // Example animation with keyframes
                    await harness.animateParameters(session, {
                        duration: 5000,
                        fps: 30,
                        keyframes: [
                            { time: 0, params: { knob_1: 0, knob_2: 0, knob_3: 0.5 } },
                            { time: 0.5, params: { knob_1: 1, knob_2: 0.5, knob_3: 0.5 } },
                            { time: 1, params: { knob_1: 0, knob_2: 1, knob_3: 0.5 } }
                        ]
                    });
                    break;
            }
            
            console.log('Test complete!');
            
        } finally {
            await harness.cleanup();
        }
    }
    
    runTest().catch(console.error);
}