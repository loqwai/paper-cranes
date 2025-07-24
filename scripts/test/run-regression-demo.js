#!/usr/bin/env node
import { RegressionTester } from './regression-test.js';

async function runDemo() {
    console.log('=== Paper Cranes Regression Testing Demo ===\n');
    
    const tester = new RegressionTester({
        threshold: 0.05, // 5% difference allowed
        pixelThreshold: 0.1
    });
    
    await tester.init();
    
    const testShader = 'claude-generated/quantum-particles';
    
    console.log('Step 1: Capturing baseline for quantum-particles shader...');
    console.log('This will take 5 screenshots, 1 second apart.\n');
    
    try {
        // Capture baseline with consistent knob settings
        await tester.captureBaseline(testShader, {
            frames: 5,
            frameInterval: 1000,
            knobs: {
                knob_1: 0.3,  // Quantum scale
                knob_2: 0.7,  // Tunneling probability
                knob_3: 0.5,  // Wave collapse
                knob_4: 0.4,  // Color shift
                knob_5: 0.6   // Particle size
            }
        });
        
        console.log('\nStep 2: Waiting a moment before running regression test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\nStep 3: Running regression test...');
        console.log('This will capture new screenshots and compare them to the baseline.\n');
        
        const result = await tester.runRegression(testShader);
        
        if (result.passed) {
            console.log('\n✅ Success! The shader renders consistently.');
            console.log('All frames matched within the 5% threshold.');
        } else {
            console.log('\n⚠️  Some frames showed differences above the threshold.');
            console.log('This could be due to:');
            console.log('- Animation timing differences');
            console.log('- Random elements in the shader');
            console.log('- Platform-specific rendering differences');
        }
        
        console.log('\nFrame-by-frame results:');
        result.frames.forEach(frame => {
            const status = frame.passed ? '✓' : '✗';
            const percent = (frame.percentDiff * 100).toFixed(2);
            console.log(`  Frame ${frame.frame}: ${status} (${percent}% difference)`);
        });
        
        console.log('\n=== Demo Complete ===');
        console.log('\nTo capture baselines for all shaders:');
        console.log('  node scripts/test/regression-test.js baseline all');
        console.log('\nTo run regression tests for all shaders:');
        console.log('  node scripts/test/regression-test.js test all');
        console.log('\nRegression test outputs are saved in:');
        console.log('  ./regression/baselines/    - Original captures');
        console.log('  ./regression/comparisons/  - New captures');
        console.log('  ./regression/diffs/        - Visual differences');
        
    } catch (error) {
        console.error('Error during demo:', error.message);
    }
}

runDemo().catch(console.error);