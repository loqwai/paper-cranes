async function init() {
    //if we have a shader in the query param, return
    // if (new URLSearchParams(window.location.search).get('shader')) return

    // add the worker as a blob url

    const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/base/worker/workerMain.js')
    const blob = await res.blob()
    const workerUrl = URL.createObjectURL(blob)
    // Create the editor instance
    const editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: '',
        language: 'glsl',
        theme: 'vs-dark',
        minimap: { enabled: false },
        automaticLayout: true,
    });
    // add the web workers
    self.MonacoEnvironment = {
        getWorkerUrl: () => workerUrl
        }

    // Watch for shader errors
    setInterval(() => {
        monaco.editor.setModelMarkers(editor.getModel(), 'glsl', []);
        const error = window.cranes?.error;
        if (!error) return;
        const markers = [{
            severity: monaco.MarkerSeverity.Error,
            message: error.message ?? 'Unknown error',
            startLineNumber: error.lineNumber ?? 1,
            startColumn: 1,
            endLineNumber: error.lineNumber ?? 1,
            endColumn: 1000
        }];
        monaco.editor.setModelMarkers(editor.getModel(), 'glsl', markers);
    }, 100);

    const conf = {
        comments: {
            lineComment: '//',
            blockComment: ['/*', '*/'],
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
        autoClosingPairs: [
            { open: '[', close: ']' },
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: "'", close: "'", notIn: ['string', 'comment'] },
            { open: '"', close: '"', notIn: ['string'] },
            { open: '/*', close: ' */', notIn: ['string'] },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
        ],
    }

    const keywords = [
        'getLastFrameColor',
        'getInitialFrameColor',
        'mapValue',
        'resolution',
        'time',
        'spectralCentroid',
        'energy',
        'spectralRolloff',
        'spectralRolloffNormalized',
        'spectralRolloffMean',
        'spectralRolloffStandardDeviation',
        'spectralRolloffMedian',
        'spectralRolloffZScore',
        'spectralRolloffMin',
        'spectralRolloffMax',
        'spectralCentroid',
        'spectralCentroidNormalized',
        'spectralCentroidMean',
        'spectralCentroidStandardDeviation',
        'spectralCentroidMedian',
        'spectralCentroidZScore',
        'spectralCentroidMin',
        'spectralCentroidMax',
        'spectralEntropy',
        'spectralEntropyNormalized',
        'spectralEntropyMean',
        'spectralEntropyStandardDeviation',
        'spectralEntropyMedian',
        'spectralEntropyZScore',
        'spectralEntropyMin',
        'spectralEntropyMax',
        'spectralSpread',
        'spectralSpreadNormalized',
        'spectralSpreadMean',
        'spectralSpreadStandardDeviation',
        'spectralSpreadMedian',
        'spectralSpreadZScore',
        'spectralSpreadMin',
        'spectralSpreadMax',
        'spectralRoughness',
        'spectralRoughnessNormalized',
        'spectralRoughnessMean',
        'spectralRoughnessStandardDeviation',
        'spectralRoughnessMedian',
        'spectralRoughnessZScore',
        'spectralRoughnessMin',
        'spectralRoughnessMax',
        'spectralKurtosis',
        'spectralKurtosisNormalized',
        'spectralKurtosisMean',
        'spectralKurtosisStandardDeviation',
        'spectralKurtosisMedian',
        'spectralKurtosisZScore',
        'spectralKurtosisMin',
        'spectralKurtosisMax',
        'spectralCrest',
        'spectralCrestNormalized',
        'spectralCrestMean',
        'spectralCrestStandardDeviation',
        'spectralCrestMedian',
        'spectralCrestZScore',
        'spectralCrestMin',
        'spectralCrestMax',
        'spectralSkew',
        'spectralSkewNormalized',
        'spectralSkewMean',
        'spectralSkewStandardDeviation',
        'spectralSkewMedian',
        'spectralSkewZScore',
        'spectralSkewMin',
        'spectralSkewMax',
        'pitchClass',
        'pitchClassNormalized',
        'pitchClassMean',
        'pitchClassStandardDeviation',
        'pitchClassMedian',
        'pitchClassZScore',
        'pitchClassMin',
        'pitchClassMax',
        'hslmix',
        'hsl2rgb',
        'rgb2hsl',
        'map',
        'centerUv',
        'animateSmooth',
        'animateBounce',
        'animatePulse',
        'animateEaseInQuad',
        'animateEaseOutQuad',
        'animateEaseInOutQuad',
        'animateEaseInCubic',
        'animateEaseOutCubic',
        'animateEaseInOutCubic',
        'animateEaseInExpo',
        'animateEaseOutExpo',
        'animateEaseInOutExpo',
        'animateEaseInSine',
        'animateEaseOutSine',
        'animateEaseInOutSine',
        'animateEaseInElastic',
        'animateEaseOutElastic',
        'animateEaseInOutElastic',
        'animateSmoothBounce',
        'random',
        'staticRandom',

        'energy',
        'energyNormalized',
        'energyMean',
        'energyStandardDeviation',
        'energyMedian',
        'energyZScore',
        'energyMin',
        'energyMax',

        'bass',
        'bassNormalized',
        'bassMean',
        'bassStandardDeviation',
        'bassMedian',
        'bassZScore',
        'bassMin',
        'bassMax',

        'mids',
        'midsNormalized',
        'midsMean',
        'midsStandardDeviation',
        'midsMedian',
        'midsZScore',
        'midsMin',
        'midsMax',

        'treble',
        'trebleNormalized',
        'trebleMean',
        'trebleStandardDeviation',
        'trebleMedian',
        'trebleZScore',
        'trebleMin',
        'trebleMax',

        'spectralFlux',
        'spectralFluxNormalized',
        'spectralFluxMean',
        'spectralFluxStandardDeviation',
        'spectralFluxMedian',
        'spectralFluxZScore',
        'spectralFluxMin',
        'spectralFluxMax',
        'const',
        'uniform',
        'break',
        'continue',
        'do',
        'for',
        'while',
        'if',
        'else',
        'switch',
        'case',
        'in',
        'out',
        'inout',
        'true',
        'false',
        'invariant',
        'discard',
        'return',
        'sampler2D',
        'samplerCube',
        'sampler3D',
        'struct',
        'radians',
        'degrees',
        'sin',
        'cos',
        'tan',
        'asin',
        'acos',
        'atan',
        'pow',
        'sinh',
        'cosh',
        'tanh',
        'asinh',
        'acosh',
        'atanh',
        'exp',
        'log',
        'exp2',
        'log2',
        'sqrt',
        'inversesqrt',
        'abs',
        'sign',
        'floor',
        'ceil',
        'round',
        'roundEven',
        'trunc',
        'fract',
        'mod',
        'modf',
        'min',
        'max',
        'clamp',
        'mix',
        'step',
        'smoothstep',
        'length',
        'distance',
        'dot',
        'cross ',
        'determinant',
        'inverse',
        'normalize',
        'faceforward',
        'reflect',
        'refract',
        'matrixCompMult',
        'outerProduct',
        'transpose',
        'lessThan ',
        'lessThanEqual',
        'greaterThan',
        'greaterThanEqual',
        'equal',
        'notEqual',
        'any',
        'all',
        'not',
        'packUnorm2x16',
        'unpackUnorm2x16',
        'packSnorm2x16',
        'unpackSnorm2x16',
        'packHalf2x16',
        'unpackHalf2x16',
        'dFdx',
        'dFdy',
        'fwidth',
        'textureSize',
        'texture',
        'textureProj',
        'textureLod',
        'textureGrad',
        'texelFetch',
        'texelFetchOffset',
        'textureProjLod',
        'textureLodOffset',
        'textureGradOffset',
        'textureProjLodOffset',
        'textureProjGrad',
        'intBitsToFloat',
        'uintBitsToFloat',
        'floatBitsToInt',
        'floatBitsToUint',
        'isnan',
        'isinf',
        'vec2',
        'vec3',
        'vec4',
        'ivec2',
        'ivec3',
        'ivec4',
        'uvec2',
        'uvec3',
        'uvec4',
        'bvec2',
        'bvec3',
        'bvec4',
        'mat2',
        'mat3',
        'mat2x2',
        'mat2x3',
        'mat2x4',
        'mat3x2',
        'mat3x3',
        'mat3x4',
        'mat4x2',
        'mat4x3',
        'mat4x4',
        'mat4',
        'float',
        'int',
        'uint',
        'void',
        'bool',
    ]

    const language = {
        tokenPostfix: '.glsl',
        // Set defaultToken to invalid to see what you do not tokenize yet
        defaultToken: 'invalid',
        keywords,
        operators: [
            '=',
            '>',
            '<',
            '!',
            '~',
            '?',
            ':',
            '==',
            '<=',
            '>=',
            '!=',
            '&&',
            '||',
            '++',
            '--',
            '+',
            '-',
            '*',
            '/',
            '&',
            '|',
            '^',
            '%',
            '<<',
            '>>',
            '>>>',
            '+=',
            '-=',
            '*=',
            '/=',
            '&=',
            '|=',
            '^=',
            '%=',
            '<<=',
            '>>=',
            '>>>=',
        ],
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        integersuffix: /([uU](ll|LL|l|L)|(ll|LL|l|L)?[uU]?)/,
        floatsuffix: /[fFlL]?/,
        encoding: /u|u8|U|L/,

        tokenizer: {
            root: [
                // Add knob uniform highlighting before other identifiers
                [/knob_[0-9]+/, 'variable.parameter.knob'],

                // identifiers and keywords
                [
                    /[a-zA-Z_]\w*/,
                    {
                        cases: {
                            '@keywords': { token: 'keyword.$0' },
                            '@default': 'identifier',
                        },
                    },
                ],

                // Preprocessor directive (#define)
                [/^\s*#\s*\w+/, 'keyword.directive'],

                // whitespace
                { include: '@whitespace' },

                // delimiters and operators
                [/[{}()\[\]]/, '@brackets'],
                [
                    /@symbols/,
                    {
                        cases: {
                            '@operators': 'operator',
                            '@default': '',
                        },
                    },
                ],

                // numbers
                [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, 'number.float'],
                [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, 'number.float'],
                [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, 'number.hex'],
                [/0[0-7']*[0-7](@integersuffix)/, 'number.octal'],
                [/0[bB][0-1']*[0-1](@integersuffix)/, 'number.binary'],
                [/\d[\d']*\d(@integersuffix)/, 'number'],
                [/\d(@integersuffix)/, 'number'],

                // delimiter: after number because of .\d floats
                [/[;,.]/, 'delimiter'],
            ],

            comment: [
                [/[^\/*]+/, 'comment'],
                [/\/\*/, 'comment', '@push'],
                ['\\*/', 'comment', '@pop'],
                [/[\/*]/, 'comment'],
            ],

            // Does it have strings?
            string: [
                [/[^\\"]+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [
                    /"/,
                    {
                        token: 'string.quote',
                        bracket: '@close',
                        next: '@pop',
                    },
                ],
            ],

            whitespace: [
                [/[ \t\r\n]+/, 'white'],
                [/\/\*/, 'comment', '@comment'],
                [/\/\/.*$/, 'comment'],
            ],
        },
    }

    // Register a completion item provider for GLSL
    monaco.languages.registerCompletionItemProvider('glsl', {
        provideCompletionItems: () => {
            const suggestions = [
                // Add knob suggestions
                ...Array.from({ length: 200 }, (_, i) => i + 1).map(num => ({
                    label: `knob_${num}`,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    detail: `uniform float knob_${num}`,
                    documentation: {
                        value: `A tunable parameter that can be adjusted in real-time. \n Usually between 0.0 and 1.0, unless specified otherwise by the knob_<number>.min and knob_<number>.max query params.`,
                        isTrusted: true
                    },
                    insertText: `knob_${num}`,
                    sortText: `0knob${num.toString().padStart(3, '0')}` // Ensures knobs appear early and in order
                })),
                // Existing keyword suggestions
                ...keywords.map((keyword) => ({
                    label: keyword,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: keyword,
                    range: null
                })),
            ]

            return { suggestions }
        },
        triggerCharacters: ['k'] // Trigger suggestions when typing "k" or "_"
    })

    monaco.languages.register({ id: 'glsl' })
    monaco.languages.setMonarchTokensProvider('glsl', language)
    monaco.languages.setLanguageConfiguration('glsl', conf)
    // on window resize, resize the editor
    window.addEventListener('resize', () => {
        editor.layout()
    })

    // Initialize editor content
    const searchParams = new URLSearchParams(window.location.search);
    (async () => {
        // Normal initialization - only runs if no shader param or fetch failed
        let shader = localStorage.getItem('cranes-manual-code')
        if (!shader) {
            const res = await fetch('/shaders/default.frag')
            shader = await res.text()
        }
        editor.pushUndoStop()
        editor.setValue(shader)
        editor.pushUndoStop()
        editor.layout()
    })()

    const save = () => {
        editor.pushUndoStop()
        const code = editor.getValue()

        // Use paramsManager if available (edit page with unified params)
        // This handles: window.cranes.shader, localStorage, and remote sync
        if (window.paramsManager) {
            window.paramsManager.setShader(code)
        } else {
            // Fallback for non-edit pages
            window.cranes.shader = code
            localStorage.setItem('cranes-manual-code', code)
        }
        editor.pushUndoStop()
    }

    document.querySelector('#save').addEventListener('click', save)

    // Add keyboard event listeners
    document.addEventListener('keydown', (e) => {
        if(!(e.metaKey || e.ctrlKey)) return;
        switch(e.key) {
            case 's':
                e.preventDefault()
                save()
                return;
            case 'z':
                e.preventDefault()
                if (e.shiftKey) {
                    editor.trigger('keyboard', 'redo', null)
                } else {
                    editor.trigger('keyboard', 'undo', null)
                }
                return;
            case 'y':
                if (!e.shiftKey) { // Only handle Ctrl+Y (Windows style redo)
                    e.preventDefault()
                    editor.trigger('keyboard', 'redo', null)
                }
                return;
        }
    })

    document.querySelector('#reset').addEventListener('click', () => {
        localStorage.removeItem('cranes-manual-code');
        window.location.reload();
    });

    const getFilename = (shaderCode) => {
        const filename = new URLSearchParams(window.location.search).get('filename') || 'my-new-shader.frag'
        return filename.replaceAll('.frag', '') + '.frag' // I can't see how this will ever go wrong.
    }

    const getUsername = (shaderCode) => {
        return new URLSearchParams(window.location.search).get('username') || ''
    }

    const getRepoName = (shaderCode) => {
        return new URLSearchParams(window.location.search).get('repo') || 'loqwai/paper-cranes'
    }

    const getShaderWithInstructions = (shaderCode) => {
        // Only add instructions for new files, not updates
        const isUpdate = new URLSearchParams(window.location.search).get('updateExisting') === 'true'
        if (isUpdate || shaderCode.includes('"shaders/<YOUR_GITHUB_USERNAME>" folder')) return shaderCode

        let code = "// MAKE SURE TO NAME PUT YOUR SHADER IN \"shaders/<YOUR_GITHUB_USERNAME>\"\n"
        code += "// and make sure the filename ends in .frag\n"
        code += "// for example, if your username is \"hypnodroid\", and you want to publish \"my-shader.frag\", the filename should be \"hypnodroid/my-shader.frag\"\n"
        code += shaderCode
        return code
    }

    document.querySelector('#publish').addEventListener('click', () => {
        const shaderCode = getShaderWithInstructions(editor.getValue())
        const filename = getFilename(shaderCode)
        const repoName = getRepoName(shaderCode)
        const username = getUsername(shaderCode)
        const isUpdate = new URLSearchParams(window.location.search).get('updateExisting') === 'true'
        // if this is an update:
        // 1. copy the code into the clipboard
        // 2. redirect to the edit url.
        if (isUpdate) {
            navigator.clipboard.writeText(shaderCode)
            const editUrl = `https://github.com/${repoName}/edit/main/shaders/${filename}`
            return window.open(editUrl, '_blank')
        }
        const baseUrl = new URL(`https://github.com/${repoName}/new/main/shaders/${username}`)
        //if (isUpdate) baseUrl = new URL(`https://github.com/${repoName}/edit/main/shaders/${filename}`)
        baseUrl.searchParams.set('filename', filename)
        baseUrl.searchParams.set('value', shaderCode)
        window.open(baseUrl, '_blank')
    })

    // Add hover provider for audio uniforms
    monaco.languages.registerHoverProvider('glsl', {
        provideHover: (model, position) => {
            const word = model.getWordAtPosition(position)
            if (!word) return null

            const audioFeatureDescriptions = {
                spectralCentroid: 'Represents the "center of mass" of the spectrum. Higher values indicate more high-frequency content. Good for detecting brightness/timbre changes.',
                spectralFlux: 'Measures how quickly the power spectrum changes. Useful for detecting sudden changes in the music, like note onsets or style changes.',
                energy: 'Overall audio energy/volume of the signal. Good for general amplitude-based reactions.',
                bass: 'Low frequency energy content. Great for kick drums and bass-driven effects.',
                mids: 'Mid frequency energy content. Good for vocals and melodic instruments.',
                treble: 'High frequency energy content. Useful for cymbals and high-hat driven effects.',
                beat: 'True when a beat is detected. Perfect for synchronizing visual changes with the rhythm. When it works. But it usually doesn\'t.',
                pitchClass: 'The pitch class of the dominant frequency. Can be used to create color schemes based on musical key. Each note is assigned a fraction between 0 and 1.',
                spectralSpread: 'The width/spread of the frequency spectrum. High values indicate noise-like sounds, low values for pure tones.',
                spectralRolloff: 'Frequency below which 85% of the spectrum\'s energy is concentrated. Good for detecting brightness changes.',
                spectralRoughness: 'Estimates the sensory dissonance. Higher values indicate more "rough" or dissonant sounds.',
                spectralKurtosis: 'Measures "peakedness" of the spectrum. High values indicate isolated frequency peaks.',
                spectralEntropy: 'Measures the complexity/unpredictability of the spectrum. Higher values for noise, lower for pure tones.',
                spectralCrest: 'Ratio between the spectrum\'s peak and mean. Distinguishes between noisy (low) and tonal (high) sounds.',
                spectralSkew: 'Measures the asymmetry of the spectrum. Useful for detecting unusual frequency distributions.',
                getInitialFrameColor: 'Returns the color at the given UV coordinates from the initial frame. Useful for creating effects that reference the starting state of the visualization.',
                centerUv: 'Centers UV coordinates around (0.5, 0.5) and scales them to (-1, 1). Takes optional resolution parameter. Useful for creating centered effects.',
                animateSmooth: 'Simple smooth animation that accelerates and decelerates naturally. Good for basic transitions.',
                animateBounce: 'Creates a bouncing effect that decreases in amplitude over time. Good for playful animations.',
                animatePulse: 'Creates a smooth pulsing effect that oscillates between 0 and 1. Good for breathing or heartbeat effects.',
                animateEaseInQuad: 'Quadratic easing that starts slow and accelerates. Good for natural-feeling animations.',
                animateEaseOutQuad: 'Quadratic easing that starts fast and decelerates. Good for natural-feeling animations.',
                animateEaseInOutQuad: 'Quadratic easing that starts slow, accelerates in the middle, and decelerates at the end.',
                animateEaseInCubic: 'Cubic easing that starts slow and accelerates. More pronounced than quadratic.',
                animateEaseOutCubic: 'Cubic easing that starts fast and decelerates. More pronounced than quadratic.',
                animateEaseInOutCubic: 'Cubic easing that starts slow, accelerates in the middle, and decelerates at the end.',
                animateEaseInExpo: 'Exponential easing that starts very slow and accelerates dramatically.',
                animateEaseOutExpo: 'Exponential easing that starts very fast and decelerates dramatically.',
                animateEaseInOutExpo: 'Exponential easing that starts very slow, accelerates dramatically in the middle, and decelerates dramatically at the end.',
                animateEaseInSine: 'Sinusoidal easing that starts slow and accelerates. Creates a smooth, natural motion.',
                animateEaseOutSine: 'Sinusoidal easing that starts fast and decelerates. Creates a smooth, natural motion.',
                animateEaseInOutSine: 'Sinusoidal easing that starts slow, accelerates in the middle, and decelerates at the end.',
                animateEaseInElastic: 'Elastic easing that creates a bouncy effect with overshoot at the start.',
                animateEaseOutElastic: 'Elastic easing that creates a bouncy effect with overshoot at the end.',
                animateEaseInOutElastic: 'Elastic easing that creates a bouncy effect with overshoot at both start and end.',
                animateSmoothBounce: 'Creates a smoother bouncing effect that decreases in amplitude over time.',
            }

            const description = audioFeatureDescriptions[word.word]
            if (description) {
                return {
                    contents: [
                        { value: `**${word.word}**` },
                        { value: description },
                        { value: word.word.startsWith('animate') ? '```glsl\nfloat ' + word.word + '(float t)\n```\nParameters:\n- t: Time value (usually between 0 and 1)\nReturns: Animated value between 0 and 1' : '' },
                        { value: word.word.startsWith('animate') ? '\nExample usage:\n```glsl\nfloat t = time * 0.5; // Time-based animation\nvec3 color = mix(color1, color2, animateEaseOutCubic(t));\nfloat scale = 1.0 + 0.2 * animateBounce(t);\nfloat opacity = animateSmooth(t);\n```' : '' },
                        { value: !word.word.startsWith('animate') ? `Available variables: \n- ${word.word}Normalized (0-1)\n- ${word.word}Mean\n- ${word.word}Median\n- ${word.word}StandardDeviation\n- ${word.word}ZScore\n- ${word.word}Min\n- ${word.word}Max` : '' }
                    ]
                }
            }
        }
    })
}

// Wait for Monaco to be loaded from CDN
window.addEventListener('load', () => init());
