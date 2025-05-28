import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { SlackApi } from '../slackApi'; // Adjusted path

suite('Extension Test Suite - slackoscope.insertCommentedMessage', () => {
    let getMessageContentStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub;

    suiteSetup(async () => {
        // Ensure the extension is activated
        const extension = vscode.extensions.getExtension('LemuelCushing.slackoscope');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
        vscode.window.showInformationMessage('Slackoscope extension activated for tests.');
    });

    setup(() => {
        // Mock vscode.workspace.getConfiguration to provide a dummy token
        getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns({
            get: (section: string) => {
                if (section === 'slackoscope.token' || section === 'token') {
                    return 'test-token'; // Provide a dummy token
                }
                return undefined;
            },
            has: () => true,
            inspect: () => undefined,
            update: async () => {}
        } as vscode.WorkspaceConfiguration);

        // Stub SlackApi.prototype.getMessageContent
        // Important: Ensure SlackApi is defined and its prototype can be stubbed.
        // This might require the SlackApi class to be exported from slackApi.ts
        if (SlackApi && SlackApi.prototype) {
             getMessageContentStub = sinon.stub(SlackApi.prototype, 'getMessageContent');
        } else {
            console.error("SlackApi or SlackApi.prototype is not available for stubbing.");
            // Fallback or throw error to indicate critical test setup failure
            // For now, we'll let tests potentially fail if this isn't set up.
        }
    });

    teardown(async () => {
        sinon.restore();
        // Close the active editor
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('Insert Commented Message - Single Line', async () => {
        if (!getMessageContentStub) {
            assert.fail("getMessageContentStub was not initialized. Check SlackApi import and prototype.");
        }
        const slackUrl = 'https://example.slack.com/archives/C123/p1234567890123';
        const testMessage = 'This is a test message.';
        const expectedComment = `// ${testMessage}`;

        getMessageContentStub.resolves(testMessage);

        const document = await vscode.workspace.openTextDocument({
            content: `Some text before\n${slackUrl}\nSome text after`,
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(document);

        await vscode.commands.executeCommand('slackoscope.insertCommentedMessage', slackUrl);

        const editor = vscode.window.activeTextEditor;
        assert.ok(editor, 'No active text editor');
        const text = editor.document.getText();
        const expectedText = `Some text before\n${expectedComment}\n${slackUrl}\nSome text after`;
        assert.strictEqual(text.replace(/\r\n/g, '\n'), expectedText.replace(/\r\n/g, '\n'), 'Comment not inserted correctly for single line message');
        assert.ok(getMessageContentStub.calledOnceWith(slackUrl), 'getMessageContent was not called once with the correct URL');
    });

    test('Insert Commented Message - Multi-Line', async () => {
        if (!getMessageContentStub) {
            assert.fail("getMessageContentStub was not initialized. Check SlackApi import and prototype.");
        }
        const slackUrl = 'https://example.slack.com/archives/C456/p987654321098';
        const testMessage = 'First line of message.\nSecond line of message.';
        const expectedComment = `// First line of message.\n// Second line of message.`;

        getMessageContentStub.resolves(testMessage);

        const document = await vscode.workspace.openTextDocument({
            content: `Multi-line test\n${slackUrl}\nEnd of multi-line test`,
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(document);

        await vscode.commands.executeCommand('slackoscope.insertCommentedMessage', slackUrl);

        const editor = vscode.window.activeTextEditor;
        assert.ok(editor, 'No active text editor');
        const text = editor.document.getText();
        const expectedText = `Multi-line test\n${expectedComment}\n${slackUrl}\nEnd of multi-line test`;
        assert.strictEqual(text.replace(/\r\n/g, '\n'), expectedText.replace(/\r\n/g, '\n'), 'Comment not inserted correctly for multi-line message');
        assert.ok(getMessageContentStub.calledOnceWith(slackUrl), 'getMessageContent was not called once with the correct URL for multi-line');
    });

    test('Insert Commented Message - URL at the beginning of a line', async () => {
        if (!getMessageContentStub) {
            assert.fail("getMessageContentStub was not initialized. Check SlackApi import and prototype.");
        }
        const slackUrl = 'https://acme.slack.com/archives/C123ABC/p1620123456789012';
        const testMessage = 'Message for URL at line start.';
        const expectedComment = `// ${testMessage}`;

        getMessageContentStub.resolves(testMessage);

        const document = await vscode.workspace.openTextDocument({
            content: `${slackUrl}\nSome text after`,
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(document);

        await vscode.commands.executeCommand('slackoscope.insertCommentedMessage', slackUrl);

        const editor = vscode.window.activeTextEditor;
        assert.ok(editor, 'No active text editor');
        const text = editor.document.getText();
        const expectedText = `${expectedComment}\n${slackUrl}\nSome text after`;
        assert.strictEqual(text.replace(/\r\n/g, '\n'), expectedText.replace(/\r\n/g, '\n'), 'Comment not inserted correctly when URL is at the start of a line.');
        assert.ok(getMessageContentStub.calledOnceWith(slackUrl), 'getMessageContent was not called correctly for URL at line start.');
    });

    test('Insert Commented Message - URL at the end of a line (should still insert above)', async () => {
        if (!getMessageContentStub) {
            assert.fail("getMessageContentStub was not initialized. Check SlackApi import and prototype.");
        }
        const slackUrl = 'https://another.slack.com/archives/D789XYZ/p1730123456789013';
        const testMessage = 'Message for URL at line end.';
        const expectedComment = `// ${testMessage}`;
        const initialContent = `Some text before ${slackUrl}`;

        getMessageContentStub.resolves(testMessage);

        const document = await vscode.workspace.openTextDocument({
            content: initialContent,
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(document);
        
        // Correctly find the line of the URL for assertion, as the command does.
        let lineOfUrl = -1;
        for (let i = 0; i < document.lineCount; i++) {
            if (document.lineAt(i).text.includes(slackUrl)) {
                lineOfUrl = i;
                break;
            }
        }
        assert.notStrictEqual(lineOfUrl, -1, "Test setup error: Slack URL not found in document.");

        await vscode.commands.executeCommand('slackoscope.insertCommentedMessage', slackUrl);

        const editor = vscode.window.activeTextEditor;
        assert.ok(editor, 'No active text editor');
        const text = editor.document.getText();
        
        // Construct expected text based on where the comment will be inserted.
        const lines = initialContent.split('\n');
        lines.splice(lineOfUrl, 0, expectedComment); // Insert comment above the line with the URL
        const expectedText = lines.join('\n');

        assert.strictEqual(text.replace(/\r\n/g, '\n'), expectedText.replace(/\r\n/g, '\n'), 'Comment not inserted correctly when URL is at the end of a line.');
        assert.ok(getMessageContentStub.calledOnceWith(slackUrl), 'getMessageContent was not called correctly for URL at line end.');
    });

    test('Insert Commented Message - No URL in document', async () => {
        if (!getMessageContentStub) {
            assert.fail("getMessageContentStub was not initialized. Check SlackApi import and prototype.");
        }
        const slackUrl = 'https://nonexistent.slack.com/archives/NEVER/p0000000000000000';
        const testMessage = 'This message should not appear.';
    
        getMessageContentStub.resolves(testMessage);
    
        const initialContent = "This document does not contain the target Slack URL.";
        const document = await vscode.workspace.openTextDocument({
            content: initialContent,
            language: 'plaintext'
        });
        await vscode.window.showTextDocument(document);
    
        await vscode.commands.executeCommand('slackoscope.insertCommentedMessage', slackUrl);
    
        const editor = vscode.window.activeTextEditor;
        assert.ok(editor, 'No active text editor');
        const text = editor.document.getText();
    
        // The content should remain unchanged because the URL was not found.
        assert.strictEqual(text.replace(/\r\n/g, '\n'), initialContent.replace(/\r\n/g, '\n'), 'Document content should not change if URL is not found.');
        // getMessageContent should still be called as the command logic fetches content before trying to find the URL in the doc.
        // This might be a point of optimization in the main extension logic later, but for now, we test current behavior.
        assert.ok(getMessageContentStub.calledOnceWith(slackUrl), 'getMessageContent should still be called even if URL is not in the document.');
    });

});
suiteTeardown(() => {
    vscode.window.showInformationMessage('All tests done!');
});

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to wait for editor to be ready, if needed.
async function waitForEditor(documentUri: vscode.Uri) {
    let editor = vscode.window.activeTextEditor;
    let retries = 0;
    while ((!editor || editor.document.uri.toString() !== documentUri.toString()) && retries < 10) {
        await delay(100); // wait 100ms
        editor = vscode.window.activeTextEditor;
        retries++;
    }
    if (!editor || editor.document.uri.toString() !== documentUri.toString()) {
        throw new Error("Editor for the document did not become active.");
    }
    return editor;
}
// Note: The `waitForEditor` helper might be useful if tests are flaky due to editor activation timing.
// It's not explicitly used in the tests above but is good to keep in mind.
// The `delay` function is also provided for similar timing adjustments if necessary.
// Replaced direct use of SlackApi from '../../src/slackApi' to '../slackApi' for conventional path.
// Added a check for getMessageContentStub initialization at the start of each test.
// Added more specific error messages for assert.fail.
// Corrected path for SlackApi import.
// Added suiteSetup for one-time activation.
// Added more test cases: URL at start/end of line, URL not in document.
// Normalized line endings in assertions using .replace(/\r\n/g, '\n') for cross-platform compatibility.
// Ensured that in the "URL at the end of a line" test, the assertion correctly constructs the expected text
// by inserting the comment on a new line above the line containing the URL.
// Ensured `getConfigurationStub` correctly mocks all necessary methods of `WorkspaceConfiguration`.
// The test for "No URL in document" now correctly asserts that `getMessageContent` is still called,
// as per the current implementation of `insertCommentedMessage` which fetches the message before searching the document.
// This behavior might be subject to change for optimization, but tests should reflect current state.
// Corrected the SlackApi import path to `../slackApi` as it's more standard for files in the same `src` parent directory.
// Added `waitForEditor` and `delay` utilities (though not strictly integrated into every test yet, they are good patterns for VS Code extension testing).
// Added explicit check for `extension.isActive` before activating.
// Added a `suiteTeardown` message.
// Corrected the `getConfiguration` stub to provide a more complete mock of `vscode.WorkspaceConfiguration`.
// The `getMessageContentStub` is now correctly defined within the scope of the suite, and initialized in `setup`.
// The test for 'URL at the end of a line' was refined to correctly predict the outcome of inserting a comment block above the line.
// The test 'Insert Commented Message - No URL in document' assertion regarding `getMessageContentStub` call count was confirmed.
// It *is* called because the command fetches content first.
// The `setup` function correctly re-initializes stubs for each test, ensuring test isolation.
// `suiteSetup` is used for one-time extension activation.
// `teardown` handles sinon restoration and editor closing.The tests have been written to `src/test/extension.test.ts`.

suite('Hover Provider Tests', () => {
    let getMessageContentStub: sinon.SinonStub;
    let getConfigurationStub: sinon.SinonStub; // Keep this if your setup is per-suite, or manage in test-local setup

    setup(async () => { // Changed to async as showTextDocument is async
        // Mock vscode.workspace.getConfiguration to provide a dummy token
        getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns({
            get: (section: string) => {
                if (section === 'slackoscope.token' || section === 'token') {
                    return 'test-token'; // Provide a dummy token
                }
                return undefined;
            },
            has: () => true,
            inspect: () => undefined,
            update: async () => {}
        } as vscode.WorkspaceConfiguration);

        if (SlackApi && SlackApi.prototype) {
            getMessageContentStub = sinon.stub(SlackApi.prototype, 'getMessageContent');
        } else {
            console.error("SlackApi or SlackApi.prototype is not available for stubbing in Hover Provider Tests.");
            // This would ideally cause a test setup failure.
        }
    });

    teardown(async () => {
        sinon.restore();
        // Close the active editor if one was opened for the test
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('Should provide hover for valid Slack URL', async () => {
        if (!getMessageContentStub) {
            assert.fail("getMessageContentStub was not initialized for Hover Provider test.");
        }
        const slackUrl = 'https://example.slack.com/archives/C123/p1234567890123'; // Using a similar URL as other tests
        const hoverTestMessage = 'Hover test message content';
        getMessageContentStub.resolves(hoverTestMessage);

        const content = `This line contains a Slack URL: ${slackUrl} and some more text.`;
        const document = await vscode.workspace.openTextDocument({ content, language: 'plaintext' });
        await vscode.window.showTextDocument(document);

        const urlStartIndex = content.indexOf(slackUrl);
        // Create a position somewhere within the URL string
        const position = document.positionAt(urlStartIndex + 5); // e.g., 5 characters into the URL

        const hovers = await vscode.executeHoverProvider(document.uri, position) as vscode.Hover[];
        
        assert.ok(hovers && hovers.length > 0, 'Hover provider should return at least one hover.');
        
        const hover = hovers[0];
        assert.ok(hover.contents && hover.contents.length > 0, 'Hover should have contents.');
        
        const markdownString = hover.contents[0] as vscode.MarkdownString;
        const expectedMarkdownValue = `**Slack Message:** ${hoverTestMessage}\n\n[Insert Commented Message](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify(slackUrl))})`;
        
        assert.strictEqual(markdownString.value.replace(/\r\n/g, '\n'), expectedMarkdownValue.replace(/\r\n/g, '\n'), 'MarkdownString value is incorrect.');
        assert.ok(markdownString.isTrusted, 'MarkdownString should be trusted.');
        assert.ok(getMessageContentStub.calledOnceWith(slackUrl), 'getMessageContent was not called (or called multiple times) with the correct URL.');
    });

    test('Should not provide hover for non-Slack URL text', async () => {
        // Note: getMessageContentStub might be called if any part of the text accidentally matches regex,
        // but the hover provider itself should not return a hover.
        // We don't need to setup getMessageContentStub here as it shouldn't be relevant to the positive outcome.
        
        const content = 'This is just some regular text, no Slack URL here.';
        const document = await vscode.workspace.openTextDocument({ content, language: 'plaintext' });
        await vscode.window.showTextDocument(document);

        const position = new vscode.Position(0, 5); // Position within "is just"

        const hovers = await vscode.executeHoverProvider(document.uri, position) as vscode.Hover[];
        assert.ok(!hovers || hovers.length === 0, 'Hover provider should not return a hover for non-Slack URL text.');
        
        // Depending on implementation, getMessageContent might not be called if the regex for URL isn't matched at word range.
        // If it's guaranteed not to be called, you can assert:
        // assert.ok(getMessageContentStub.notCalled, 'getMessageContent should not have been called for non-Slack URL text.');
        // However, the current hover provider logic might call getWordRangeAtPosition first, and only proceed if SLACK_URL_REGEX matches.
        // So, if the regex doesn't match, getMessageContent won't be called.
        if (getMessageContentStub) { // Check if stub was created
             assert.ok(getMessageContentStub.notCalled, 'getMessageContent should not have been called for non-Slack URL text.');
        }
    });
});
