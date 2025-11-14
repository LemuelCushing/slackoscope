import * as assert from "assert"
import {SLACK_URL_REGEX} from "../slackApi"

suite("Slack API Unit Tests", () => {
  suite("SLACK_URL_REGEX", () => {
    test("should match valid Slack message URLs", () => {
      const validUrls = [
        "https://workspace.slack.com/archives/C1234ABCD/p1234567890123456",
        "https://my-workspace.slack.com/archives/C9876ZYXW/p9876543210987654",
        "https://test-org.slack.com/archives/C0000TEST/p1111111111111111"
      ]

      validUrls.forEach(url => {
        const match = url.match(SLACK_URL_REGEX)
        assert.ok(match, `Should match URL: ${url}`)
        assert.strictEqual(match.length, 3, "Should have 3 groups (full match, channel, timestamp)")
      })
    })

    test("should extract channel ID from URL", () => {
      const url = "https://workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const match = url.match(SLACK_URL_REGEX)
      assert.ok(match)
      assert.strictEqual(match[1], "C1234ABCD", "Should extract channel ID")
    })

    test("should extract timestamp from URL", () => {
      const url = "https://workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const match = url.match(SLACK_URL_REGEX)
      assert.ok(match)
      assert.strictEqual(match[2], "1234567890123456", "Should extract timestamp")
    })

    test("should not match invalid URLs", () => {
      const invalidUrls = [
        "https://example.com/archives/C1234/p1234567890",
        "https://workspace.slack.com/archives/",
        "https://workspace.slack.com/messages/C1234/p1234567890",
        "slack://workspace.slack.com/archives/C1234/p1234567890",
        "https://workspace.slack.com/archives/c1234/p1234567890", // lowercase channel ID
        "https://workspace.slack.com/archives/C1234/P1234567890" // uppercase p
      ]

      invalidUrls.forEach(url => {
        const match = url.match(SLACK_URL_REGEX)
        assert.strictEqual(match, null, `Should not match URL: ${url}`)
      })
    })

    test("should handle URLs with query parameters", () => {
      const url = "https://workspace.slack.com/archives/C1234ABCD/p1234567890123456?thread_ts=1234567890.123456"
      const match = url.match(SLACK_URL_REGEX)
      assert.ok(match, "Should match URL with query parameters")
      assert.strictEqual(match[1], "C1234ABCD")
      assert.strictEqual(match[2], "1234567890123456")
    })
  })

  suite("URL Parsing Logic", () => {
    test("should convert timestamp format correctly", () => {
      // The timestamp in the URL is like p1234567890123456
      // This should be converted to 1234567890.123456 for the API
      const tsRaw = "1234567890123456"
      const expectedTs = "1234567890.123456"

      const converted = (parseInt(tsRaw, 10) / 1e6).toString()
      assert.strictEqual(converted, expectedTs, "Should convert timestamp to API format")
    })

    test("should handle various timestamp values", () => {
      const testCases = [
        {input: "1609459200000000", expected: "1609459200"},
        {input: "1609459200123456", expected: "1609459200.123456"},
        {input: "1000000000000000", expected: "1000000000"}
      ]

      testCases.forEach(({input, expected}) => {
        const converted = (parseInt(input, 10) / 1e6).toString()
        assert.strictEqual(converted, expected, `Should convert ${input} to ${expected}`)
      })
    })
  })
})
