import * as vscode from "vscode"

console.log("🏮 Paper Cranes Extension Exists 🏮")

export function activate(context: vscode.ExtensionContext) {
    console.log("🏮 Paper Cranes Extension Activated 🏮")

    // Register completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { scheme: "file", language: "paper-cranes-fragment-shader" },
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                // GLSL Keywords
                const glslKeywords = [
                    "const",
                    "uniform",
                    "break",
                    "continue",
                    "do",
                    "for",
                    "while",
                    "if",
                    "else",
                    "switch",
                    "case",
                    "in",
                    "out",
                    "inout",
                    "true",
                    "false",
                    "invariant",
                    "discard",
                    "return",
                    "void",
                    "bool",
                    "int",
                    "float",
                    "vec2",
                    "vec3",
                    "vec4",
                    "mat2",
                    "mat3",
                    "mat4",
                    "sampler2D",
                    "struct"
                ]

                // GLSL Built-in Functions
                const glslFunctions = [
                    "radians",
                    "degrees",
                    "sin",
                    "cos",
                    "tan",
                    "asin",
                    "acos",
                    "atan",
                    "pow",
                    "exp",
                    "log",
                    "exp2",
                    "log2",
                    "sqrt",
                    "inversesqrt",
                    "abs",
                    "sign",
                    "floor",
                    "ceil",
                    "fract",
                    "mod",
                    "min",
                    "max",
                    "clamp",
                    "mix",
                    "step",
                    "smoothstep",
                    "length",
                    "distance",
                    "dot",
                    "cross",
                    "normalize",
                    "reflect",
                    "refract",
                    "texture2D",
                    "dFdx",
                    "dFdy"
                ]

                // Paper Cranes Audio Analysis Uniforms
                const audioUniforms = [
                    // Spectral Centroid
                    "spectralCentroid",
                    "spectralCentroidNormalized",
                    "spectralCentroidMean",
                    "spectralCentroidMedian",
                    "spectralCentroidStandardDeviation",
                    "spectralCentroidZScore",
                    "spectralCentroidMin",
                    "spectralCentroidMax",
                    "spectralCentroidSlope",
                    "spectralCentroidIntercept",
                    "spectralCentroidRSquared",

                    // Spectral Flux
                    "spectralFlux",
                    "spectralFluxNormalized",
                    "spectralFluxMean",
                    "spectralFluxMedian",
                    "spectralFluxStandardDeviation",
                    "spectralFluxZScore",
                    "spectralFluxMin",
                    "spectralFluxMax",
                    "spectralFluxSlope",
                    "spectralFluxIntercept",
                    "spectralFluxRSquared",

                    // Spectral Spread
                    "spectralSpread",
                    "spectralSpreadNormalized",
                    "spectralSpreadMean",
                    "spectralSpreadMedian",
                    "spectralSpreadStandardDeviation",
                    "spectralSpreadZScore",
                    "spectralSpreadMin",
                    "spectralSpreadMax",
                    "spectralSpreadSlope",
                    "spectralSpreadIntercept",
                    "spectralSpreadRSquared",

                    // Spectral Rolloff
                    "spectralRolloff",
                    "spectralRolloffNormalized",
                    "spectralRolloffMean",
                    "spectralRolloffMedian",
                    "spectralRolloffStandardDeviation",
                    "spectralRolloffZScore",
                    "spectralRolloffMin",
                    "spectralRolloffMax",
                    "spectralRolloffSlope",
                    "spectralRolloffIntercept",
                    "spectralRolloffRSquared",

                    // Spectral Roughness
                    "spectralRoughness",
                    "spectralRoughnessNormalized",
                    "spectralRoughnessMean",
                    "spectralRoughnessMedian",
                    "spectralRoughnessStandardDeviation",
                    "spectralRoughnessZScore",
                    "spectralRoughnessMin",
                    "spectralRoughnessMax",
                    "spectralRoughnessSlope",
                    "spectralRoughnessIntercept",
                    "spectralRoughnessRSquared",

                    // Spectral Kurtosis
                    "spectralKurtosis",
                    "spectralKurtosisNormalized",
                    "spectralKurtosisMean",
                    "spectralKurtosisMedian",
                    "spectralKurtosisStandardDeviation",
                    "spectralKurtosisZScore",
                    "spectralKurtosisMin",
                    "spectralKurtosisMax",
                    "spectralKurtosisSlope",
                    "spectralKurtosisIntercept",
                    "spectralKurtosisRSquared",

                    // Energy
                    "energy",
                    "energyNormalized",
                    "energyMean",
                    "energyMedian",
                    "energyStandardDeviation",
                    "energyZScore",
                    "energyMin",
                    "energyMax",
                    "energySlope",
                    "energyIntercept",
                    "energyRSquared",

                    // Spectral Entropy
                    "spectralEntropy",
                    "spectralEntropyNormalized",
                    "spectralEntropyMean",
                    "spectralEntropyMedian",
                    "spectralEntropyStandardDeviation",
                    "spectralEntropyZScore",
                    "spectralEntropyMin",
                    "spectralEntropyMax",
                    "spectralEntropySlope",
                    "spectralEntropyIntercept",
                    "spectralEntropyRSquared",

                    // Spectral Crest
                    "spectralCrest",
                    "spectralCrestNormalized",
                    "spectralCrestMean",
                    "spectralCrestMedian",
                    "spectralCrestStandardDeviation",
                    "spectralCrestZScore",
                    "spectralCrestMin",
                    "spectralCrestMax",
                    "spectralCrestSlope",
                    "spectralCrestIntercept",
                    "spectralCrestRSquared",

                    // Spectral Skew
                    "spectralSkew",
                    "spectralSkewNormalized",
                    "spectralSkewMean",
                    "spectralSkewMedian",
                    "spectralSkewStandardDeviation",
                    "spectralSkewZScore",
                    "spectralSkewMin",
                    "spectralSkewMax",
                    "spectralSkewSlope",
                    "spectralSkewIntercept",
                    "spectralSkewRSquared",

                    // Pitch Class
                    "pitchClass",
                    "pitchClassNormalized",
                    "pitchClassMean",
                    "pitchClassMedian",
                    "pitchClassStandardDeviation",
                    "pitchClassZScore",
                    "pitchClassMin",
                    "pitchClassMax",
                    "pitchClassSlope",
                    "pitchClassIntercept",
                    "pitchClassRSquared",

                    // Frequency Bands
                    "bass",
                    "bassNormalized",
                    "bassMean",
                    "bassMedian",
                    "bassStandardDeviation",
                    "bassZScore",
                    "bassMin",
                    "bassMax",
                    "bassSlope",
                    "bassIntercept",
                    "bassRSquared",

                    "mids",
                    "midsNormalized",
                    "midsMean",
                    "midsMedian",
                    "midsStandardDeviation",
                    "midsZScore",
                    "midsMin",
                    "midsMax",
                    "midsSlope",
                    "midsIntercept",
                    "midsRSquared",

                    "treble",
                    "trebleNormalized",
                    "trebleMean",
                    "trebleMedian",
                    "trebleStandardDeviation",
                    "trebleZScore",
                    "trebleMin",
                    "trebleMax",
                    "trebleSlope",
                    "trebleIntercept",
                    "trebleRSquared",

                    // Beat Detection
                    "beat"
                ]

                // Paper Cranes Helper Functions
                const helperFunctions = ["getLastFrameColor", "rgb2hsl", "hsl2rgb", "hslmix", "rgb2oklab", "oklab2rgb", "oklabmix", "map"]

                // Paper Cranes Constants
                const constants = ["PI", "TAU", "EPSILON", "resolution", "time", "random"]

                return [
                    ...glslKeywords.map(
                        (keyword) => new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword)
                    ),
                    ...glslFunctions.map((func) => new vscode.CompletionItem(func, vscode.CompletionItemKind.Function)),
                    ...audioUniforms.map(
                        (uniform) => new vscode.CompletionItem(uniform, vscode.CompletionItemKind.Variable)
                    ),
                    ...helperFunctions.map(
                        (func) => new vscode.CompletionItem(func, vscode.CompletionItemKind.Function)
                    ),
                    ...constants.map(
                        (constant) => new vscode.CompletionItem(constant, vscode.CompletionItemKind.Constant)
                    )
                ]
            }
        },
        ".", // Trigger completion on dot
        " " // Trigger completion on space
    )

    // Register hover provider
    const hoverProvider = vscode.languages.registerHoverProvider(
        { scheme: "file", language: "paper-cranes-fragment-shader" },
        {
            provideHover(document: vscode.TextDocument, position: vscode.Position) {
                const range = document.getWordRangeAtPosition(position)
                if (!range) {
                    return undefined
                }

                const word = document.getText(range)
                if (!word) {
                    return undefined
                }

                const hoverInfo: { [key: string]: string } = {
                    // Spectral Centroid
                    spectralCentroid: "The center of mass of the spectrum. Higher values indicate 'brighter' sounds.",
                    spectralCentroidNormalized: "Normalized spectral centroid (0-1). Higher values = brighter sounds.",
                    spectralCentroidMean: "Average spectral centroid over time.",
                    spectralCentroidMedian: "Median spectral centroid value.",
                    spectralCentroidStandardDeviation: "How much the spectral centroid varies.",
                    spectralCentroidZScore:
                        "How many standard deviations from mean (-1 to 1). Good for detecting dramatic timbral changes.",
                    spectralCentroidMin: "Minimum spectral centroid value observed.",
                    spectralCentroidMax: "Maximum spectral centroid value observed.",
                    spectralCentroidSlope: "Linear regression slope of spectral centroid over history. Positive = getting brighter, negative = getting darker.",
                    spectralCentroidIntercept: "Regression intercept for spectral centroid. Predicted value at start of history window.",
                    spectralCentroidRSquared: "How well a linear trend fits the spectral centroid (0-1). High = steady trend, low = chaotic.",

                    // Spectral Flux
                    spectralFlux: "Rate of change of the spectrum. Higher values = more dramatic changes.",
                    spectralFluxNormalized: "Normalized spectral flux (0-1). Good for detecting onsets.",
                    spectralFluxMean: "Average spectral flux over time.",
                    spectralFluxMedian: "Median spectral flux value.",
                    spectralFluxStandardDeviation: "How much the spectral flux varies.",
                    spectralFluxZScore: "How many standard deviations from mean (-1 to 1). Good for detecting drops.",
                    spectralFluxMin: "Minimum spectral flux value observed.",
                    spectralFluxMax: "Maximum spectral flux value observed.",
                    spectralFluxSlope: "Linear regression slope of spectral flux. Positive = increasing rate of change, negative = stabilizing.",
                    spectralFluxIntercept: "Regression intercept for spectral flux.",
                    spectralFluxRSquared: "How well a linear trend fits the spectral flux (0-1).",

                    // Spectral Spread
                    spectralSpread:
                        "Width of the spectrum around its centroid. Higher values = more noise-like sounds.",
                    spectralSpreadNormalized: "Normalized spectral spread (0-1).",
                    spectralSpreadMean: "Average spectral spread over time.",
                    spectralSpreadMedian: "Median spectral spread value.",
                    spectralSpreadStandardDeviation: "How much the spectral spread varies.",
                    spectralSpreadZScore: "How many standard deviations from mean (-1 to 1).",
                    spectralSpreadMin: "Minimum spectral spread value observed.",
                    spectralSpreadMax: "Maximum spectral spread value observed.",
                    spectralSpreadSlope: "Linear regression slope of spectral spread. Positive = widening spectrum, negative = narrowing.",
                    spectralSpreadIntercept: "Regression intercept for spectral spread.",
                    spectralSpreadRSquared: "How well a linear trend fits the spectral spread (0-1).",

                    // Spectral Rolloff
                    spectralRolloff:
                        "Frequency below which 85% of spectrum energy lies. Higher = more high frequencies.",
                    spectralRolloffNormalized: "Normalized spectral rolloff (0-1).",
                    spectralRolloffMean: "Average spectral rolloff over time.",
                    spectralRolloffMedian: "Median spectral rolloff value.",
                    spectralRolloffStandardDeviation: "How much the spectral rolloff varies.",
                    spectralRolloffZScore: "How many standard deviations from mean (-1 to 1).",
                    spectralRolloffMin: "Minimum spectral rolloff value observed.",
                    spectralRolloffMax: "Maximum spectral rolloff value observed.",
                    spectralRolloffSlope: "Linear regression slope of spectral rolloff. Positive = more high frequency content, negative = less.",
                    spectralRolloffIntercept: "Regression intercept for spectral rolloff.",
                    spectralRolloffRSquared: "How well a linear trend fits the spectral rolloff (0-1).",

                    // Spectral Roughness
                    spectralRoughness:
                        "Measure of sensory dissonance. Higher values = more 'rough' or dissonant sound.",
                    spectralRoughnessNormalized: "Normalized spectral roughness (0-1).",
                    spectralRoughnessMean: "Average spectral roughness over time.",
                    spectralRoughnessMedian: "Median spectral roughness value.",
                    spectralRoughnessStandardDeviation: "How much the spectral roughness varies.",
                    spectralRoughnessZScore: "How many standard deviations from mean (-1 to 1).",
                    spectralRoughnessMin: "Minimum spectral roughness value observed.",
                    spectralRoughnessMax: "Maximum spectral roughness value observed.",
                    spectralRoughnessSlope: "Linear regression slope of spectral roughness. Positive = getting rougher/more dissonant.",
                    spectralRoughnessIntercept: "Regression intercept for spectral roughness.",
                    spectralRoughnessRSquared: "How well a linear trend fits the spectral roughness (0-1).",

                    // Spectral Kurtosis
                    spectralKurtosis: "Measure of 'peakedness' of spectrum. Higher values = more defined peaks.",
                    spectralKurtosisNormalized: "Normalized spectral kurtosis (0-1).",
                    spectralKurtosisMean: "Average spectral kurtosis over time.",
                    spectralKurtosisMedian: "Median spectral kurtosis value.",
                    spectralKurtosisStandardDeviation: "How much the spectral kurtosis varies.",
                    spectralKurtosisZScore: "How many standard deviations from mean (-1 to 1).",
                    spectralKurtosisMin: "Minimum spectral kurtosis value observed.",
                    spectralKurtosisMax: "Maximum spectral kurtosis value observed.",
                    spectralKurtosisSlope: "Linear regression slope of spectral kurtosis. Positive = spectrum getting peakier.",
                    spectralKurtosisIntercept: "Regression intercept for spectral kurtosis.",
                    spectralKurtosisRSquared: "How well a linear trend fits the spectral kurtosis (0-1).",

                    // Energy
                    energy: "Overall audio energy across all frequencies.",
                    energyNormalized: "Normalized energy value (0-1). Good for overall intensity.",
                    energyMean: "Average energy over time.",
                    energyMedian: "Median energy value.",
                    energyStandardDeviation: "How much the energy varies.",
                    energyZScore:
                        "How many standard deviations from mean (-1 to 1). Good for detecting intense moments.",
                    energyMin: "Minimum energy value observed.",
                    energyMax: "Maximum energy value observed.",
                    energySlope: "Linear regression slope of energy. Positive = building up, negative = dropping. Great for detecting builds and drops.",
                    energyIntercept: "Regression intercept for energy. Where the energy trend started from.",
                    energyRSquared: "How well a linear trend fits the energy (0-1). High + positive slope = confident build-up.",

                    // Spectral Entropy
                    spectralEntropy: "Measure of spectrum disorder. Higher values = more noise-like.",
                    spectralEntropyNormalized: "Normalized spectral entropy (0-1).",
                    spectralEntropyMean: "Average spectral entropy over time.",
                    spectralEntropyMedian: "Median spectral entropy value.",
                    spectralEntropyStandardDeviation: "How much the spectral entropy varies.",
                    spectralEntropyZScore: "How many standard deviations from mean (-1 to 1).",
                    spectralEntropyMin: "Minimum spectral entropy value observed.",
                    spectralEntropyMax: "Maximum spectral entropy value observed.",
                    spectralEntropySlope: "Linear regression slope of spectral entropy. Positive = getting more chaotic, negative = getting more ordered.",
                    spectralEntropyIntercept: "Regression intercept for spectral entropy.",
                    spectralEntropyRSquared: "How well a linear trend fits the spectral entropy (0-1).",

                    // Spectral Crest
                    spectralCrest: "Ratio of max to mean spectrum magnitude. Higher values = more tonal sounds.",
                    spectralCrestNormalized: "Normalized spectral crest (0-1).",
                    spectralCrestMean: "Average spectral crest over time.",
                    spectralCrestMedian: "Median spectral crest value.",
                    spectralCrestStandardDeviation: "How much the spectral crest varies.",
                    spectralCrestZScore: "How many standard deviations from mean (-1 to 1).",
                    spectralCrestMin: "Minimum spectral crest value observed.",
                    spectralCrestMax: "Maximum spectral crest value observed.",
                    spectralCrestSlope: "Linear regression slope of spectral crest. Positive = getting more tonal, negative = getting noisier.",
                    spectralCrestIntercept: "Regression intercept for spectral crest.",
                    spectralCrestRSquared: "How well a linear trend fits the spectral crest (0-1).",

                    // Spectral Skew
                    spectralSkew: "Measure of spectrum asymmetry. Higher values = more energy in high frequencies.",
                    spectralSkewNormalized: "Normalized spectral skew (0-1).",
                    spectralSkewMean: "Average spectral skew over time.",
                    spectralSkewMedian: "Median spectral skew value.",
                    spectralSkewStandardDeviation: "How much the spectral skew varies.",
                    spectralSkewZScore: "How many standard deviations from mean (-1 to 1).",
                    spectralSkewMin: "Minimum spectral skew value observed.",
                    spectralSkewMax: "Maximum spectral skew value observed.",
                    spectralSkewSlope: "Linear regression slope of spectral skew. Positive = tilting brighter, negative = tilting darker.",
                    spectralSkewIntercept: "Regression intercept for spectral skew.",
                    spectralSkewRSquared: "How well a linear trend fits the spectral skew (0-1).",

                    // Pitch Class
                    pitchClass: "Dominant pitch class (0-11, where 0=C, 1=C#, etc).",
                    pitchClassNormalized: "Normalized pitch class (0-1).",
                    pitchClassMean: "Average pitch class over time.",
                    pitchClassMedian: "Median pitch class value.",
                    pitchClassStandardDeviation: "How much the pitch class varies.",
                    pitchClassZScore: "How many standard deviations from mean (-1 to 1).",
                    pitchClassMin: "Minimum pitch class value observed.",
                    pitchClassMax: "Maximum pitch class value observed.",
                    pitchClassSlope: "Linear regression slope of pitch class. Indicates if pitch is trending up or down.",
                    pitchClassIntercept: "Regression intercept for pitch class.",
                    pitchClassRSquared: "How well a linear trend fits the pitch class (0-1).",

                    // Frequency Bands
                    bass: "Low frequency energy (20-250Hz).",
                    bassNormalized: "Normalized bass energy (0-1). Good for bass-driven effects.",
                    bassMean: "Average bass energy over time.",
                    bassMedian: "Median bass energy value.",
                    bassStandardDeviation: "How much the bass energy varies.",
                    bassZScore: "How many standard deviations from mean (-1 to 1). Good for detecting bass drops.",
                    bassMin: "Minimum bass energy observed.",
                    bassMax: "Maximum bass energy observed.",
                    bassSlope: "Linear regression slope of bass energy. Positive = bass building up, negative = bass dropping.",
                    bassIntercept: "Regression intercept for bass energy.",
                    bassRSquared: "How well a linear trend fits the bass energy (0-1).",

                    mids: "Mid frequency energy (250-2000Hz).",
                    midsNormalized: "Normalized mids energy (0-1). Good for melody-driven effects.",
                    midsMean: "Average mids energy over time.",
                    midsMedian: "Median mids energy value.",
                    midsStandardDeviation: "How much the mids energy varies.",
                    midsZScore: "How many standard deviations from mean (-1 to 1).",
                    midsMin: "Minimum mids energy observed.",
                    midsMax: "Maximum mids energy observed.",
                    midsSlope: "Linear regression slope of mids energy. Positive = mids building, negative = mids dropping.",
                    midsIntercept: "Regression intercept for mids energy.",
                    midsRSquared: "How well a linear trend fits the mids energy (0-1).",

                    treble: "High frequency energy (2000-20000Hz).",
                    trebleNormalized: "Normalized treble energy (0-1). Good for cymbal/hi-hat driven effects.",
                    trebleMean: "Average treble energy over time.",
                    trebleMedian: "Median treble energy value.",
                    trebleStandardDeviation: "How much the treble energy varies.",
                    trebleZScore: "How many standard deviations from mean (-1 to 1).",
                    trebleMin: "Minimum treble energy observed.",
                    trebleMax: "Maximum treble energy observed.",
                    trebleSlope: "Linear regression slope of treble energy. Positive = treble building, negative = treble dropping.",
                    trebleIntercept: "Regression intercept for treble energy.",
                    trebleRSquared: "How well a linear trend fits the treble energy (0-1).",

                    // Beat Detection
                    beat: "Boolean indicating if current frame is on a beat.",

                    // Helper Functions
                    getLastFrameColor:
                        "Returns the color from the previous frame at the given UV coordinate.\nUsage: getLastFrameColor(vec2 uv)",
                    rgb2hsl: "Converts RGB color to HSL color space.\nUsage: rgb2hsl(vec3 rgb)",
                    hsl2rgb: "Converts HSL color to RGB color space.\nUsage: hsl2rgb(vec3 hsl)",
                    hslmix: "Mixes two colors in HSL space.\nUsage: hslmix(vec3 col1, vec3 col2, float t)\nAlso accepts vec4 (alpha passed through).",
                    rgb2oklab: "Converts RGB color to Oklab perceptual color space.\nUsage: rgb2oklab(vec3 rgb) or rgb2oklab(vec4 rgba)",
                    oklab2rgb: "Converts Oklab color back to RGB.\nUsage: oklab2rgb(vec3 lab) or oklab2rgb(vec4 laba)",
                    oklabmix: "Mixes two colors in Oklab perceptual space. Produces more natural gradients than HSL or RGB.\nUsage: oklabmix(vec3 col1, vec3 col2, float t)\nAlso accepts vec4 (alpha interpolated).",
                    map: "Maps a value from one range to another.\nUsage: map(float value, float inMin, float inMax, float outMin, float outMax)",

                    // Constants
                    PI: "Mathematical constant π (3.14159...)",
                    resolution: "Screen resolution in pixels (vec2)",
                    time: "Current time in seconds (float)",
                    random: "Returns a random value between 0-1.\nUsage: random(vec2 st)"
                }

                const info = hoverInfo[word]
                if (info) {
                    return new vscode.Hover(info)
                }

                return undefined
            }
        }
    )

    context.subscriptions.push(completionProvider, hoverProvider)
}

export function deactivate() {
    // Clean up will be handled automatically by VS Code
}
