import * as vscode from 'vscode';
import { SlackApi, SLACK_URL_REGEX } from './slackApi';

export function activate(context: vscode.ExtensionContext) {
    console.log('Slackoscope is now active!');

    let slackApi: SlackApi;
    try {
        slackApi = new SlackApi();
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Slackoscope: ${error.message}`);
        } else {
            vscode.window.showErrorMessage('Slackoscope: An unknown error occurred');
        }
        return;
    }

    // Register the hover provider
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('*', {
            async provideHover(document, position, token) {
                const range = document.getWordRangeAtPosition(position, SLACK_URL_REGEX);
                if (range) {
                    const slackUrl = document.getText(range);
                    const messageContent = await slackApi.getMessageContent(slackUrl);
                    return new vscode.Hover(messageContent);
                }
            }
        })
    );

    // Register a command to toggle inline message display
    let inlineMessageDecorationType = vscode.window.createTextEditorDecorationType({
        after: {
            margin: '0 0 0 1em',
            textDecoration: 'none; opacity: 0.7;'
        }
    });

    let disposable = vscode.commands.registerCommand('slackoscope.toggleInlineMessage', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const decorations: vscode.DecorationOptions[] = [];

            const text = document.getText();
            let match;
            while ((match = SLACK_URL_REGEX.exec(text))) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);

                const messageContent = await slackApi.getMessageContent(match[0]);

                decorations.push({
                    range,
                    renderOptions: {
                        after: {
                            contentText: `  |  ${messageContent}`,
                        }
                    }
                });
            }

            editor.setDecorations(inlineMessageDecorationType, decorations);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
