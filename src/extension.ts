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

                    const hoverMessage = new vscode.MarkdownString(`**Slack Message:** ${messageContent}`);
                    hoverMessage.isTrusted = true;
                    hoverMessage.appendMarkdown(`\n\n[Insert Commented Message](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify(slackUrl))})`);

                    return new vscode.Hover(hoverMessage);
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

    let toggleInlineMessageDisposable = vscode.commands.registerCommand('slackoscope.toggleInlineMessage', async () => {
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

    context.subscriptions.push(toggleInlineMessageDisposable);

    // Register the new command
    let insertCommentedMessageDisposable = vscode.commands.registerCommand('slackoscope.insertCommentedMessage', async (slackUrl: string) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const messageContent = await slackApi.getMessageContent(slackUrl);

            let lineOfUrl = -1;
            // Find the line number containing the slackUrl
            for (let i = 0; i < document.lineCount; i++) {
                if (document.lineAt(i).text.includes(slackUrl)) {
                    lineOfUrl = i;
                    break;
                }
            }

            if (lineOfUrl !== -1) {
                // Format the message content as a comment
                const comment = `// ${messageContent.replace(/\n/g, '\n// ')}`;
                const edit = new vscode.WorkspaceEdit();
                // Insert the comment at the beginning of the line where slackUrl was found
                const insertPosition = new vscode.Position(lineOfUrl, 0);
                edit.insert(document.uri, insertPosition, `${comment}\n`);
                await vscode.workspace.applyEdit(edit);
            }
        }
    });

    context.subscriptions.push(insertCommentedMessageDisposable);
}

export function deactivate() {}
