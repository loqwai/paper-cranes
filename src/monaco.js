import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/+esm'

function init() {
    //if we have a shader in the query param, return
    if (new URLSearchParams(window.location.search).get('shader')) return
    console.log('no shader in query param')
    const shader = localStorage.getItem('cranes-manual-code') || ''
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
            const suggestions = keywords.map((keyword) => ({
                label: keyword,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: keyword,
                range: null, // Specify the range if needed
            }))

            return { suggestions }
        },
    })

    monaco.languages.register({ id: 'glsl' })
    monaco.languages.setMonarchTokensProvider('glsl', language)
    monaco.languages.setLanguageConfiguration('glsl', conf)
    const editor = monaco.editor.create(document.querySelector('#monaco-editor'), {
        value: shader,
        minimap: { enabled: false },
        language: 'glsl',
        theme: 'vs-dark',
    })

    // on window resize, resize the editor
    window.addEventListener('resize', () => {
        editor.layout()
    })
    window.editor = editor

    document.querySelector('#save').addEventListener('click', () => {
        editor.pushUndoStop()
        window.cranes.shader = editor.getValue()
        localStorage.setItem('cranes-manual-code', editor.getValue())
        editor.pushUndoStop()
    })

    // save on control or command s
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, function () {
        editor.pushUndoStop()
        window.cranes.shader = editor.getValue()
        localStorage.setItem('cranes-manual-code', editor.getValue())
        editor.pushUndoStop()
    })

    document.querySelector('#reset').addEventListener('click', () => {
        localStorage.removeItem('cranes-manual-code')
        window.location.reload()
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Z, function () {
        editor.trigger('mySource', 'undo', null)
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_Z, function () {
        editor.trigger('mySource', 'redo', null)
    })

    document.querySelector('#publish').addEventListener('click', () => {})
}
init()
