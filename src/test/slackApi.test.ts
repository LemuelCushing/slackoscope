import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { SlackApi, SLACK_URL_REGEX } from '../slackApi'; // Adjusted path
import { WebClient } from '@slack/web-api'; // For typing and stubbing client methods

suite('SlackApi Unit Tests', () => {
    let getConfigurationStub: sinon.SinonStub;

    setup(() => {
        // Stub vscode.workspace.getConfiguration to provide a dummy token
        getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns({
            get: (section: string) => {
                if (section === 'slackoscope.token' || section === 'token') {
                    return 'test-api-token';
                }
                return undefined;
            },
            has: (section: string) => section === 'slackoscope.token' || section === 'token',
            inspect: (section: string) => undefined, // Provide a basic mock for inspect
            update: async (section: string, value: any, configurationTarget?: vscode.ConfigurationTarget | boolean) => {} // Basic mock for update
        } as vscode.WorkspaceConfiguration);
    });

    teardown(() => {
        sinon.restore();
    });

    suite('Constructor', () => {
        test('should throw error if token is not found', () => {
            // Override the stub for this specific test
            getConfigurationStub.returns({
                get: (section: string) => undefined, // No token
                has: (section: string) => false,
                inspect: (section: string) => undefined,
                update: async (section: string, value: any, configurationTarget?: vscode.ConfigurationTarget | boolean) => {}
            } as vscode.WorkspaceConfiguration);
            assert.throws(() => new SlackApi(), Error, 'Slack API token not found. Please set it in the extension settings.');
        });

        test('should create WebClient with token if found', () => {
            const slackApi = new SlackApi();
            assert.ok(slackApi['client'] instanceof WebClient, 'WebClient should be instantiated');
        });
    });

    suite('parseSlackUrl', () => {
        // Instance of SlackApi created here will use the global getConfigurationStub
        let slackApi: SlackApi;
        setup(() => {
            slackApi = new SlackApi();
        });

        test('should parse valid Slack URL correctly', () => {
            const url = 'https://myorg.slack.com/archives/C12345678/p1609459200123456';
            const expectedChannel = 'C12345678';
            const expectedTs = '1609459200.123456';
            const result = (slackApi as any).parseSlackUrl(url);
            assert.strictEqual(result.channel, expectedChannel);
            assert.strictEqual(result.ts, expectedTs);
        });

        test('should parse another valid Slack URL with different TLD', () => {
            const url = 'https://another-workspace.slack.org/archives/D987ZYXW0/p1701234567000001';
            const expectedChannel = 'D987ZYXW0';
            const expectedTs = '1701234567.000001';
            const result = (slackApi as any).parseSlackUrl(url);
            assert.strictEqual(result.channel, expectedChannel);
            assert.strictEqual(result.ts, expectedTs);
        });

        const invalidUrls = [
            'http://myorg.slack.com/archives/C12345678/p1609459200123456', // wrong protocol
            'https://myorg.slack.com/archives/C12345678/', // missing timestamp
            'https://myorg.slack.com/archives/p1609459200123456', // missing channel
            'https://myorg.slack.com/C12345678/p1609459200123456', // wrong path structure
            'https://github.com/LemuelCushing/slackoscope', // completely different URL
            'https://myorg.slack.com/archives/C123/pINVALIDTS' // invalid timestamp part
        ];

        invalidUrls.forEach(invalidUrl => {
            test(`should throw error for invalid Slack URL: ${invalidUrl}`, () => {
                assert.throws(() => (slackApi as any).parseSlackUrl(invalidUrl), 
                              (error: any) => {
                                  assert.ok(error instanceof Error, 'Error type is incorrect');
                                  assert.strictEqual(error.message, 'Invalid Slack URL', 'Error message is incorrect');
                                  return true;
                              });
            });
        });
    });

    suite('getMessageContent', () => {
        let slackApi: SlackApi;
        let historyStub: sinon.SinonStub;
        const validSlackUrl = 'https://myorg.slack.com/archives/C123ABC/p1609459200000123';
        const parsedUrl = { channel: 'C123ABC', ts: '1609459200.000123' }; // Pre-calculate for assertion

        setup(() => {
            slackApi = new SlackApi();
            // Stub the conversations.history method on the client instance
            // Ensure 'client' is a property on SlackApi and it has a 'conversations' object with 'history'
            if (slackApi['client'] && slackApi['client'].conversations) {
                 historyStub = sinon.stub(slackApi['client'].conversations, 'history');
            } else {
                // This case should ideally not happen if SlackApi constructor works as expected
                // and WebClient structure is as anticipated.
                console.error("Failed to stub slackApi.client.conversations.history: client or conversations object not found.");
                // We can throw an error here to make test setup failure more obvious
                assert.fail("Critical test setup failure: slackApi.client.conversations.history could not be stubbed.");
            }
        });

        test('should return message text on successful fetch', async () => {
            if (!historyStub) assert.fail("historyStub not initialized");
            const expectedMessage = 'Hello Slack, this is a test message!';
            historyStub.resolves({
                ok: true,
                messages: [{ text: expectedMessage, ts: parsedUrl.ts }],
                channel: parsedUrl.channel
            });

            const message = await slackApi.getMessageContent(validSlackUrl);
            assert.strictEqual(message, expectedMessage);
            sinon.assert.calledOnceWithExactly(historyStub, {
                channel: parsedUrl.channel,
                latest: parsedUrl.ts,
                inclusive: true,
                limit: 1
            });
        });

        test('should return "No message found." if messages array is empty', async () => {
            if (!historyStub) assert.fail("historyStub not initialized");
            historyStub.resolves({
                ok: true,
                messages: [],
                channel: parsedUrl.channel
            });

            const message = await slackApi.getMessageContent(validSlackUrl);
            assert.strictEqual(message, 'No message found.');
            sinon.assert.calledOnceWithExactly(historyStub, {
                channel: parsedUrl.channel,
                latest: parsedUrl.ts,
                inclusive: true,
                limit: 1
            });
        });

        test('should return "No message content found." if message has no text field', async () => {
            if (!historyStub) assert.fail("historyStub not initialized");
            historyStub.resolves({
                ok: true,
                messages: [{ user: 'U123XYZ', ts: parsedUrl.ts }], // No 'text' field
                channel: parsedUrl.channel
            });

            const message = await slackApi.getMessageContent(validSlackUrl);
            assert.strictEqual(message, 'No message content found.');
            sinon.assert.calledOnceWithExactly(historyStub, {
                channel: parsedUrl.channel,
                latest: parsedUrl.ts,
                inclusive: true,
                limit: 1
            });
        });
        
        test('should return "No message found." if result.messages is undefined', async () => {
            if (!historyStub) assert.fail("historyStub not initialized");
            historyStub.resolves({
                ok: true,
                // messages: undefined, // Simulating messages property being absent
                channel: parsedUrl.channel
            });
        
            const message = await slackApi.getMessageContent(validSlackUrl);
            assert.strictEqual(message, 'No message found.');
            sinon.assert.calledOnceWithExactly(historyStub, {
                channel: parsedUrl.channel,
                latest: parsedUrl.ts,
                inclusive: true,
                limit: 1
            });
        });

        test('should return "Error fetching Slack message." if API call fails', async () => {
            if (!historyStub) assert.fail("historyStub not initialized");
            const apiError = new Error('Slack API Network Error');
            historyStub.rejects(apiError);

            const consoleErrorSpy = sinon.spy(console, 'error');

            const message = await slackApi.getMessageContent(validSlackUrl);
            assert.strictEqual(message, 'Error fetching Slack message.');
            sinon.assert.calledOnceWithExactly(historyStub, {
                channel: parsedUrl.channel,
                latest: parsedUrl.ts,
                inclusive: true,
                limit: 1
            });
            sinon.assert.calledWith(consoleErrorSpy, 'Error fetching Slack message:', apiError);
            consoleErrorSpy.restore();
        });

        test('should throw error if URL is invalid (checked by parseSlackUrl)', async () => {
            if (!historyStub) assert.fail("historyStub not initialized");
            const invalidUrl = 'this-is-not-a-slack-url';
            // getMessageContent internally calls parseSlackUrl, which will throw an error.
            // The error thrown by parseSlackUrl is not caught by getMessageContent's try-catch block.
            // This test verifies that behavior.
            try {
                await slackApi.getMessageContent(invalidUrl);
                assert.fail('Expected getMessageContent to throw for invalid URL, but it did not.');
            } catch (error: any) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Invalid Slack URL');
            }
            // Ensure historyStub was not called because parsing failed first
            sinon.assert.notCalled(historyStub);
        });
    });
});
