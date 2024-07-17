import { WebClient } from '@slack/web-api';
import * as vscode from 'vscode';

export const SLACK_URL_REGEX = /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)/;

export class SlackApi {
    private client: WebClient;

    constructor() {
        const token = vscode.workspace.getConfiguration('slackoscope').get('token');
        if (!token) {
            throw new Error('Slack API token not found. Please set it in the extension settings.');
        }
        this.client = new WebClient(token as string);
    }

    async getMessageContent(url: string): Promise<string> {
        const { channel, ts } = this.parseSlackUrl(url);
        try {
            const result = await this.client.conversations.history({
                channel: channel,
                latest: ts,
                inclusive: true,
                limit: 1
            });

            if (result.messages && result.messages.length > 0) {
                return result.messages[0].text || 'No message content found.';
            } else {
                return 'No message found.';
            }
        } catch (error) {
            console.error('Error fetching Slack message:', error);
            return 'Error fetching Slack message.';
        }
    }

    private parseSlackUrl(url: string): { channel: string; ts: string } {
        const match = url.match(SLACK_URL_REGEX);
        if (!match || match.length !== 3) {
            throw new Error('Invalid Slack URL');
        }
        const [, channel, timestamp] = match;
        return {
            channel,
            ts: (parseInt(timestamp) / 1000000).toString()
        };
    }
}
