#!/usr/bin/env node
import { testSingleShader } from './test-single-shader.js';

/**
 * Run tests on all shaders using the single shader test script
 */

const SHADERS = [
    'futuristic_combinator',
    'tech_house_pulse', 
    'tech_house_grid',
    'tech_house_spectrum'
];

async function runAllShaders() {
    console.log('\n🦇🌙 Running Comprehensive Shader Tests 🦇🌙\n');
    
    const allResults = [];
    
    for (const shader of SHADERS) {
        try {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`🎨 STARTING: ${shader.toUpperCase()}`);
            console.log(`${'='.repeat(80)}`);
            
            const results = await testSingleShader(shader, {
                timeout: 600000 // 10 minutes per sequence
            });
            
            allResults.push({
                shader,
                success: true,
                results
            });
            
            console.log(`\n✅ ${shader} COMPLETED SUCCESSFULLY`);
            
        } catch (error) {
            console.error(`\n❌ ${shader} FAILED: ${error.message}`);
            allResults.push({
                shader,
                success: false,
                error: error.message
            });
        }
        
        // Brief pause between shaders
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Print final summary
    console.log('\n' + '='.repeat(80));
    console.log('🦇 FINAL RESULTS 🦇');
    console.log('='.repeat(80));
    
    const successful = allResults.filter(r => r.success);
    const failed = allResults.filter(r => !r.success);
    
    console.log(`\n✅ Successful: ${successful.length}/${allResults.length}`);
    successful.forEach(r => {
        const totalFrames = r.results.reduce((sum, test) => sum + test.results.timeline.length, 0);
        console.log(`   ${r.shader}: ${r.results.length} sequences, ${totalFrames} frames`);
    });
    
    if (failed.length > 0) {
        console.log(`\n❌ Failed: ${failed.length}`);
        failed.forEach(r => console.log(`   ${r.shader}: ${r.error}`));
    }
    
    console.log('\n🦇 All shader tests complete! 🦇\n');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
    console.log(`
🦇 All Shader Test Runner 🦇

Usage: node run-all-shaders.js

This script runs comprehensive tests on all shaders with:
- Multiple musical sequences per shader
- Video recording at 60fps
- Detailed emotional commentary
- Parameter analysis
- Timeline data with vampire naming

Tested Shaders:
${SHADERS.map(s => `  - ${s}`).join('\n')}
    `);
    process.exit(0);
}

runAllShaders().catch(console.error);