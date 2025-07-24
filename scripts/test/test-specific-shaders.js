import { ShaderTestHarness } from './shader-test-harness.js';
import { shaderTests } from './shader-tests.js';

/**
 * Test specific shaders with their defined animations
 */
async function testSpecificShaders(shaderList) {
    const harness = new ShaderTestHarness({
        outputDir: '../../test-output'
    });
    
    await harness.init();
    
    console.log(`\n🎯 Testing ${shaderList.length} specific shaders...\n`);
    
    const results = {};
    
    for (const shaderPath of shaderList) {
        const testConfig = shaderTests[shaderPath];
        
        if (!testConfig) {
            console.log(`⚠️  No test config for ${shaderPath}, using defaults`);
            
            // Use default test
            try {
                const session = await harness.createSession(shaderPath);
                
                await harness.animateParameters(session, {
                    duration: 3000,
                    fps: 10, // 30 frames total
                    keyframes: [
                        { time: 0, params: { knob_1: 0.2, knob_2: 0.2 } },
                        { time: 0.5, params: { knob_1: 0.8, knob_2: 0.8 } },
                        { time: 1, params: { knob_1: 0.2, knob_2: 0.2 } }
                    ]
                });
                
                results[shaderPath] = { status: 'success', type: 'default' };
                console.log(`✓ ${shaderPath} - default test passed`);
                
            } catch (error) {
                results[shaderPath] = { status: 'error', error: error.message };
                console.error(`✗ ${shaderPath} - ${error.message}`);
            }
            
            continue;
        }
        
        console.log(`\n📐 ${testConfig.name} (${shaderPath})`);
        
        try {
            const session = await harness.createSession(shaderPath);
            
            // Run first animation only for speed
            if (testConfig.animations && testConfig.animations.length > 0) {
                const animation = testConfig.animations[0];
                console.log(`  Running: ${animation.name}`);
                
                // Reduce fps for faster testing
                const testAnimation = {
                    ...animation,
                    fps: 10 // 10 fps instead of 30
                };
                
                const result = await harness.animateParameters(session, testAnimation);
                
                console.log(`  ✓ Captured ${result.frames.length} frames`);
                results[shaderPath] = { 
                    status: 'success', 
                    frames: result.frames.length,
                    animation: animation.name 
                };
            }
            
        } catch (error) {
            results[shaderPath] = { status: 'error', error: error.message };
            console.error(`  ✗ Error: ${error.message}`);
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Test Summary:');
    const successful = Object.values(results).filter(r => r.status === 'success').length;
    const failed = Object.values(results).filter(r => r.status === 'error').length;
    console.log(`  ✅ Successful: ${successful}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log('='.repeat(50) + '\n');
    
    await harness.cleanup();
    
    return results;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const shaderList = process.argv.slice(2);
    
    if (shaderList.length === 0) {
        // Default test list
        shaderList.push(
            'plasma',
            'satin',
            'mandala',
            'ripples',
            'kaleidoscope',
            'claude-generated/quantum-particles',
            'claude-generated/liquid-crystal',
            'claude-generated/neural-network',
            'claude-generated/aurora-waves',
            'claude-generated/digital-rain'
        );
    }
    
    testSpecificShaders(shaderList).catch(console.error);
}