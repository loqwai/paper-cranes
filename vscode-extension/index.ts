import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  // Register completions provider
  const provider = vscode.languages.registerCompletionItemProvider("paper-cranes-fragment-shader", {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
      const keywords = [
        // Audio analysis uniforms
        "spectralCentroid",
        "spectralCentroidNormalized",
        "spectralFlux",
        "spectralSpread",
        "spectralRolloff",
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
        "spectralCentroid",
        "energy",
        "spectralRolloff" /* ... */,
      ];

      return keywords.map((keyword) => new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword));
    },
  });

  context.subscriptions.push(provider);
}

export function deactivate() {}
