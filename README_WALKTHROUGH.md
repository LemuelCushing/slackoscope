# Slackoscope: A Complete Walkthrough for Rails Developers

This guide will help you understand this VS Code extension if you're coming from a Rails background. We'll explain TypeScript concepts by comparing them to Ruby/Rails equivalents you already know.

## 📚 Table of Contents

1. [Quick Overview](#quick-overview)
2. [Key Concepts: TypeScript vs Ruby](#key-concepts-typescript-vs-ruby)
3. [Project Structure](#project-structure)
4. [The Build System](#the-build-system)
5. [Step-by-Step Code Walkthrough](#step-by-step-code-walkthrough)
6. [Development Workflow](#development-workflow)
7. [Common Patterns Explained](#common-patterns-explained)
8. [Testing](#testing)

---

## Quick Overview

**What this extension does:** Shows Slack messages inline in VS Code when you hover over Slack URLs in your code.

**Tech Stack Comparison:**

| This Project | Rails Equivalent | Notes |
|--------------|------------------|-------|
| TypeScript | Ruby | Compiled language with types |
| esbuild | Sprockets/Asset Pipeline | Bundles code for distribution |
| npm | bundler/gem | Package manager |
| package.json | Gemfile + gemspec | Dependencies + metadata |
| tsconfig.json | .ruby-version + rubocop.yml | TypeScript config |
| VS Code Extension API | Rails Engine | Plugin system |

---

## Key Concepts: TypeScript vs Ruby

### 1. Type Annotations

**TypeScript:**
```typescript
// You must declare types for variables and function parameters
const name: string = "John"
const age: number = 30
const isActive: boolean = true

function greet(name: string): string {
  return `Hello, ${name}`
}
```

**Ruby equivalent:**
```ruby
# Ruby doesn't require type declarations
name = "John"
age = 30
is_active = true

def greet(name)
  "Hello, #{name}"
end
```

**Why TypeScript does this:** Catches errors at compile time before your code runs. It's like having RSpec type checks built into the language.

### 2. Interfaces

**TypeScript:**
```typescript
// Like a contract that defines what properties an object must have
interface User {
  name: string
  email: string
  age?: number  // The ? means optional
}

const user: User = {
  name: "John",
  email: "john@example.com"
}
```

**Ruby equivalent:**
```ruby
# Ruby doesn't have interfaces, but you might use a class or duck typing
class User
  attr_accessor :name, :email, :age
end

user = User.new
user.name = "John"
user.email = "john@example.com"
```

### 3. Async/Await vs Callbacks

**TypeScript (this codebase):**
```typescript
// async/await makes asynchronous code look synchronous
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  const data = await response.json()
  return data
}

// Call it:
const user = await fetchUser("123")
```

**Ruby equivalent:**
```ruby
# Ruby is mostly synchronous, but similar to this:
def fetch_user(id)
  response = HTTP.get("/api/users/#{id}")
  JSON.parse(response.body)
end

user = fetch_user("123")
```

**Key difference:** TypeScript needs `async`/`await` because JavaScript is single-threaded and uses an event loop. Ruby can block the thread.

### 4. Promises

**TypeScript:**
```typescript
// A Promise represents a value that might not be available yet
// Like saying "I promise to give you data later"
function getData(): Promise<string> {
  return fetch("/api/data").then(res => res.text())
}

// Better with async/await:
async function getData(): Promise<string> {
  const res = await fetch("/api/data")
  return res.text()
}
```

**Ruby equivalent:**
```ruby
# Ruby doesn't have promises, but you might use Threads:
def get_data
  Thread.new do
    # fetch data
  end
end

thread = get_data
result = thread.value  # Wait for thread to finish
```

### 5. Import/Export vs Require

**TypeScript (this codebase):**
```typescript
// export makes things available to other files
export class SlackApi { }
export const SLACK_URL_REGEX = /pattern/

// import brings them in
import { SlackApi, SLACK_URL_REGEX } from "./slackApi"
```

**Ruby equivalent:**
```ruby
# In slack_api.rb
class SlackApi
end
SLACK_URL_REGEX = /pattern/

# In another file
require_relative './slack_api'
# Everything is automatically available
```

**Key difference:** TypeScript requires explicit exports/imports. Ruby makes everything in a required file available.

### 6. Arrow Functions

**TypeScript:**
```typescript
// These are equivalent:
function add(a: number, b: number): number {
  return a + b
}

const add = (a: number, b: number): number => {
  return a + b
}

// Short form (implicit return):
const add = (a: number, b: number): number => a + b
```

**Ruby equivalent:**
```ruby
# These are similar:
def add(a, b)
  a + b
end

add = ->(a, b) { a + b }  # Lambda
add = proc { |a, b| a + b }  # Proc
```

### 7. Classes and Constructors

**TypeScript:**
```typescript
class User {
  // Properties must be declared
  private name: string
  private email: string

  // Constructor is called when creating new instance
  constructor(name: string, email: string) {
    this.name = name
    this.email = email
  }

  greet(): string {
    return `Hello, ${this.name}`
  }
}

const user = new User("John", "john@example.com")
```

**Ruby equivalent:**
```ruby
class User
  attr_reader :name, :email

  def initialize(name, email)
    @name = name
    @email = email
  end

  def greet
    "Hello, #{@name}"
  end
end

user = User.new("John", "john@example.com")
```

### 8. Generics (Type Parameters)

**TypeScript:**
```typescript
// Generics let you create reusable code that works with multiple types
// Like Ruby's duck typing, but with type safety

// Map<string, string> means:
// - Keys must be strings
// - Values must be strings
const cache = new Map<string, string>()
cache.set("key", "value")  // ✓ OK
cache.set("key", 123)      // ✗ Error: 123 is not a string

// Array<User> means: array that only contains User objects
const users: Array<User> = []
```

**Ruby equivalent:**
```ruby
# Ruby doesn't have generics, you can put anything anywhere:
cache = {}
cache["key"] = "value"  # OK
cache["key"] = 123      # Also OK

users = []
users << User.new       # OK
users << "not a user"   # Also OK (might cause bugs later)
```

---

## Project Structure

```
slackoscope/
├── src/                          # Source code (like app/ in Rails)
│   ├── extension.ts              # Main entry point (like application.rb)
│   ├── slackApi.ts               # Handles Slack API calls (like a service object)
│   ├── inlineDecorationManager.ts # Manages inline message display
│   └── test/                     # Tests (like spec/)
│       └── extension.test.ts
│
├── dist/                         # Compiled output (like public/assets/)
│   └── extension.js              # Bundled, compiled code
│
├── node_modules/                 # Dependencies (like vendor/bundle/)
│
├── package.json                  # Gemfile + gemspec combined
├── package-lock.json             # Gemfile.lock equivalent
├── tsconfig.json                 # TypeScript compiler config
├── esbuild.js                    # Build script (like rake assets:precompile)
│
└── .vscode/                      # VS Code workspace settings
    ├── launch.json               # Debugging configuration
    ├── tasks.json                # Build tasks
    └── settings.json             # Project settings
```

### How Files Relate to Each Other

```
extension.ts (main controller)
    ↓
    ├─→ slackApi.ts (makes API calls)
    └─→ inlineDecorationManager.ts (renders UI)
```

**Rails equivalent:**
```
ApplicationController
    ↓
    ├─→ SlackService (API calls)
    └─→ SlackDecorator (presentation logic)
```

---

## The Build System

### Why We Need a Build Step

Rails runs Ruby code directly. TypeScript needs to be **compiled** to JavaScript first.

**The Flow:**

```
1. You write:          src/extension.ts (TypeScript)
                              ↓
2. esbuild compiles:   dist/extension.js (JavaScript)
                              ↓
3. VS Code runs:       The compiled JavaScript
```

### Build Commands Explained

```bash
# Development mode (compile + watch for changes)
npm run watch
# Like: rails server (auto-reloads)

# Production build (optimized and minified)
npm run package
# Like: RAILS_ENV=production rails assets:precompile

# Type checking only (no output files)
npm run check-types
# Like: rubocop --only Layout

# Run tests
npm test
# Like: rspec
```

### What esbuild Does (simplified)

```javascript
// esbuild reads this:
import { SlackApi } from "./slackApi"

// And turns it into a single file with everything bundled:
// (like Rails asset pipeline combines all JS files)
```

---

## Step-by-Step Code Walkthrough

### 1. How the Extension Starts (`extension.ts`)

**The activate function is the entry point** (like Rails `config/application.rb` startup):

```typescript
export function activate(context: vscode.ExtensionContext) {
  // This runs when VS Code loads your extension
  // Similar to Rails initializers
}
```

**What happens:**

1. **Create SlackApi instance** (like initializing a service)
   ```typescript
   const slackApi = new SlackApi()
   ```

2. **Register commands** (like Rails routes)
   ```typescript
   vscode.commands.registerCommand("slackoscope.toggleInlineMessage", async () => {
     // Command handler
   })
   ```

3. **Register hover provider** (like a Rails controller action)
   ```typescript
   vscode.languages.registerHoverProvider("*", {
     async provideHover(document, position) {
       // Show message when hovering over URL
     }
   })
   ```

### 2. Fetching Slack Messages (`slackApi.ts`)

This is like a Rails **service object** that handles API calls:

```typescript
export class SlackApi {
  private readonly token: string

  constructor() {
    // Get Slack token from VS Code settings
    this.token = vscode.workspace.getConfiguration("slackoscope").get<string>("token") ?? ""
  }

  async getMessageContent(url: string): Promise<string> {
    // Parse URL to extract channel ID and timestamp
    const { channel, ts } = this.parseSlackUrl(url)

    // Make API request (like HTTParty.post in Rails)
    const res = await fetch("https://slack.com/api/conversations.history", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: params
    })

    // Parse response
    const data = await res.json()
    return data.messages[0].text
  }
}
```

**Rails equivalent:**
```ruby
class SlackApi
  def initialize
    @token = ENV['SLACK_TOKEN']
  end

  def get_message_content(url)
    channel, ts = parse_slack_url(url)

    response = HTTParty.post(
      "https://slack.com/api/conversations.history",
      headers: { "Authorization" => "Bearer #{@token}" },
      body: { channel: channel, latest: ts, inclusive: "true", limit: "1" }
    )

    JSON.parse(response.body)["messages"][0]["text"]
  end
end
```

### 3. Caching (`extension.ts`)

Simple in-memory cache using JavaScript's `Map`:

```typescript
const messageCache = new Map<string, string>()
// Like: cache = {} in Ruby, but with type safety

// Store:
messageCache.set(url, messageContent)
// Like: cache[url] = message_content

// Retrieve:
const content = messageCache.get(url)
// Like: content = cache[url]
```

**Rails equivalent:**
```ruby
@message_cache = {}

# Store
@message_cache[url] = message_content

# Retrieve
content = @message_cache[url]
```

### 4. Inline Decorations (`inlineDecorationManager.ts`)

This manages showing messages next to URLs in the editor.

**Think of it like:**
- Rails: Adding inline comments to rendered HTML
- VS Code: Adding virtual text next to code without modifying the file

```typescript
class InlineDecorationManager {
  private isActive = false  // Like an instance variable: @is_active

  async toggle(editor: vscode.TextEditor | undefined): Promise<boolean> {
    if (this.isActive) {
      this.disable(editor)
    } else {
      await this.enable(editor)
    }
  }

  private async enable(editor: vscode.TextEditor): Promise<void> {
    // Find all Slack URLs in the document
    const decorations = await this.findSlackUrlDecorations(editor.document)

    // Apply decorations (show messages inline)
    editor.setDecorations(this.decorationType, decorations)
  }
}
```

---

## Development Workflow

### 1. Install Dependencies

```bash
npm install
```

**What it does:** Downloads packages from npm registry (like `bundle install`)

### 2. Start Development Mode

```bash
npm run watch
```

**What it does:**
- Compiles TypeScript to JavaScript
- Watches for file changes
- Auto-recompiles when you save

**Rails equivalent:** `rails server` in development mode

### 3. Launch the Extension

Press **F5** in VS Code (or go to Run → Start Debugging)

**What happens:**
1. Builds the extension
2. Opens a new VS Code window with your extension loaded
3. You can test it in this window

**Rails equivalent:** Opening `http://localhost:3000` after starting the server

### 4. Make Changes and Test

1. Edit a `.ts` file
2. Save it (auto-compiles via `npm run watch`)
3. In the Extension Development window, press **Ctrl+R** (Cmd+R on Mac) to reload
4. Test your changes

**Rails equivalent:** Edit a controller, refresh the browser

### 5. Debug

- Set breakpoints in `.ts` files
- View console output in Debug Console
- Inspect variables

**Rails equivalent:** Using `binding.pry` or Rails logger

---

## Common Patterns Explained

### Pattern 1: Disposables (Resource Cleanup)

```typescript
context.subscriptions.push(disposable)
```

**What it does:** Ensures cleanup when extension is deactivated

**Rails equivalent:**
```ruby
# Like Rails' around_action or ensure block
def some_action
  resource = acquire_resource
  yield
ensure
  resource.cleanup
end
```

### Pattern 2: Optional Chaining (`?.`)

```typescript
const text = messages?.[0]?.text
```

**What it does:** Safely access nested properties, returns `undefined` if any part is null/undefined

**Rails equivalent:**
```ruby
text = messages&.[](0)&.text
# Or: text = messages.try(:[], 0).try(:text)
```

### Pattern 3: Nullish Coalescing (`??`)

```typescript
const token = config.get<string>("token") ?? ""
```

**What it does:** Use right side if left side is `null` or `undefined`

**Rails equivalent:**
```ruby
token = config.get("token") || ""
```

### Pattern 4: Template Literals

```typescript
const message = `Hello, ${name}!`
```

**Rails equivalent:**
```ruby
message = "Hello, #{name}!"
```

### Pattern 5: Destructuring

```typescript
const { channel, ts } = this.parseSlackUrl(url)
```

**What it does:** Extract multiple values from an object

**Rails equivalent:**
```ruby
result = parse_slack_url(url)
channel = result[:channel]
ts = result[:ts]

# Or with Ruby 3.1+:
channel, ts = parse_slack_url(url).values_at(:channel, :ts)
```

### Pattern 6: Array Methods

```typescript
// map (same as Ruby)
const numbers = [1, 2, 3]
const doubled = numbers.map(n => n * 2)  // [2, 4, 6]

// filter (like Ruby's select)
const evens = numbers.filter(n => n % 2 === 0)  // [2]

// forEach (like Ruby's each)
numbers.forEach(n => console.log(n))
```

---

## Testing

### Running Tests

```bash
npm test
```

**What it does:**
- Compiles test files
- Launches headless VS Code
- Runs Mocha tests
- Exits with status code

### Test Structure

```typescript
import * as assert from "assert"

suite("My Test Suite", () => {
  test("should do something", () => {
    const result = myFunction()
    assert.strictEqual(result, expectedValue)
  })
})
```

**Rails equivalent:**
```ruby
RSpec.describe "My Test Suite" do
  it "should do something" do
    result = my_function
    expect(result).to eq(expected_value)
  end
end
```

---

## Key Takeaways for Rails Developers

1. **TypeScript = Ruby with types** - Same object-oriented principles, but with compile-time type checking

2. **async/await = cleaner callbacks** - JavaScript is single-threaded, so async is everywhere

3. **Build step required** - Unlike Ruby, you must compile TypeScript to JavaScript

4. **Explicit imports/exports** - Unlike Ruby's global namespace after require

5. **VS Code Extension API ≈ Rails Engine** - Plugin system with lifecycle hooks

6. **npm ≈ bundler** - Package management and scripts

7. **Strong typing helps** - Catches bugs before runtime (like having RSpec built into the language)

---

## Next Steps

1. **Read the annotated source files** - Every file has detailed comments explaining TypeScript concepts
2. **Try modifying the code** - Change the hover message format, add new commands
3. **Run the tests** - See how testing works in TypeScript
4. **Read VS Code Extension docs** - https://code.visualstudio.com/api

---

## Questions You Might Have

**Q: Do I need to restart VS Code when I make changes?**
A: No! Just reload the Extension Development Host window (Ctrl+R / Cmd+R)

**Q: Where do console.log statements appear?**
A: In the Debug Console of your main VS Code window (not the Extension Development Host)

**Q: Why do some files have `export` and others don't?**
A: Only things with `export` can be imported by other files (unlike Ruby where everything is available after require)

**Q: What's the `?` after type names like `string?`**
A: Makes the field optional (can be `undefined`)

**Q: What's `Promise<string>` mean?**
A: A promise that will eventually give you a string (like a future value)

**Q: Why `const` instead of `let` or `var`?**
A: `const` prevents reassignment (like Ruby's frozen strings), `let` allows reassignment, `var` is old and shouldn't be used

---

**Happy coding! 🚀**

If you get stuck, check the annotated source files - they explain every concept in detail.
