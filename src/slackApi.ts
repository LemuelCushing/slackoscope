// ============================================================================
// SLACKAPI.TS - Slack API Integration
// ============================================================================
// This file handles all communication with the Slack API
// Think: A Rails service object or API client class
//
// KEY CONCEPTS FOR RAILS DEVELOPERS:
// - This is like a Rails service: app/services/slack_service.rb
// - Uses native fetch() API (like HTTParty or Faraday in Rails)
// - Async/await pattern for API calls (non-blocking)
// - URL parsing with regex (similar to Ruby's URI.parse)
// - Error handling with try/catch (like rescue in Ruby)
// ============================================================================

// IMPORTS
import * as vscode from "vscode"
// Import VS Code API to access user configuration (settings)
// Like: require 'vscode' in Ruby

import {URLSearchParams} from "url"
// Import URLSearchParams for building URL-encoded request bodies
// Like: require 'uri' in Ruby
// URLSearchParams creates "key1=value1&key2=value2" format

// ============================================================================
// SLACK URL REGEX PATTERN
// ============================================================================
// This regex matches Slack message URLs and extracts the channel ID and timestamp
//
// REGEX BREAKDOWN:
// https:\/\/                      = Literal "https://" (\/ escapes the /)
// [a-zA-Z0-9-]+                   = Workspace name (e.g., "myworkspace")
// \.slack\.com                    = Literal ".slack.com"
// \/archives\/                    = Literal "/archives/"
// ([A-Z0-9]+)                     = Capture group 1: Channel ID (e.g., "C1234ABCD")
// \/p                             = Literal "/p"
// (\d+)                           = Capture group 2: Timestamp (e.g., "1234567890123456")
//
// EXAMPLE URL:
// https://myworkspace.slack.com/archives/C1234ABCD/p1234567890123456
//                                          ^^^^^^^^^   ^^^^^^^^^^^^^^^^
//                                          Channel ID  Timestamp
//
// CAPTURE GROUPS:
// match[0] = full URL
// match[1] = channel ID (C1234ABCD)
// match[2] = timestamp (1234567890123456)
//
// Ruby equivalent:
//   SLACK_URL_REGEX = %r{https://[a-zA-Z0-9-]+\.slack\.com/archives/([A-Z0-9]+)/p(\d+)}
//
// export = make this available to other files
// const = cannot be reassigned
// ============================================================================
export const SLACK_URL_REGEX = /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)/

// ============================================================================
// SLACKAPI CLASS
// ============================================================================
// Handles fetching Slack messages via the Slack API
//
// This is like a Rails service object:
//   class SlackService
//     def initialize
//       @token = ENV['SLACK_TOKEN']
//     end
//
//     def get_message_content(url)
//       # Make API call
//     end
//   end
// ============================================================================
export class SlackApi {
  // PRIVATE READONLY PROPERTY
  // private = only accessible within this class
  // readonly = cannot be changed after constructor
  // Like: Ruby's attr_reader (getter only, no setter)
  //
  // Type annotation: string = must be a string
  private readonly token: string

  // CONSTRUCTOR
  // Called when you do: new SlackApi()
  // Ruby equivalent: def initialize
  //
  // NO PARAMETERS: Unlike most constructors, this one takes no arguments
  // It reads the Slack token from VS Code settings instead
  constructor() {
    // GET SLACK TOKEN FROM VS CODE SETTINGS
    // This reads the user's configuration (File → Preferences → Settings)
    //
    // BREAKDOWN:
    // vscode.workspace = access to workspace (project) settings
    // .getConfiguration("slackoscope") = get all "slackoscope.*" settings
    // .get<string>("token") = get the "slackoscope.token" setting as a string
    //   - <string> = type parameter (tells TypeScript we expect a string)
    //   - returns: string | undefined (might not be set)
    // ?? "" = nullish coalescing operator
    //   - If left side is null/undefined, use right side ("")
    //   - Like: config.get("token") || "" in Ruby
    //
    // Ruby equivalent:
    //   @token = ENV['SLACK_TOKEN'] || ''
    //
    // WHY READ FROM SETTINGS?
    // - Security: Token is stored in VS Code settings (can be workspace-specific)
    // - Flexibility: Users can change it without recompiling the extension
    // - Convention: This is the standard way for VS Code extensions
    this.token = vscode.workspace.getConfiguration("slackoscope").get<string>("token") ?? ""
  }

  // ============================================================================
  // GET MESSAGE CONTENT METHOD
  // ============================================================================
  // Fetches a Slack message by its URL
  //
  // ASYNC/AWAIT EXPLAINED:
  // - async = this method returns a Promise<string>
  // - Promise = "I promise to give you a value later"
  // - await = wait for a Promise to resolve before continuing
  //
  // WHY ASYNC?
  // - API calls take time (network latency)
  // - JavaScript is single-threaded
  // - We don't want to block the UI while waiting
  //
  // Ruby equivalent (without async):
  //   def get_message_content(url)
  //     channel, ts = parse_slack_url(url)
  //     response = HTTP.post("https://slack.com/api/conversations.history", ...)
  //     JSON.parse(response.body)["messages"][0]["text"]
  //   end
  //
  // PARAMETERS:
  // - url: string = the Slack message URL (must be a string)
  //
  // RETURNS:
  // - Promise<string> = a promise that resolves to a string
  // - In practice: the message text or an error message
  //
  // ERROR HANDLING:
  // - Never throws exceptions (catches all errors)
  // - Returns user-friendly error messages instead
  // - This is better UX than crashing the extension
  // ============================================================================
  async getMessageContent(url: string): Promise<string> {
    // TRY/CATCH BLOCK
    // Like: begin/rescue in Ruby
    // Catches any errors that occur inside
    try {
      // CHECK IF TOKEN IS CONFIGURED
      // !this.token = falsy check (empty string is falsy)
      // Like: if @token.blank? in Rails
      if (!this.token) {
        // Return error message (doesn't throw, just returns a string)
        return "Slack API token not configured. Please set it in the extension settings."
      }

      // PARSE THE SLACK URL
      // Extract channel ID and timestamp from the URL
      // Like: channel, ts = parse_slack_url(url) in Ruby
      //
      // DESTRUCTURING ASSIGNMENT:
      // const {channel, ts} = ... extracts properties from the returned object
      //
      // If parseSlackUrl returns: {channel: "C123", ts: "1234567890.123456"}
      // Then: channel = "C123", ts = "1234567890.123456"
      //
      // Ruby equivalent:
      //   result = parse_slack_url(url)
      //   channel = result[:channel]
      //   ts = result[:ts]
      const {channel, ts} = this.parseSlackUrl(url)

      // BUILD REQUEST PARAMETERS
      // URLSearchParams creates URL-encoded body: "key1=value1&key2=value2"
      //
      // PARAMETERS:
      // - channel: Channel ID (e.g., "C1234ABCD")
      // - latest: Timestamp to fetch (e.g., "1234567890.123456")
      // - inclusive: "true" = include the message at the exact timestamp
      // - limit: "1" = only fetch one message
      //
      // Ruby equivalent:
      //   params = {
      //     channel: channel,
      //     latest: ts,
      //     inclusive: "true",
      //     limit: "1"
      //   }.to_query
      //
      // RESULT: "channel=C1234ABCD&latest=1234567890.123456&inclusive=true&limit=1"
      const params = new URLSearchParams({channel, latest: ts, inclusive: "true", limit: "1"})

      // MAKE API REQUEST
      // fetch() is the native JavaScript HTTP client (like HTTParty in Rails)
      //
      // FIRST PARAMETER: URL to request
      // SECOND PARAMETER: Options object
      //   - method: "POST" = HTTP POST request
      //   - headers: HTTP headers
      //     - Authorization: Bearer token (standard OAuth 2.0 format)
      //   - body: Request body (the URL-encoded parameters)
      //
      // await = wait for the request to complete
      // Without await, we'd get a Promise<Response> instead of a Response
      //
      // Ruby equivalent:
      //   res = HTTParty.post(
      //     "https://slack.com/api/conversations.history",
      //     headers: { "Authorization" => "Bearer #{@token}" },
      //     body: params
      //   )
      const res = await fetch("https://slack.com/api/conversations.history", {
        method: "POST",
        headers: {Authorization: `Bearer ${this.token}`},
        body: params
      })

      // PARSE JSON RESPONSE
      // res.json() returns a Promise, so we await it
      //
      // TYPE ANNOTATION:
      // (await res.json()) as {ok: boolean; error?: string; messages?: {text?: string}[]}
      //
      // BREAKDOWN:
      // - as {...} = type assertion (tells TypeScript what shape the data has)
      // - ok: boolean = required boolean property
      // - error?: string = optional string property (? = might not exist)
      // - messages?: {...}[] = optional array of objects
      //   - {text?: string}[] = array of objects with optional text property
      //
      // WHY TYPE ASSERTION?
      // - res.json() returns Promise<any> (TypeScript doesn't know the shape)
      // - We tell TypeScript what to expect for better type checking
      //
      // Ruby equivalent:
      //   data = JSON.parse(res.body)
      //
      // DESTRUCTURING:
      // const {ok, error, messages} = ... extracts properties
      // - ok = data.ok
      // - error = data.error (might be undefined)
      // - messages = data.messages (might be undefined)
      const {ok, error, messages} = (await res.json()) as {ok: boolean; error?: string; messages?: {text?: string}[]}

      // CHECK IF API CALL SUCCEEDED
      // Slack API always returns ok: true or ok: false
      if (!ok) {
        // Log error to Debug Console (for debugging)
        // Like: Rails.logger.error "Slack API error: #{error}"
        console.error("Slack API error:", error)

        // Return user-friendly error message
        return "Error fetching Slack message."
      }

      // EXTRACT MESSAGE TEXT
      // OPTIONAL CHAINING (?.) EXPLAINED:
      // - messages?.[0] = safely access first element
      //   - If messages is undefined/null, returns undefined (doesn't crash)
      //   - If messages is an array, returns messages[0]
      // - ?.[0]?.text = safely access text property
      //   - If messages[0] is undefined/null, returns undefined
      //   - If messages[0] exists, returns messages[0].text
      //
      // Ruby equivalent:
      //   text = messages&.[](0)&.text
      //   # Or: text = messages.try(:[], 0).try(:text)
      //
      // WHY OPTIONAL CHAINING?
      // - Safely handle missing data without try/catch
      // - More concise than nested if statements
      // - Returns undefined if any part is null/undefined
      const text = messages?.[0]?.text

      // RETURN MESSAGE TEXT OR FALLBACK
      // if (text) return text = if text exists and is not empty, return it
      // otherwise, return fallback message
      //
      // Ruby equivalent:
      //   return text if text.present?
      //   return messages&.any? ? "No message content found." : "No message found."
      if (text) return text

      // TERNARY OPERATOR: condition ? valueIfTrue : valueIfFalse
      // Like: messages&.any? ? "No message content found." : "No message found."
      return messages?.length ? "No message content found." : "No message found."

      // POSSIBLE RETURN VALUES:
      // 1. The message text (success)
      // 2. "No message content found." (message exists but has no text)
      // 3. "No message found." (no messages in response)
    } catch (err) {
      // CATCH BLOCK: Handles any errors thrown in the try block
      // Like: rescue StandardError => err in Ruby
      //
      // ERRORS THIS MIGHT CATCH:
      // - Network errors (no internet, DNS failure)
      // - JSON parsing errors (invalid response)
      // - URL parsing errors (invalid Slack URL)

      // Log error to Debug Console (for debugging)
      // console.error = logs with red error styling
      console.error("Network or parsing error:", err)

      // Return user-friendly error message
      // We don't throw the error up to the caller
      // This prevents the extension from crashing on API failures
      return "Error fetching Slack message."
    }
  }

  // ============================================================================
  // PARSE SLACK URL METHOD
  // ============================================================================
  // Extracts channel ID and timestamp from a Slack URL
  //
  // PRIVATE METHOD:
  // - Only accessible within this class
  // - Like: private def parse_slack_url in Ruby
  //
  // PARAMETERS:
  // - url: string = the Slack URL
  //
  // RETURNS:
  // - {channel: string, ts: string} = object with two properties
  //   - channel: The channel ID (e.g., "C1234ABCD")
  //   - ts: The timestamp (e.g., "1234567890.123456")
  //
  // Ruby equivalent:
  //   private
  //
  //   def parse_slack_url(url)
  //     match = url.match(SLACK_URL_REGEX)
  //     raise "Invalid Slack URL" unless match
  //     { channel: match[1], ts: format_timestamp(match[2]) }
  //   end
  // ============================================================================
  private parseSlackUrl(url: string) {
    // MATCH URL AGAINST REGEX
    // url.match(regex) returns:
    // - An array of matches if successful
    // - null if no match
    //
    // MATCH ARRAY STRUCTURE:
    // [0] = full match (entire URL)
    // [1] = first capture group (channel ID)
    // [2] = second capture group (timestamp)
    //
    // Ruby equivalent:
    //   match = url.match(SLACK_URL_REGEX)
    const match = url.match(SLACK_URL_REGEX)

    // CHECK IF URL IS VALID
    // If match is null, throw an error
    // Like: raise "Invalid Slack URL" unless match
    //
    // THROW VS RETURN ERROR STRING:
    // - We throw here because this is a private method
    // - The public method (getMessageContent) catches and handles the error
    // - This separates validation logic from error handling
    if (!match) throw new Error("Invalid Slack URL")

    // EXTRACT CAPTURE GROUPS
    // DESTRUCTURING WITH SKIP:
    // const [, channel, tsRaw] = match
    // - First comma skips match[0] (we don't need the full URL)
    // - channel = match[1] (channel ID)
    // - tsRaw = match[2] (raw timestamp)
    //
    // Ruby equivalent:
    //   _, channel, ts_raw = match.to_a
    const [, channel, tsRaw] = match

    // RETURN OBJECT
    // This is object literal shorthand in JavaScript:
    //   {channel, ts: ...} is the same as {channel: channel, ts: ...}
    //
    // TIMESTAMP CONVERSION:
    // Slack URLs use a timestamp format without the decimal point
    // URL format: 1234567890123456 (16 digits)
    // API format: 1234567890.123456 (10 digits . 6 digits)
    //
    // CONVERSION STEPS:
    // 1. parseInt(tsRaw, 10) = convert string to integer (base 10)
    //    - "1234567890123456" → 1234567890123456
    // 2. / 1e6 = divide by 1,000,000 (same as / 1000000)
    //    - 1234567890123456 / 1000000 = 1234567890.123456
    // 3. .toString() = convert back to string
    //    - 1234567890.123456 → "1234567890.123456"
    //
    // WHY?
    // - Slack stores timestamps as Unix time with microseconds
    // - URLs encode this as a single integer (no decimal)
    // - API expects the decimal format
    //
    // Ruby equivalent:
    //   {
    //     channel: channel,
    //     ts: (ts_raw.to_i / 1_000_000.0).to_s
    //   }
    return {channel, ts: (parseInt(tsRaw, 10) / 1e6).toString()}
  }
}
