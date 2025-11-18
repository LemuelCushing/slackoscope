import * as assert from "assert"
import {findLinearIssues, extractLinearIssueFromMessage} from "../ui/formatting"

suite("Linear Integration Tests", () => {
  suite("findLinearIssues", () => {
    test("should find single Linear issue in text", () => {
      const text = "This is related to TST-123"
      const issues = findLinearIssues(text)

      assert.strictEqual(issues.length, 1)
      assert.strictEqual(issues[0], "TST-123")
    })

    test("should find multiple Linear issues in text", () => {
      const text = "This involves TST-123 and PRJ-456 and CORE-789"
      const issues = findLinearIssues(text)

      assert.strictEqual(issues.length, 3)
      assert.ok(issues.includes("TST-123"))
      assert.ok(issues.includes("PRJ-456"))
      assert.ok(issues.includes("CORE-789"))
    })

    test("should handle different issue key formats", () => {
      const testCases = [
        {text: "AB-1", expected: ["AB-1"]},
        {text: "ABC-123", expected: ["ABC-123"]},
        {text: "ABCD-9999", expected: ["ABCD-9999"]},
        {text: "ENGINEERING-42", expected: ["ENGINEERING-42"]}
      ]

      testCases.forEach(({text, expected}) => {
        const issues = findLinearIssues(text)
        assert.deepStrictEqual(issues, expected, `Failed for text: ${text}`)
      })
    })

    test("should not find lowercase issue keys", () => {
      const text = "This is not an issue: tst-123"
      const issues = findLinearIssues(text)

      assert.strictEqual(issues.length, 0)
    })

    test("should not find single letter prefixes", () => {
      const text = "This is not an issue: A-123"
      const issues = findLinearIssues(text)

      assert.strictEqual(issues.length, 0)
    })

    test("should deduplicate repeated issues", () => {
      const text = "TST-123 is related to TST-123 and TST-123"
      const issues = findLinearIssues(text)

      assert.strictEqual(issues.length, 1)
      assert.strictEqual(issues[0], "TST-123")
    })

    test("should find issues in URLs", () => {
      const text = "https://linear.app/company/issue/TST-123"
      const issues = findLinearIssues(text)

      assert.strictEqual(issues.length, 1)
      assert.strictEqual(issues[0], "TST-123")
    })

    test("should handle empty text", () => {
      const issues = findLinearIssues("")
      assert.strictEqual(issues.length, 0)
    })

    test("should handle text with no issues", () => {
      const text = "Just a regular message with no issues"
      const issues = findLinearIssues(text)
      assert.strictEqual(issues.length, 0)
    })
  })

  suite("extractLinearIssueFromMessage", () => {
    test("should extract issue from Linear Asks bot attachment", () => {
      const message = {
        text: "Issue created",
        bot_profile: {name: "Linear Asks"},
        attachments: [{from_url: "https://linear.app/company/issue/TST-10291"}]
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "TST-10291")
    })

    test("should extract issue from first Linear URL in multiple attachments", () => {
      const message = {
        text: "Multiple attachments",
        bot_profile: {name: "Linear Asks"},
        attachments: [
          {from_url: "https://example.com"},
          {from_url: "https://linear.app/company/issue/ABC-999"},
          {from_url: "https://linear.app/company/issue/XYZ-111"}
        ]
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "ABC-999")
    })

    test("should handle Linear Asks bot with no attachments", () => {
      const message = {
        text: "TST-500",
        bot_profile: {name: "Linear Asks"}
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "TST-500")
    })

    test("should handle Linear Asks bot with empty attachments array", () => {
      const message = {
        text: "TST-600",
        bot_profile: {name: "Linear Asks"},
        attachments: []
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "TST-600")
    })

    test("should handle Linear Asks bot with attachments but no from_url", () => {
      const message = {
        text: "TST-700",
        bot_profile: {name: "Linear Asks"},
        attachments: [{}]
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "TST-700")
    })

    test("should not extract from non-Linear bot messages", () => {
      const message = {
        text: "TST-123",
        bot_profile: {name: "Other Bot"}
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "TST-123")
    })

    test("should fallback to text search for regular messages", () => {
      const message = {
        text: "Check out PROJ-555 for details"
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "PROJ-555")
    })

    test("should return null when no Linear issues found", () => {
      const message = {
        text: "Regular message without Linear",
        bot_profile: {name: "Other Bot"}
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, null)
    })

    test("should handle message with no bot_profile", () => {
      const message = {
        text: "Message with ISSUE-123"
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "ISSUE-123")
    })

    test("should handle different Linear URL formats", () => {
      const testCases = [
        "https://linear.app/company/issue/TST-1",
        "https://linear.app/my-workspace/issue/PRJ-999",
        "https://linear.app/test-org/issue/CORE-42"
      ]

      testCases.forEach(url => {
        const message = {
          text: "Issue",
          bot_profile: {name: "Linear Asks"},
          attachments: [{from_url: url}]
        }

        const issueId = extractLinearIssueFromMessage(message)
        assert.ok(issueId, `Should extract issue from ${url}`)
        assert.ok(/^[A-Z]{2,}-\d+$/.test(issueId || ""), `Should match pattern for ${url}`)
      })
    })

    test("should prefer attachment URL over text when both present", () => {
      const message = {
        text: "Check TST-999 for details",
        bot_profile: {name: "Linear Asks"},
        attachments: [{from_url: "https://linear.app/company/issue/TST-123"}]
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "TST-123", "Should prefer attachment URL over text")
    })

    test("should handle malformed Linear URLs gracefully", () => {
      const message = {
        text: "TST-800",
        bot_profile: {name: "Linear Asks"},
        attachments: [{from_url: "https://linear.app/invalid-url"}]
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "TST-800", "Should fallback to text when URL is malformed")
    })
  })
})
