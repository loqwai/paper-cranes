import * as vscode from "vscode";

console.log("🏮 Paper Cranes Extension Exists 🏮");
export function activate(context: vscode.ExtensionContext) {
  console.log("🏮 Paper Cranes Extension Activated 🏮");
  // Create disposable array for cleanup
  const disposables: vscode.Disposable[] = [];

  // Register completions provider
  const completionProvider = vscode.languages.registerCompletionItemProvider("paper-cranes-fragment-shader", {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
      console.log("provideCompletionItems");
      const keywords = [
        // Audio analysis uniforms
        "spectralCentroid",
        "spectralCentroidNormalized",
        "spectralCentroidMean",
        "spectralCentroidMedian",
        "spectralCentroidStandardDeviation",
        "spectralCentroidZScore",
        "spectralCentroidMin",
        "spectralCentroidMax",

        "spectralFlux",
        "spectralFluxNormalized",
        "spectralFluxMean",
        "spectralFluxMedian",
        "spectralFluxStandardDeviation",
        "spectralFluxZScore",
        "spectralFluxMin",
        "spectralFluxMax",

        "spectralSpread",
        "spectralSpreadNormalized",
        "spectralSpreadMean",
        "spectralSpreadMedian",
        "spectralSpreadStandardDeviation",
        "spectralSpreadZScore",
        "spectralSpreadMin",
        "spectralSpreadMax",

        "spectralRolloff",
        "spectralRolloffNormalized",
        "spectralRolloffMean",
        "spectralRolloffMedian",
        "spectralRolloffStandardDeviation",
        "spectralRolloffZScore",
        "spectralRolloffMin",
        "spectralRolloffMax",

        "spectralRoughness",
        "spectralRoughnessNormalized",
        "spectralRoughnessMean",
        "spectralRoughnessMedian",
        "spectralRoughnessStandardDeviation",
        "spectralRoughnessZScore",
        "spectralRoughnessMin",
        "spectralRoughnessMax",

        "spectralKurtosis",
        "spectralKurtosisNormalized",
        "spectralKurtosisMean",
        "spectralKurtosisMedian",
        "spectralKurtosisStandardDeviation",
        "spectralKurtosisZScore",
        "spectralKurtosisMin",
        "spectralKurtosisMax",

        "energy",
        "energyNormalized",
        "energyMean",
        "energyMedian",
        "energyStandardDeviation",
        "energyZScore",
        "energyMin",
        "energyMax",

        "spectralEntropy",
        "spectralEntropyNormalized",
        "spectralEntropyMean",
        "spectralEntropyMedian",
        "spectralEntropyStandardDeviation",
        "spectralEntropyZScore",
        "spectralEntropyMin",
        "spectralEntropyMax",

        "spectralCrest",
        "spectralCrestNormalized",
        "spectralCrestMean",
        "spectralCrestMedian",
        "spectralCrestStandardDeviation",
        "spectralCrestZScore",
        "spectralCrestMin",
        "spectralCrestMax",

        "spectralSkew",
        "spectralSkewNormalized",
        "spectralSkewMean",
        "spectralSkewMedian",
        "spectralSkewStandardDeviation",
        "spectralSkewZScore",
        "spectralSkewMin",
        "spectralSkewMax",

        "pitchClass",
        "pitchClassNormalized",
        "pitchClassMean",
        "pitchClassMedian",
        "pitchClassStandardDeviation",
        "pitchClassZScore",
        "pitchClassMin",
        "pitchClassMax",

        "bass",
        "bassNormalized",
        "bassMean",
        "bassMedian",
        "bassStandardDeviation",
        "bassZScore",
        "bassMin",
        "bassMax",

        "mids",
        "midsNormalized",
        "midsMean",
        "midsMedian",
        "midsStandardDeviation",
        "midsZScore",
        "midsMin",
        "midsMax",

        "treble",
        "trebleNormalized",
        "trebleMean",
        "trebleMedian",
        "trebleStandardDeviation",
        "trebleZScore",
        "trebleMin",
        "trebleMax",

        // Helper functions
        "getLastFrameColor",
        "rgb2hsl",
        "hsl2rgb",
        "hslmix",
        "map",

        // Constants
        "PI",
        "mapValue",
        "resolution",
        "time",
        "random",
      ];

      return keywords.map((keyword) => new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword));
    },
  });

  // Register hover provider
  const hoverProvider = vscode.languages.registerHoverProvider("paper-cranes-fragment-shader", {
    provideHover(document: vscode.TextDocument, position: vscode.Position) {
      console.log("provideHover");
      const range = document.getWordRangeAtPosition(position);
      if (!range) {
        return undefined;
      }

      const word = document.getText(range);
      if (!word) {
        return undefined;
      }

      const hoverInfo: { [key: string]: string } = {
        // Audio Analysis - Spectral Features
        spectralCentroid: "The center of mass of the spectrum. Higher values indicate 'brighter' sounds.",
        spectralCentroidNormalized: "Normalized spectral centroid value between 0-1.",
        spectralCentroidZScore: "How many standard deviations from the mean (-1 to 1).",

        spectralFlux: "The rate of change of the spectrum. Higher values indicate more dramatic changes.",
        spectralFluxNormalized: "Normalized spectral flux value between 0-1.",
        spectralFluxZScore: "How many standard deviations from the mean (-1 to 1).",

        // Frequency Bands
        bass: "Low frequency energy (20-250Hz).",
        bassNormalized: "Normalized bass energy between 0-1.",
        bassZScore: "How many standard deviations from the mean bass level (-1 to 1).",

        mids: "Mid frequency energy (250-2000Hz).",
        midsNormalized: "Normalized mids energy between 0-1.",
        midsZScore: "How many standard deviations from the mean mids level (-1 to 1).",

        treble: "High frequency energy (2000-20000Hz).",
        trebleNormalized: "Normalized treble energy between 0-1.",
        trebleZScore: "How many standard deviations from the mean treble level (-1 to 1).",

        // Overall Energy
        energy: "Overall audio energy across all frequencies.",
        energyNormalized: "Normalized energy value between 0-1.",
        energyZScore: "How many standard deviations from the mean energy (-1 to 1).",

        // Helper Functions
        getLastFrameColor: "Returns the color from the previous frame at the given UV coordinate.\nUsage: getLastFrameColor(vec2 uv)",
        rgb2hsl: "Converts RGB color to HSL color space.\nUsage: rgb2hsl(vec3 rgb)",
        hsl2rgb: "Converts HSL color to RGB color space.\nUsage: hsl2rgb(vec3 hsl)",
        hslmix: "Mixes two colors in HSL space.\nUsage: hslmix(vec3 col1, vec3 col2, float t)",
        map: "Maps a value from one range to another.\nUsage: map(float value, float inMin, float inMax, float outMin, float outMax)",

        // Constants
        PI: "Mathematical constant π (3.14159...)",
        resolution: "Screen resolution in pixels (vec2)",
        time: "Current time in seconds (float)",
        random: "Returns a random value between 0-1.\nUsage: random(vec2 st)",
      };

      const info = hoverInfo[word];
      if (info) {
        return new vscode.Hover(info);
      }

      return undefined;
    },
  });

  // Add providers to disposables array
  disposables.push(completionProvider, hoverProvider);

  // Add all disposables to subscriptions
  context.subscriptions.push(...disposables);
}

export function deactivate() {
  // Clean up will be handled automatically by VS Code
}
