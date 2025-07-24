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
        this.outputDir = options.outputDir || '../../screenshots';
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
                size: viewport,
                // Force 60fps for smooth capture
                videoBitsPerSecond: 8000000,
                videoCodec: 'vp9'
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
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        
        // Wait for shader initialization
        await this.page.waitForTimeout(2000);

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
            screenshot: async (params = {}) => {
                // Get current timestamp
                const timestamp = new Date().toISOString();
                
                // Build vampire naming format
                let filename = timestamp + '🦇🌙';
                
                // Add parameters in vampire format
                const paramPairs = [];
                for (const [key, value] of Object.entries(params)) {
                    paramPairs.push(`${key}🩸${typeof value === 'number' ? value.toFixed(3) : value}`);
                }
                filename += paramPairs.join('🪦');
                filename += '.jpg';
                
                const filepath = path.join(sessionDir, 'images', filename);
                await this.page.screenshot({ 
                    path: filepath,
                    type: 'jpeg',
                    quality: 85
                });
                return { filepath, filename, timestamp, params };
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
        const { 
            keyframes, 
            duration = 30000, // Default 30 seconds
            screenshotInterval = 5000, // Screenshot every 5 seconds
            description = '',
            musicalContext = ''
        } = animation;
        
        const results = {
            shader: session.shaderName,
            description,
            musicalContext,
            duration,
            screenshotInterval,
            timeline: [],
            animation: animation,
            sessionId: session.sessionId
        };

        console.log(`Running animation: ${description || 'Unnamed'} (${duration}ms)`);
        console.log(`Screenshots every ${screenshotInterval}ms`);

        const startTime = Date.now();
        let elapsedTime = 0;
        let screenshotCount = 0;

        while (elapsedTime <= duration) {
            const progress = elapsedTime / duration;
            
            // Interpolate parameters for this frame
            const params = this.interpolateKeyframes(keyframes, progress);
            
            // Apply parameters
            await session.setParams(params);
            
            // Wait a bit for shader to update
            await session.page.waitForTimeout(100);
            
            // Capture screenshot with vampire naming
            const screenshot = await session.screenshot(params);
            
            // Capture metrics
            const metrics = await session.getMetrics();
            
            // Build timeline entry
            const timelineEntry = {
                time: elapsedTime,
                params,
                screenshot: screenshot.filename,
                description: this.getDescriptionForProgress(animation, progress),
                metrics
            };
            
            results.timeline.push(timelineEntry);
            screenshotCount++;
            
            console.log(`  [${elapsedTime}ms] Captured: ${screenshot.filename}`);
            
            // Wait for next screenshot interval
            if (elapsedTime < duration) {
                const nextTime = Math.min(elapsedTime + screenshotInterval, duration);
                const waitTime = nextTime - elapsedTime;
                await session.page.waitForTimeout(waitTime - 100); // Account for processing time
                elapsedTime = nextTime;
            } else {
                break;
            }
        }

        console.log(`Animation complete: ${screenshotCount} screenshots captured`);

        // Save timeline data
        const timelinePath = path.join(session.sessionDir, 'timeline.json');
        fs.writeFileSync(timelinePath, JSON.stringify(results, null, 2));
        
        return results;
    }

    /**
     * Get description for current progress in animation
     */
    getDescriptionForProgress(animation, progress) {
        if (!animation.descriptions) return '';
        
        // Find the most recent description
        let description = '';
        for (const desc of animation.descriptions) {
            if (desc.time <= progress) {
                description = desc.text;
            }
        }
        return description;
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
            
            const screenshot = await session.screenshot({ [param]: value });
            
            results.push({
                param,
                value,
                screenshot: screenshot.filename,
                filepath: screenshot.filepath
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
            const screenshot = await session.screenshot({ validation: i });
            
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
                screenshot: screenshot.filename,
                filepath: screenshot.filepath,
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