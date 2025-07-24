import { ShaderTestHarness } from './shader-test-harness.js';
import { shaderTests, getAllShaderPaths } from './shader-tests.js';
import fs from 'fs';
import path from 'path';

/**
 * Systematically test all shaders with animations and validations
 */
async function runAllShaderTests() {
    const harness = new ShaderTestHarness({
        outputDir: '../../test-output'
    });
    
    await harness.init();
    
    const results = {
        timestamp: new Date().toISOString(),
        shaders: {},
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
            warnings: 0
        }
    };
    
    const shaderPaths = getAllShaderPaths();
    console.log(`\n🧪 Testing ${shaderPaths.length} shaders systematically...\n`);
    
    for (const shaderPath of shaderPaths) {
        const testConfig = shaderTests[shaderPath];
        
        if (!testConfig) {
            console.log(`⚠️  No test configuration for: ${shaderPath}`);
            results.summary.warnings++;
            continue;
        }
        
        console.log(`\n📐 Testing: ${testConfig.name} (${shaderPath})`);
        console.log(`   ${testConfig.description}`);
        
        results.shaders[shaderPath] = {
            name: testConfig.name,
            description: testConfig.description,
            tests: []
        };
        
        try {
            // Create session for this shader
            const session = await harness.createSession(shaderPath);
            
            // Run validation first
            console.log('   🔍 Validating shader output...');
            const validation = await harness.validateShaderOutput(session);
            
            if (validation.hasErrors) {
                console.log(`   ❌ Shader has errors:`, validation.errors);
                results.shaders[shaderPath].status = 'error';
                results.summary.failed++;
                continue;
            }
            
            // Run animations
            if (testConfig.animations) {
                for (const animation of testConfig.animations) {
                    console.log(`   🎬 Running animation: ${animation.name}`);
                    const animResult = await harness.animateParameters(session, animation);
                    
                    results.shaders[shaderPath].tests.push({
                        type: 'animation',
                        name: animation.name,
                        frameCount: animResult.frames.length,
                        duration: animation.duration
                    });
                    
                    // Quick check that we got frames
                    if (animResult.frames.length > 0) {
                        console.log(`      ✓ Captured ${animResult.frames.length} frames`);
                    }
                }
            }
            
            // Run parameter sweeps
            if (testConfig.parameterSweeps) {
                for (const sweep of testConfig.parameterSweeps) {
                    console.log(`   📊 Parameter sweep: ${sweep.name || sweep.param}`);
                    const sweepResult = await harness.parameterSweep(session, sweep);
                    
                    results.shaders[shaderPath].tests.push({
                        type: 'sweep',
                        name: sweep.name || sweep.param,
                        param: sweep.param,
                        samples: sweepResult.length
                    });
                    
                    console.log(`      ✓ Captured ${sweepResult.length} samples`);
                }
            }
            
            results.shaders[shaderPath].status = 'passed';
            results.summary.passed++;
            console.log(`   ✅ All tests passed for ${testConfig.name}`);
            
        } catch (error) {
            console.error(`   ❌ Error testing ${shaderPath}:`, error.message);
            results.shaders[shaderPath].status = 'failed';
            results.shaders[shaderPath].error = error.message;
            results.summary.failed++;
        }
        
        results.summary.total++;
    }
    
    // Save summary report
    const reportPath = path.join('../../test-output', 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Test Summary:');
    console.log(`   Total shaders: ${results.summary.total}`);
    console.log(`   ✅ Passed: ${results.summary.passed}`);
    console.log(`   ❌ Failed: ${results.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${results.summary.warnings}`);
    console.log(`\nDetailed results saved to: ${reportPath}`);
    console.log(`Test outputs saved to: ../../test-output/`);
    console.log('='.repeat(60) + '\n');
    
    await harness.cleanup();
}

// Add test for shaders not in the predefined list
async function discoverAndTestShaders() {
    const harness = new ShaderTestHarness({
        outputDir: '../../test-output'
    });
    
    await harness.init();
    
    // Find all .frag files in shaders directory
    const shadersDir = '../../shaders';
    const allShaders = [];
    
    function findShaders(dir, prefix = '') {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const relativePath = prefix ? `${prefix}/${file}` : file;
            
            if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.')) {
                findShaders(fullPath, relativePath);
            } else if (file.endsWith('.frag')) {
                allShaders.push(relativePath.replace('.frag', ''));
            }
        }
    }
    
    findShaders(shadersDir);
    
    console.log(`\n🔍 Found ${allShaders.length} shader files`);
    
    // Test any that aren't in our predefined list
    const untestedShaders = allShaders.filter(s => !shaderTests[s]);
    
    if (untestedShaders.length > 0) {
        console.log(`\n📦 Testing ${untestedShaders.length} additional shaders with default animations...\n`);
        
        for (const shaderPath of untestedShaders) {
            console.log(`Testing: ${shaderPath}`);
            
            try {
                const session = await harness.createSession(shaderPath);
                
                // Run a simple default animation
                await harness.animateParameters(session, {
                    duration: 3000,
                    fps: 20,
                    keyframes: [
                        { time: 0, params: { knob_1: 0.3, knob_2: 0.3, knob_3: 0.3 } },
                        { time: 0.5, params: { knob_1: 0.7, knob_2: 0.7, knob_3: 0.7 } },
                        { time: 1, params: { knob_1: 0.3, knob_2: 0.3, knob_3: 0.3 } }
                    ]
                });
                
                console.log(`  ✓ Basic test passed`);
                
            } catch (error) {
                console.error(`  ✗ Error: ${error.message}`);
            }
        }
    }
    
    await harness.cleanup();
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
    const mode = process.argv[2] || 'all';
    
    if (mode === 'discover') {
        discoverAndTestShaders().catch(console.error);
    } else {
        runAllShaderTests().catch(console.error);
    }
}