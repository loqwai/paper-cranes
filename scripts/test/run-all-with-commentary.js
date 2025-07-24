#!/usr/bin/env node
import { ShaderTestHarness } from './shader-test-harness.js';
import { musicalSequences } from './musical-sequences.js';
import fs from 'fs';
import path from 'path';

/**
 * Comprehensive test runner with emotional and technical commentary
 * This explains WHY we animate parameters the way we do
 */

// Shader-specific emotional mappings and commentary
const SHADER_COMMENTARY = {
    'futuristic_combinator': {
        name: 'Futuristic Combinator',
        personality: 'A geometric entity from the future, pulsing with digital life',
        audioMappings: {
            bass: 'Controls the entity\'s size - bass makes it breathe and expand like a digital heart',
            kick: 'Each kick is a shock to the system, making the form pulse and contract',
            mid: 'Melodic content controls the domain repetition - more melody = more complexity',
            high: 'High frequencies sharpen the edges, making it crystalline vs smooth',
            energy: 'Overall energy adds fractal complexity - calm is simple, excited is intricate',
            spectral: 'Brightness of the music maps to color temperature - dark bass vs bright leads',
            drop: 'The drop moment shifts the entire color palette to signal the climax'
        },
        sequenceCommentary: {
            'the-drop': {
                emotional: 'Building tension through growing complexity, then explosive release',
                visual: 'The form starts small and simple, growing more intricate until the drop shatters it into maximum complexity',
                moments: {
                    '0-5s': 'Anticipation - the entity stirs, sensing something coming',
                    '5s': 'THE DROP - explosion of complexity, size, and color shift',
                    '5-15s': 'Sustained ecstasy - maximum visual intensity maintained',
                    '15-30s': 'Gradual comedown - complexity reduces but energy remains'
                }
            },
            'vampire-waltz': {
                emotional: 'Elegant melancholy in 3/4 time - a gothic dance of geometry',
                visual: 'The form sways and twists to the waltz rhythm, purple hues dominate',
                moments: {
                    '0-10s': 'First steps of the dance - establishing the triple meter',
                    '10-20s': 'The dance intensifies - more twist and color variation',
                    '20-30s': 'Dawn approaches - the form begins to fade'
                }
            }
        }
    },
    
    'tech_house_pulse': {
        name: 'Tech House Pulse',
        personality: 'A hypnotic rhythm machine, locked to the 4/4 grid of the dancefloor',
        audioMappings: {
            bass: 'Bass controls the twist factor - deeper bass = more spiral hypnosis',
            kick: 'Kick drums drive the pulse intensity - visual representation of the beat',
            mid: 'Synth lines control shape morphing between sphere and cube',
            high: 'Hi-hats create sharp edges and rim lighting effects',
            energy: 'Total energy saturates the colors - from muted to vibrant',
            spectral: 'Tonal brightness morphs between base shapes',
            drop: 'Drop moments shift the entire palette from blue to purple'
        },
        sequenceCommentary: {
            'the-drop': {
                emotional: 'Classic tech house tension and release - the crowd goes wild',
                visual: 'Blue geometry builds tension, explodes into purple/gold at the drop',
                moments: {
                    '0-5s': 'The groove establishes - steady pulse, muted colors',
                    '5s': 'DROP - purple floods in, gold accents appear, maximum pulse',
                    '5-20s': 'Peak time energy - the dancefloor is alive',
                    '20-30s': 'Breakdown section - preparing for the next build'
                }
            },
            'techno-hammer': {
                emotional: 'Relentless industrial rhythm - no mercy, pure machine groove',
                visual: 'Constant pulsing with evolving noise and distortion',
                moments: {
                    '0-10s': 'The machine starts - establishing relentless rhythm',
                    '10-20s': 'Acid lines sweep through - parameter automation',
                    '20-30s': 'Industrial climax - maximum distortion and energy'
                }
            }
        }
    },
    
    'tech_house_grid': {
        name: 'Tech House Grid',
        personality: 'The dancefloor from above - a grid of moving bodies and lights',
        audioMappings: {
            bass: 'Bass scales the entire grid - bigger bass = wider view',
            kick: 'Kicks make individual cells pulse and flash',
            mid: 'Melody rotates the pattern - adding movement',
            high: 'Hi-hats round the cells from squares to circles',
            energy: 'Energy intensifies the glow and color saturation',
            drop: 'Drop reveals a secondary grid layer - double vision',
            spectral: 'Brightness controls phase spread between cells'
        },
        sequenceCommentary: {
            'the-drop': {
                emotional: 'The dancefloor viewed from above during peak moment',
                visual: 'Grid cells build energy, then explode with secondary patterns at drop',
                moments: {
                    '0-5s': 'Empty dancefloor fills with energy - cells begin pulsing',
                    '5s': 'DROP - secondary grid appears, maximum pulse and glow',
                    '5-20s': 'Full dancefloor energy - complex overlapping patterns',
                    '20-30s': 'Last dance - patterns simplify as night ends'
                }
            },
            'melodic-journey': {
                emotional: 'Following a single dancer through the grid',
                visual: 'Melody creates rotating patterns that follow through the grid',
                moments: {
                    '0-10s': 'Finding the rhythm - simple grid pulses',
                    '10-20s': 'Melodic peak - maximum rotation and color',
                    '20-30s': 'Journey ends - returning to simplicity'
                }
            }
        }
    },
    
    'tech_house_spectrum': {
        name: 'Tech House Spectrum',
        personality: 'A living frequency analyzer - the music made visible',
        audioMappings: {
            bass: 'Bass frequencies expand the pattern scale',
            kick: 'Kicks create zoom pulses - the spectrum breathes',
            mid: 'Mid frequencies drive the main reactivity',
            high: 'Highs add fractal detail layers',
            energy: 'Total energy brightens and shifts colors',
            spectral: 'Brightness controls rotation speed',
            drop: 'Drop shifts threshold zones - new color regions appear'
        },
        sequenceCommentary: {
            'the-drop': {
                emotional: 'Watching the frequency spectrum explode at the drop',
                visual: 'Blue spectrum builds, then purple and gold flood in at climax',
                moments: {
                    '0-5s': 'Spectrum awakens - frequencies begin to separate',
                    '5s': 'DROP - all frequency bands explode, gold highlights appear',
                    '5-20s': 'Full spectrum dance - all frequencies active',
                    '20-30s': 'Frequency fade - returning to baseline'
                }
            },
            'drum-and-bass-rush': {
                emotional: 'Frenetic 174 BPM energy - the spectrum goes wild',
                visual: 'Rapid spectrum changes, high frequency dominance',
                moments: {
                    '0-10s': 'Breaks kick in - spectrum begins jumping',
                    '10-20s': 'Full DnB energy - maximum frequency chaos',
                    '20-30s': 'Breakdown - preparing for next drop'
                }
            }
        }
    }
};

// Generate detailed commentary for each test
function generateTestCommentary(shader, sequence, timeline) {
    const shaderInfo = SHADER_COMMENTARY[shader];
    const sequenceInfo = shaderInfo.sequenceCommentary[sequence];
    
    if (!sequenceInfo) {
        return {
            overview: `Testing ${shader} with ${sequence}`,
            emotional: 'Exploring parameter space',
            visual: 'Observing visual responses to parameter changes'
        };
    }
    
    // Add detailed timeline commentary
    const timelineWithCommentary = timeline.map((entry, index) => {
        const timeInSeconds = entry.time / 1000;
        let momentCommentary = '';
        
        // Find relevant moment commentary
        for (const [timeRange, comment] of Object.entries(sequenceInfo.moments || {})) {
            const [start, end] = timeRange.split('-').map(t => parseFloat(t));
            if (timeInSeconds >= start && (!end || timeInSeconds <= end)) {
                momentCommentary = comment;
                break;
            } else if (timeRange === `${Math.floor(timeInSeconds)}s`) {
                momentCommentary = comment;
                break;
            }
        }
        
        // Add parameter-specific commentary
        const paramCommentary = {};
        for (const [param, value] of Object.entries(entry.params)) {
            const audioParam = getAudioParamName(param);
            if (audioParam && shaderInfo.audioMappings[audioParam]) {
                paramCommentary[param] = {
                    value,
                    audioParam,
                    meaning: shaderInfo.audioMappings[audioParam],
                    intensity: getIntensityDescription(value)
                };
            }
        }
        
        return {
            ...entry,
            momentCommentary,
            paramCommentary,
            emotionalState: getEmotionalState(entry.params, sequenceInfo.emotional)
        };
    });
    
    return {
        shader: shaderInfo.name,
        personality: shaderInfo.personality,
        sequence,
        emotional: sequenceInfo.emotional,
        visual: sequenceInfo.visual,
        audioMappings: shaderInfo.audioMappings,
        moments: sequenceInfo.moments,
        timeline: timelineWithCommentary
    };
}

// Map knob names back to audio parameter names
function getAudioParamName(knobName) {
    const mapping = {
        'knob_1': 'bass',
        'knob_2': 'kick',
        'knob_3': 'mid',
        'knob_4': 'high',
        'knob_5': 'energy',
        'knob_6': 'spectral',
        'knob_7': 'tempo',
        'knob_8': 'drop',
        'knob_9': 'vocal',
        'knob_10': 'sub'
    };
    return mapping[knobName] || knobName;
}

// Describe parameter intensity
function getIntensityDescription(value) {
    if (value === 0) return 'silent';
    if (value < 0.2) return 'minimal';
    if (value < 0.4) return 'subtle';
    if (value < 0.6) return 'moderate';
    if (value < 0.8) return 'strong';
    if (value < 1.0) return 'intense';
    return 'maximum';
}

// Determine emotional state from parameters
function getEmotionalState(params, baseEmotion) {
    const energy = params.knob_5 || 0;
    const bass = params.knob_1 || 0;
    const high = params.knob_4 || 0;
    
    if (energy > 0.8 && bass > 0.7) return 'euphoric';
    if (energy > 0.6) return 'energetic';
    if (energy < 0.3 && high < 0.3) return 'contemplative';
    if (bass > 0.7 && high < 0.3) return 'deep and heavy';
    if (bass < 0.3 && high > 0.7) return 'ethereal';
    
    return baseEmotion || 'evolving';
}

// Main test runner
async function runAllTests() {
    console.log('\n🦇🌙 Starting Comprehensive Shader Tests with Commentary 🦇🌙\n');
    
    const harness = new ShaderTestHarness({
        outputDir: '../../screenshots'
    });
    
    await harness.init();
    
    // Test matrix
    const testMatrix = [
        { shader: 'futuristic_combinator', sequences: ['the-drop', 'vampire-waltz'] },
        { shader: 'tech_house_pulse', sequences: ['the-drop', 'techno-hammer'] },
        { shader: 'tech_house_grid', sequences: ['the-drop', 'melodic-journey'] },
        { shader: 'tech_house_spectrum', sequences: ['the-drop', 'drum-and-bass-rush'] }
    ];
    
    const allCommentary = [];
    
    try {
        for (const test of testMatrix) {
            console.log(`\n🎨 Testing ${test.shader}`);
            console.log('━'.repeat(60));
            
            for (const sequenceName of test.sequences) {
                const sequence = musicalSequences[sequenceName];
                if (!sequence) continue;
                
                console.log(`\n🎵 Sequence: ${sequenceName}`);
                console.log(`   ${sequence.description}`);
                
                // Get shader commentary
                const shaderInfo = SHADER_COMMENTARY[test.shader];
                console.log(`   Personality: ${shaderInfo.personality}`);
                
                try {
                    // Create session
                    const session = await harness.createSession(test.shader, {
                        recordVideo: true,
                        viewport: { width: 800, height: 800 }
                    });
                    
                    // Map parameters
                    const mappedSequence = mapSequenceParameters(sequence);
                    
                    // Run animation
                    const results = await harness.animateParameters(session, {
                        ...mappedSequence,
                        name: sequenceName
                    });
                    
                    // Generate commentary
                    const commentary = generateTestCommentary(
                        test.shader,
                        sequenceName,
                        results.timeline
                    );
                    
                    // Save commentary alongside test results
                    const commentaryPath = path.join(
                        session.sessionDir,
                        'commentary.json'
                    );
                    fs.writeFileSync(
                        commentaryPath,
                        JSON.stringify(commentary, null, 2)
                    );
                    
                    allCommentary.push(commentary);
                    
                    // Log some insights
                    console.log(`   ✅ Captured ${results.timeline.length} frames`);
                    console.log(`   💭 Emotional journey: ${commentary.emotional}`);
                    console.log(`   👁️  Visual response: ${commentary.visual}`);
                    
                } catch (error) {
                    console.error(`   ❌ Error: ${error.message}`);
                }
                
                // Brief pause between tests
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Save master commentary file
        const masterCommentaryPath = path.join('../../screenshots', 'master-commentary.json');
        fs.writeFileSync(
            masterCommentaryPath,
            JSON.stringify({
                timestamp: new Date().toISOString(),
                description: 'Comprehensive emotional and technical commentary for shader tests',
                tests: allCommentary
            }, null, 2)
        );
        
        console.log('\n📚 Master commentary saved to:', masterCommentaryPath);
        
    } finally {
        await harness.cleanup();
    }
    
    console.log('\n🦇 All tests complete with full commentary!\n');
}

// Parameter mapping helper
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
    
    const mapped = JSON.parse(JSON.stringify(sequence));
    
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

// Run the tests
runAllTests().catch(console.error);