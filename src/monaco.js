// import * as monaco from 'monaco-editor'

// require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});
// Set up Monaco's worker path
window.MonacoEnvironment = {
    getWorkerUrl: function(workerId, label) {
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = {
                baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/'
            };
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs/base/worker/workerMain.js');`
        )}`;
    }
}

function init(monaco) {
    //if we have a shader in the query param, return
    // if (new URLSearchParams(window.location.search).get('shader')) return
    console.log('no shader in query param')

    // Create the editor instance
    const editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: '',
        language: 'glsl',
        theme: 'vs-dark',
        minimap: { enabled: true },
        automaticLayout: true,
    });

    // Watch for shader errors
    let errorDecorations = [];
    setInterval(() => {
        monaco.editor.setModelMarkers(editor.getModel(), 'glsl', []);
        const error = window.cranes.error;
        if(!error) return

            let {lineNumber, message} = error
            if(!lineNumber) {
                lineNumber = 0
                message = error
            }
            const markers = [{
                severity: monaco.MarkerSeverity.Error,
                message: message,
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
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
        'PI',
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
        'random',
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
            const snippets = [
                {
                    label: 'define-audio',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    documentation: 'Define an audio feature alias',
                    insertText: '#define ${1:NAME} (${2:audioFeature})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                },
                {
                    label: 'color-mix',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    documentation: 'Mix two colors based on audio',
                    insertText: [
                        'vec3 color1 = vec3(${1:1.0}, ${2:0.0}, ${3:0.0});',
                        'vec3 color2 = vec3(${4:0.0}, ${5:1.0}, ${6:0.0});',
                        'vec3 finalColor = mix(color1, color2, ${7:audioFeature});'
                    ].join('\n'),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                },
                // Add more useful snippets...
            ]

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
                ...snippets
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
            let shader = localStorage.getItem('cranes-manual-code');
            if(searchParams.has('shader')){
                const res = await fetch(`/shaders/${searchParams.get('shader')}.frag`)
                shader = await res.text()
                localStorage.setItem('cranes-manual-code', shader)
                const newUrl = new URL(window.location)
                newUrl.searchParams.delete('shader')
                window.history.pushState({}, '', newUrl)
                window.location.reload()
            }

            if (!shader) {
                const res = await fetch('/shaders/default.frag')
                shader = await res.text()
            }
            editor.pushUndoStop();
            editor.setValue(shader);
            editor.pushUndoStop();
            editor.layout();
        })();

    document.querySelector('#save').addEventListener('click', () => {
        editor.pushUndoStop()
        window.cranes.shader = editor.getValue()
        localStorage.setItem('cranes-manual-code', editor.getValue())
        editor.pushUndoStop()
    })

    // save on control or command s
    editor.addAction({
        id: 'save',
        label: 'Save',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
        run: function() {
            editor.pushUndoStop();
            window.cranes.shader = editor.getValue();
            localStorage.setItem('cranes-manual-code', editor.getValue());
            editor.pushUndoStop();
        }
    });

    document.querySelector('#reset').addEventListener('click', () => {
        localStorage.removeItem('cranes-manual-code');
        window.location.reload();
    });

    // Update the undo/redo commands to work on both Windows and Mac
    editor.addAction({
        id: 'undo-win',
        label: 'Undo (Windows)',
        keybindings: [monaco.KeyMod.WinCtrl | monaco.KeyCode.KEY_Z],
        run: () => editor.trigger('keyboard', 'undo', null)
    });

    editor.addAction({
        id: 'undo-mac',
        label: 'Undo (Mac)',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Z],
        run: () => editor.trigger('keyboard', 'undo', null)
    });

    editor.addAction({
        id: 'redo-win',
        label: 'Redo (Windows)',
        keybindings: [monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KEY_Z],
        run: () => editor.trigger('keyboard', 'redo', null)
    });

    editor.addAction({
        id: 'redo-mac',
        label: 'Redo (Mac)',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_Z],
        run: () => editor.trigger('keyboard', 'redo', null)
    });

    document.querySelector('#publish').addEventListener('click', () => {});

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
            }

            const description = audioFeatureDescriptions[word.word]
            if (description) {
                return {
                    contents: [
                        { value: `**${word.word}**` },
                        { value: description },
                        { value: `Available variables: \n- ${word.word}Normalized (0-1)\n- ${word.word}Mean\n- ${word.word}Median\n- ${word.word}StandardDeviation\n- ${word.word}ZScore\n- ${word.word}Min\n- ${word.word}Max` }
                    ]
                }
            }
        }
    })
}

// Wait for Monaco to be loaded from CDN
window.addEventListener('load', () => {
    if (window.monaco) {
        init(window.monaco);
    }
});
