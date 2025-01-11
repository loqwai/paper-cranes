import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("Paper Cranes extension activated");

  // Register completions provider for Paper Cranes specific features
  const provider = vscode.languages.registerCompletionItemProvider("paper-cranes-fragment-shader", {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
      const keywords = [
        // Audio analysis uniforms
        "spectralCentroid",
        "spectralCentroidNormalized",
        "spectralFlux",
        "spectralFluxNormalized",
        "spectralKurtosis",
        "spectralKurtosisNormalized",
        "spectralRoughness",
        "spectralRoughnessNormalized",
        "spectralSpread",
        "spectralRolloff",
        "spectralSkewness",
        "spectralSkewnessNormalized",
        "energy",
        "bass",
        "mids",
        "treble",
        // Helper functions
        "getLastFrameColor",
        "rgb2hsl",
        "hsl2rgb",
        // Constants
        "PI",
        "mapValue",
        "resolution",
        "time",
      ];

      return keywords.map((keyword) => new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword));
    },
  });

  // Register hover provider only for Paper Cranes specific features
  const hoverProvider = vscode.languages.registerHoverProvider("paper-cranes-fragment-shader", {
    provideHover(document: vscode.TextDocument, position: vscode.Position) {
      console.log("provideHover");
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) return;

      const word = document.getText(wordRange);

      // Only provide hover info for Paper Cranes specific features
      const paperCranesHoverInfo = {
        rgb2hsl: "vec3 rgb2hsl(vec3 rgb)\nConverts RGB color to HSL color space",
        hsl2rgb: "vec3 hsl2rgb(vec3 hsl)\nConverts HSL color to RGB color space",
        getLastFrameColor: "vec4 getLastFrameColor(vec2 uv)\nReturns the color from the previous frame at the specified UV coordinates",
        mapValue: "float mapValue(float value, float inMin, float inMax, float outMin, float outMax)\nMaps a value from one range to another",
      };

      const info = paperCranesHoverInfo[word];
      if (info) {
        return new vscode.Hover(info);
      }
    },
  });

  context.subscriptions.push(provider, hoverProvider);
}

export function deactivate() {}
