#!/usr/bin/env node
import { ShaderTestHarness } from './shader-test-harness.js';
import { musicalSequences, getSequence, getSequenceNames } from './musical-sequences.js';
import fs from 'fs';
import path from 'path';

/**
 * Run musical tests on shaders
 * Tests each shader with various musical sequences to simulate audio-reactive behavior
 */

// Shaders to test
const SHADERS_TO_TEST = [
    'futuristic_combinator',
    'tech_house_pulse', 
    'tech_house_grid',
    'tech_house_spectrum'
];

// Musical sequences to run on each shader
const SEQUENCES_TO_RUN = [
    'the-drop',
    'vampire-waltz',
    'melodic-journey',
    'techno-hammer'
];

async function runMusicalTests() {
    console.log('\n🦇🌙 Starting Vampire Rave Musical Tests 🦇🌙\n');
    
    const harness = new ShaderTestHarness({
        outputDir: '../../screenshots'
    });
    
    await harness.init();
    
    const allResults = [];
    
    try {
        for (const shaderName of SHADERS_TO_TEST) {
            console.log(`\n🎨 Testing shader: ${shaderName}`);
            console.log('━'.repeat(50));
            
            for (const sequenceName of SEQUENCES_TO_RUN) {
                const sequence = getSequence(sequenceName);
                if (!sequence) {
                    console.error(`Sequence not found: ${sequenceName}`);
                    continue;
                }
                
                console.log(`\n🎵 Running sequence: ${sequenceName}`);
                console.log(`   ${sequence.description}`);
                
                try {
                    // Create session
                    const session = await harness.createSession(shaderName, {
                        recordVideo: true,
                        viewport: { width: 800, height: 800 }
                    });
                    
                    // Map parameter names from sequences to knob names
                    const mappedSequence = mapSequenceParameters(sequence);
                    
                    // Run the animation
                    const results = await harness.animateParameters(session, {
                        ...mappedSequence,
                        name: sequenceName
                    });
                    
                    // Store results
                    allResults.push({
                        shader: shaderName,
                        sequence: sequenceName,
                        results
                    });
                    
                    console.log(`   ✅ Completed: ${results.timeline.length} screenshots captured`);
                    
                } catch (error) {
                    console.error(`   ❌ Error: ${error.message}`);
                }
                
                // Small delay between sequences
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Generate summary report
        generateSummaryReport(allResults);
        
    } finally {
        await harness.cleanup();
    }
    
    console.log('\n🦇 All tests complete! Check screenshots/ directory for results.\n');
}

/**
 * Map musical parameter names to shader knob names
 */
function mapSequenceParameters(sequence) {
    const parameterMapping = {
        'bass': 'knob_1',
        'kick': 'knob_2',
        'mid': 'knob_3',
        'high': 'knob_4',
        'energy': 'knob_5',
        'spectral': 'knob_6',
        'tempo': 'knob_7',
        'drop': 'knob_8',
        'vocal': 'knob_9',
        'sub': 'knob_10'
    };
    
    // Deep clone the sequence
    const mapped = JSON.parse(JSON.stringify(sequence));
    
    // Map keyframe parameters
    if (mapped.keyframes) {
        mapped.keyframes = mapped.keyframes.map(keyframe => {
            const mappedParams = {};
            for (const [key, value] of Object.entries(keyframe.params)) {
                const mappedKey = parameterMapping[key] || key;
                mappedParams[mappedKey] = value;
            }
            return {
                ...keyframe,
                params: mappedParams
            };
        });
    }
    
    return mapped;
}

/**
 * Generate a summary report of all tests
 */
function generateSummaryReport(allResults) {
    const report = {
        timestamp: new Date().toISOString(),
        totalTests: allResults.length,
        shadersTested: [...new Set(allResults.map(r => r.shader))],
        sequencesRun: [...new Set(allResults.map(r => r.sequence))],
        totalScreenshots: allResults.reduce((sum, r) => sum + r.results.timeline.length, 0),
        tests: allResults.map(r => ({
            shader: r.shader,
            sequence: r.sequence,
            screenshots: r.results.timeline.length,
            duration: r.results.duration,
            sessionId: r.results.sessionId
        }))
    };
    
    const reportPath = path.join('../../screenshots', 'test-summary.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Test Summary:');
    console.log(`   Total tests: ${report.totalTests}`);
    console.log(`   Total screenshots: ${report.totalScreenshots}`);
    console.log(`   Report saved to: ${reportPath}`);
}

// Handle specific test requests
const args = process.argv.slice(2);
if (args.length > 0) {
    // Override defaults with command line args
    if (args[0] === '--shader' && args[1]) {
        SHADERS_TO_TEST.length = 0;
        SHADERS_TO_TEST.push(args[1]);
    }
    if (args[2] === '--sequence' && args[3]) {
        SEQUENCES_TO_RUN.length = 0;
        SEQUENCES_TO_RUN.push(args[3]);
    }
}

// Show usage if --help
if (args.includes('--help')) {
    console.log(`
Musical Test Runner

Usage: node run-musical-tests.js [options]

Options:
  --shader <name>     Test only a specific shader
  --sequence <name>   Run only a specific sequence
  --help             Show this help message

Available sequences:
  ${getSequenceNames().join('\n  ')}

Examples:
  node run-musical-tests.js
  node run-musical-tests.js --shader tech_house_pulse
  node run-musical-tests.js --shader futuristic_combinator --sequence the-drop
    `);
    process.exit(0);
}

// Run the tests
runMusicalTests().catch(console.error);