import { ShaderTestHarness } from './shader-test-harness.js';
import { shaderTests } from './shader-tests.js';
import fs from 'fs';
import path from 'path';

/**
 * Quick test mode - captures key frames only
 */
async function quickTestAllShaders() {
    const harness = new ShaderTestHarness({
        outputDir: '../../test-output-quick'
    });
    
    await harness.init();
    
    const results = {
        timestamp: new Date().toISOString(),
        shaders: {}
    };
    
    // Test a subset for quick validation
    const shadersToTest = [
        'plasma',
        'satin',
        'claude-generated/quantum-particles',
        'claude-generated/liquid-crystal',
        'claude-generated/neural-network',
        'claude-generated/aurora-waves',
        'claude-generated/digital-rain'
    ];
    
    console.log(`\n⚡ Quick testing ${shadersToTest.length} shaders...\n`);
    
    for (const shaderPath of shadersToTest) {
        console.log(`Testing: ${shaderPath}`);
        
        try {
            const session = await harness.createSession(shaderPath);
            
            // Quick parameter test - just 5 key frames
            const quickAnimation = {
                duration: 2000,
                fps: 2.5, // Only 5 frames total
                keyframes: [
                    { time: 0, params: { knob_1: 0.2, knob_2: 0.2, knob_3: 0.5 } },
                    { time: 0.5, params: { knob_1: 0.8, knob_2: 0.8, knob_3: 0.5 } },
                    { time: 1, params: { knob_1: 0.2, knob_2: 0.2, knob_3: 0.5 } }
                ]
            };
            
            const result = await harness.animateParameters(session, quickAnimation);
            
            results.shaders[shaderPath] = {
                frames: result.frames.length,
                success: true
            };
            
            console.log(`  ✓ Captured ${result.frames.length} frames`);
            
        } catch (error) {
            console.error(`  ✗ Error: ${error.message}`);
            results.shaders[shaderPath] = {
                success: false,
                error: error.message
            };
        }
    }
    
    // Save results
    const resultsPath = path.join('../../test-output-quick', 'quick-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    
    console.log('\n✅ Quick test complete!');
    console.log(`Results saved to: ${resultsPath}`);
    
    await harness.cleanup();
}

// Run quick test
quickTestAllShaders().catch(console.error);