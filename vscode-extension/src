import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
    // Register completions provider
    const provider = vscode.languages.registerCompletionItemProvider('glsl', {
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            const keywords = [
                // Add all your keywords from monaco.js here
                'getLastFrameColor',
                'PI',
                'mapValue',
                'resolution',
                'time',
                'spectralCentroid',
                'energy',
                'spectralRolloff' /* ... */,
            ]

            return keywords.map((keyword) => new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword))
        },
    })

    context.subscriptions.push(provider)
}

export function deactivate() {}
