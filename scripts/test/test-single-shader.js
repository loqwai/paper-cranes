#!/usr/bin/env node
import { ShaderTestHarness } from './shader-test-harness.js';
import { musicalSequences } from './musical-sequences.js';
import fs from 'fs';
import path from 'path';

/**
 * Test a single shader with all relevant musical sequences
 * Creates comprehensive video and image output with commentary
 */

// Shader-specific sequence mappings
const SHADER_SEQUENCES = {
    'futuristic_combinator': ['the-drop', 'vampire-waltz', 'ambient-drift'],
    'tech_house_pulse': ['the-drop', 'techno-hammer', 'melodic-journey'],
    'tech_house_grid': ['the-drop', 'melodic-journey', 'techno-hammer'],
    'tech_house_spectrum': ['the-drop', 'drum-and-bass-rush', 'ambient-drift']
};

// Enhanced emotional commentary
const SHADER_COMMENTARY = {
    'futuristic_combinator': {
        name: 'Futuristic Combinator',
        description: 'A raymarched geometric entity that breathes with bass and fractures with energy',
        personality: 'Digital consciousness trapped in mathematical form',
        visualResponse: {
            bass: 'Controls twist factor - deeper bass creates more spiral distortion',
            kick: 'Drives global scale - each kick makes the form pulse larger',
            mid: 'Controls domain repetition frequency - melody creates pattern complexity',
            high: 'Affects smoothness factor - highs sharpen edges for crystalline precision',
            energy: 'Drives shape iterations - calm is simple, chaos is intricate',
            drop: 'Shifts color hue base - signaling the climactic moment'
        }
    },
    'tech_house_pulse': {
        name: 'Tech House Pulse',
        description: 'Hypnotic 4/4 rhythm made visible through pulsing geometry',
        personality: 'The heartbeat of the underground dancefloor',
        visualResponse: {
            bass: 'Controls twist factor - bass creates hypnotic spiral motion',
            kick: 'Drives pulse intensity - the visual kick drum',
            mid: 'Controls shape morphing between sphere and cube forms',
            high: 'Creates rim lighting and sharp edge definition',
            energy: 'Saturates colors from muted blues to vibrant purples',
            drop: 'Triggers color palette shift from blue to purple/gold'
        }
    },
    'tech_house_grid': {
        name: 'Tech House Grid',
        description: 'Aerial view of the dancefloor as a grid of pulsing cells',
        personality: 'The collective energy of dancers moving as one organism',
        visualResponse: {
            bass: 'Scales grid size - deeper bass means wider dancefloor view',
            kick: 'Makes individual cells flash and pulse in unison',
            mid: 'Rotates the entire pattern - melody guides movement',
            high: 'Rounds cell shapes from squares to circles',
            energy: 'Intensifies glow and color saturation across the grid',
            drop: 'Reveals secondary grid layer - the moment of revelation'
        }
    },
    'tech_house_spectrum': {
        name: 'Tech House Spectrum',
        description: 'Living frequency analyzer displaying music as radial patterns',
        personality: 'Pure musical energy made visible through spectrum analysis',
        visualResponse: {
            bass: 'Expands pattern scale - bass frequencies dominate the center',
            kick: 'Creates zoom pulses - the spectrum breathes with the beat',
            mid: 'Drives main pattern reactivity and complexity',
            high: 'Adds fractal detail layers in outer frequency ranges',
            energy: 'Controls color intensity and brightness shifts',
            drop: 'Shifts threshold zones - new frequency regions appear'
        }
    }
};

async function testSingleShader(shaderName, options = {}) {
    const {
        sequences = SHADER_SEQUENCES[shaderName] || ['the-drop'],
        timeout = 300000, // 5 minutes per test
        skipExisting = false
    } = options;

    console.log(`\n🦇🌙 Testing Shader: ${shaderName} 🦇🌙`);
    console.log('━'.repeat(60));
    
    const shaderInfo = SHADER_COMMENTARY[shaderName];
    if (shaderInfo) {
        console.log(`✨ ${shaderInfo.name}`);
        console.log(`💭 ${shaderInfo.description}`);
        console.log(`🎭 ${shaderInfo.personality}\n`);
    }

    const harness = new ShaderTestHarness({
        outputDir: './screenshots'
    });
    
    await harness.init();
    
    const testResults = [];
    
    try {
        for (const sequenceName of sequences) {
            const sequence = musicalSequences[sequenceName];
            if (!sequence) {
                console.error(`❌ Sequence not found: ${sequenceName}`);
                continue;
            }
            
            console.log(`\n🎵 Running: ${sequenceName}`);
            console.log(`   ${sequence.description}`);
            console.log(`   ${sequence.musicalContext}\n`);
            
            try {
                // Create session with longer timeout and 60fps video
                const session = await harness.createSession(shaderName, {
                    recordVideo: true,
                    viewport: { width: 1024, height: 1024 } // Higher resolution
                });
                
                // Map parameters
                const mappedSequence = mapSequenceParameters(sequence);
                
                // Run animation with timeout
                const startTime = Date.now();
                const results = await Promise.race([
                    harness.animateParameters(session, {
                        ...mappedSequence,
                        name: sequenceName
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), timeout)
                    )
                ]);
                
                const duration = Date.now() - startTime;
                
                // Generate detailed commentary
                const commentary = generateDetailedCommentary(
                    shaderName, 
                    sequenceName, 
                    results.timeline,
                    shaderInfo
                );
                
                // Save commentary and timeline
                const commentaryPath = path.join(session.sessionDir, 'commentary.json');
                fs.writeFileSync(commentaryPath, JSON.stringify(commentary, null, 2));
                
                // Log results with emotional insights
                console.log(`   ✅ Complete: ${results.timeline.length} frames (${Math.round(duration/1000)}s)`);
                console.log(`   🎬 Video: ${session.sessionDir}/videos/`);
                console.log(`   💫 Emotional arc: ${commentary.emotionalArc}`);
                console.log(`   🎨 Visual journey: ${commentary.visualJourney}`);
                
                testResults.push({
                    shader: shaderName,
                    sequence: sequenceName,
                    results,
                    commentary,
                    duration
                });
                
            } catch (error) {
                console.error(`   ❌ Error in ${sequenceName}: ${error.message}`);
            }
            
            // Brief pause between sequences
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Generate shader summary
        generateShaderSummary(shaderName, testResults);
        
    } finally {
        await harness.cleanup();
    }
    
    console.log(`\n🦇 ${shaderName} testing complete!\n`);
    return testResults;
}

function mapSequenceParameters(sequence) {
    const parameterMapping = {
        'bass': 'knob_1', 'kick': 'knob_2', 'mid': 'knob_3', 'high': 'knob_4',
        'energy': 'knob_5', 'spectral': 'knob_6', 'tempo': 'knob_7', 'drop': 'knob_8',
        'vocal': 'knob_9', 'sub': 'knob_10'
    };
    
    const mapped = JSON.parse(JSON.stringify(sequence));
    
    if (mapped.keyframes) {
        mapped.keyframes = mapped.keyframes.map(keyframe => {
            const mappedParams = {};
            for (const [key, value] of Object.entries(keyframe.params)) {
                mappedParams[parameterMapping[key] || key] = value;
            }
            return { ...keyframe, params: mappedParams };
        });
    }
    
    return mapped;
}

function generateDetailedCommentary(shaderName, sequenceName, timeline, shaderInfo) {
    const sequence = musicalSequences[sequenceName];
    
    // Analyze the emotional arc
    const energyLevels = timeline.map(frame => frame.params.knob_5 || 0);
    const bassLevels = timeline.map(frame => frame.params.knob_1 || 0);
    
    const maxEnergy = Math.max(...energyLevels);
    const maxBass = Math.max(...bassLevels);
    const dropMoment = timeline.find(frame => frame.params.knob_8 > 0.5);
    
    // Create emotional descriptions for key moments
    const keyMoments = timeline.filter((_, index) => index % 2 === 0).map(frame => {
        const timeInSeconds = frame.time / 1000;
        const energy = frame.params.knob_5 || 0;
        const bass = frame.params.knob_1 || 0;
        
        let mood = 'building';
        if (energy > 0.8) mood = 'euphoric';
        else if (energy > 0.6) mood = 'energetic';
        else if (energy < 0.3) mood = 'contemplative';
        
        return {
            time: timeInSeconds,
            params: frame.params,
            mood,
            description: generateMomentDescription(frame.params, shaderInfo, mood)
        };
    });
    
    return {
        shader: shaderInfo?.name || shaderName,
        sequence: sequenceName,
        sequenceDescription: sequence?.description || '',
        musicalContext: sequence?.musicalContext || '',
        emotionalArc: generateEmotionalArc(energyLevels),
        visualJourney: generateVisualJourney(timeline, shaderInfo),
        keyMoments,
        dropMoment: dropMoment ? {
            time: dropMoment.time / 1000,
            params: dropMoment.params,
            description: 'THE DROP - Maximum energy explosion, all parameters peak'
        } : null,
        parameterAnalysis: analyzeParameters(timeline, shaderInfo),
        technicalNotes: {
            totalFrames: timeline.length,
            maxEnergy,
            maxBass,
            hasDropMoment: !!dropMoment
        }
    };
}

function generateMomentDescription(params, shaderInfo, mood) {
    const bass = params.knob_1 || 0;
    const kick = params.knob_2 || 0;
    const energy = params.knob_5 || 0;
    
    if (mood === 'euphoric') {
        return `Maximum intensity - the ${shaderInfo?.personality || 'form'} explodes with energy`;
    } else if (mood === 'energetic') {
        return `Rising energy - complexity increases as the beat drives forward`;
    } else if (mood === 'contemplative') {
        return `Quiet moment - the form breathes gently, awaiting the next wave`;
    }
    
    return `Energy ${Math.round(energy * 100)}%, Bass ${Math.round(bass * 100)}%`;
}

function generateEmotionalArc(energyLevels) {
    const avg = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length;
    const max = Math.max(...energyLevels);
    const min = Math.min(...energyLevels);
    
    if (max - min < 0.2) return 'Steady groove with subtle variations';
    if (avg < 0.3) return 'Contemplative journey with gentle swells';
    if (avg > 0.7) return 'High-energy assault with moments of euphoria';
    
    return 'Classic tension and release - building to explosive climax';
}

function generateVisualJourney(timeline, shaderInfo) {
    if (!shaderInfo) return 'Parameter evolution creates evolving visual patterns';
    
    const name = shaderInfo.name.toLowerCase();
    if (name.includes('combinator')) {
        return 'Geometric form morphs from simple to complex, twisting with bass';
    } else if (name.includes('pulse')) {
        return 'Rhythmic pulsing intensifies, colors shift from blue to purple';
    } else if (name.includes('grid')) {
        return 'Grid cells dance in unison, secondary patterns emerge at climax';
    } else if (name.includes('spectrum')) {
        return 'Frequency patterns expand and contract, new spectral regions appear';
    }
    
    return 'Visual elements respond dynamically to musical parameters';
}

function analyzeParameters(timeline, shaderInfo) {
    const analysis = {};
    
    // Analyze each parameter's journey
    for (let i = 1; i <= 10; i++) {
        const paramKey = `knob_${i}`;
        const values = timeline.map(frame => frame.params[paramKey] || 0);
        
        if (values.some(v => v > 0)) {
            const audioParam = ['bass', 'kick', 'mid', 'high', 'energy', 'spectral', 'tempo', 'drop', 'vocal', 'sub'][i-1];
            
            analysis[audioParam] = {
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                variance: Math.max(...values) - Math.min(...values),
                visualImpact: shaderInfo?.visualResponse?.[audioParam] || 'Affects visual parameters'
            };
        }
    }
    
    return analysis;
}

function generateShaderSummary(shaderName, testResults) {
    const summary = {
        shader: shaderName,
        timestamp: new Date().toISOString(),
        totalTests: testResults.length,
        totalFrames: testResults.reduce((sum, test) => sum + test.results.timeline.length, 0),
        averageDuration: testResults.reduce((sum, test) => sum + test.duration, 0) / testResults.length,
        sequences: testResults.map(test => ({
            name: test.sequence,
            frames: test.results.timeline.length,
            emotionalArc: test.commentary.emotionalArc,
            visualJourney: test.commentary.visualJourney
        }))
    };
    
    const summaryPath = path.join('./screenshots', `${shaderName}-summary.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`\n📊 Summary saved: ${summaryPath}`);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const shaderName = process.argv[2];
    
    if (!shaderName) {
        console.log(`
🦇 Single Shader Test Runner 🦇

Usage: node test-single-shader.js <shader-name> [options]

Available shaders:
  - futuristic_combinator
  - tech_house_pulse
  - tech_house_grid
  - tech_house_spectrum

Examples:
  node test-single-shader.js futuristic_combinator
  node test-single-shader.js tech_house_pulse
        `);
        process.exit(1);
    }
    
    testSingleShader(shaderName, {
        timeout: 600000 // 10 minutes per sequence
    }).catch(console.error);
}

export { testSingleShader };