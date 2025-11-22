# tsconfig.json - Complete Guide for Rails Developers

This file configures the TypeScript compiler. Think of it like a combination of `.ruby-version`, `rubocop.yml`, and compiler flags all in one file.

## Overview

In Rails, you might have:
- `.ruby-version`: Specifies Ruby version
- `.rubocop.yml`: Code style rules
- `.yardopts`: Documentation settings

In TypeScript, `tsconfig.json` does ALL of this:
- Specifies language version/features
- Enables type checking rules
- Configures compilation output
- Sets up file inclusion/exclusion

---

## Full Annotated tsconfig.json

```json
{
  "compilerOptions": {
    // ==========================================================================
    // MODULE SYSTEM (How imports/exports work)
    // ==========================================================================

    "module": "Node16",
    // Module system to use when generating JavaScript
    //
    // OPTIONS:
    // - "CommonJS": Old Node.js style (require/module.exports)
    // - "ES6"/"ES2015": Modern JavaScript (import/export)
    // - "Node16"/"NodeNext": Modern Node.js (supports both)
    //
    // "Node16" means:
    // - Use Node.js 16+ module resolution
    // - Support both CommonJS and ESM
    // - Automatically choose based on package.json "type" field
    //
    // Rails equivalent:
    //   Like choosing: require vs load vs import
    //   But TypeScript/Node has multiple module systems
    //
    // WHY Node16?
    // - VS Code extensions run in Node.js
    // - Node16 is the modern, recommended setting
    // - Works with both old and new module styles

    "target": "ES2022",
    // JavaScript version to compile TO
    //
    // OPTIONS:
    // - "ES5": Old JavaScript (IE11 compatible)
    // - "ES6"/"ES2015": Modern JavaScript (2015)
    // - "ES2020": JavaScript 2020 features
    // - "ES2022": JavaScript 2022 features (latest stable)
    // - "ESNext": Latest experimental features
    //
    // "ES2022" means:
    // - Output JavaScript with 2022 features
    // - Node.js 18+ supports these features
    // - Includes: async/await, classes, arrow functions, etc.
    //
    // Rails equivalent:
    //   Like: ruby_version = "3.0" in .ruby-version
    //   But instead of Ruby interpreter version, it's output JS version
    //
    // WHY ES2022?
    // - Node.js 18 (used by VS Code) fully supports it
    // - Modern features without experimental instability
    // - Good balance of features and compatibility

    "lib": [
      "ES5",
      "ES2022"
    ],
    // Type definitions for built-in JavaScript APIs
    //
    // "ES5": Basic JavaScript APIs (Array, Object, String, etc.)
    // "ES2022": Modern APIs (Promise, async/await, Map, Set, etc.)
    //
    // Rails equivalent:
    //   Like: having Ruby stdlib documentation
    //   Or: require 'set' to get Set class
    //
    // WHY BOTH?
    // - ES5: Foundation (arrays, objects, strings)
    // - ES2022: Modern features (promises, async, etc.)
    //
    // NOTE: This is about TYPE DEFINITIONS, not runtime
    // - Tells TypeScript what APIs exist
    // - Doesn't include the actual code (Node.js provides that)
    //
    // Other lib options you might see:
    // - "DOM": Browser APIs (document, window, etc.)
    // - "WebWorker": Web Worker APIs
    // We DON'T include these because VS Code extensions run in Node, not browser

    "sourceMap": true,
    // Generate .map files for debugging
    //
    // Source maps link compiled JavaScript back to TypeScript source
    // When you set breakpoints, they work in the .ts file (not .js)
    //
    // Rails equivalent:
    //   Like: Rails development mode showing code in stack traces
    //   Instead of showing compiled code, shows original source
    //
    // Generated files:
    // - dist/extension.js (compiled code)
    // - dist/extension.js.map (source map)
    //
    // WHY true?
    // - Better debugging experience
    // - See TypeScript code in debugger (not compiled JavaScript)
    // - Minimal cost (map files are separate)
    //
    // Production builds (npm run package) disable this for smaller size

    "rootDir": "src",
    // Root directory of TypeScript source files
    //
    // Like: Rails app/ directory (where code lives)
    //
    // This affects output structure:
    // - src/extension.ts → dist/extension.js
    // - src/test/foo.ts → dist/test/foo.js
    //
    // WHY "src"?
    // - All TypeScript source is in src/
    // - Keeps output structure clean
    // - Matches common convention
    //
    // Without rootDir:
    // - TypeScript would preserve full path structure
    // - More complex output directory layout

    "strict": true,
    // Enable ALL strict type checking options
    //
    // This is like: rubocop --strict-mode (but for types)
    //
    // Enables:
    // - strictNullChecks: Can't use null/undefined without checking
    // - strictFunctionTypes: Stricter function parameter types
    // - strictBindCallApply: Type-check .bind(), .call(), .apply()
    // - strictPropertyInitialization: Properties must be initialized
    // - noImplicitAny: Must specify types, can't be "any"
    // - noImplicitThis: "this" must have explicit type
    // - alwaysStrict: Use JavaScript "use strict" mode
    //
    // Rails equivalent:
    //   Like: frozen_string_literal: true
    //   Or: RuboCop with all cops enabled
    //
    // WHY true?
    // - Catches more bugs at compile time
    // - Forces better code practices
    // - Prevents common mistakes (null errors, type mismatches)
    //
    // Example with strict: true
    //   ✗ function greet(name) { }  // Error: name implicitly has 'any' type
    //   ✓ function greet(name: string) { }  // OK
    //
    //   ✗ let x: string = null  // Error: can't assign null to string
    //   ✓ let x: string | null = null  // OK (explicitly allow null)

    "noEmit": true,
    // Don't generate JavaScript files
    //
    // WHY?
    // - We use esbuild to compile (not tsc)
    // - tsc is only used for type checking
    // - esbuild is MUCH faster for compilation
    //
    // Rails equivalent:
    //   Like: rubocop (checks code, doesn't run it)
    //   Or: ruby -c (syntax check, doesn't execute)
    //
    // Commands:
    // - tsc --noEmit: Type check only, no output
    // - node esbuild.js: Actually compile code
    //
    // WORKFLOW:
    // 1. tsc checks types (fast, no output)
    // 2. esbuild compiles code (fast, no type checking)
    // 3. Best of both: type safety + fast builds
    //
    // Alternative approach (we DON'T use):
    // - noEmit: false
    // - tsc compiles everything (slower but simpler)

    "skipLibCheck": true
    // Skip type checking of .d.ts files (type definition files)
    //
    // .d.ts files are like: Ruby stubs or documentation
    // They describe types for external libraries
    //
    // Rails equivalent:
    //   Like: skipping RuboCop for gems in vendor/bundle
    //   You trust the gems are correct
    //
    // WHY true?
    // - Faster compilation (don't check node_modules)
    // - Avoid errors in third-party type definitions
    // - We only care about OUR code's types
    //
    // What gets skipped:
    // - node_modules/@types/vscode/index.d.ts
    // - node_modules/@types/node/index.d.ts
    // - Other library type definitions
    //
    // What still gets checked:
    // - Your source code (src/**/*.ts)
    // - Your test code (src/test/**/*.ts)
    //
    // Performance impact:
    // - skipLibCheck: false → 5-10 seconds to type check
    // - skipLibCheck: true → 1-2 seconds to type check
  },

  // ============================================================================
  // FILE INCLUSION/EXCLUSION
  // ============================================================================

  "include": ["src"],
  // Directories/files to include in compilation
  //
  // Like: Rails autoload_paths
  // Or: RSpec spec_helper that loads spec/**/*_spec.rb
  //
  // ["src"] means:
  // - Include all .ts files in src/ and subdirectories
  // - Matches: src/extension.ts, src/test/foo.ts, etc.
  //
  // Default if not specified:
  // - All .ts, .tsx, .d.ts files in project
  //
  // WHY ["src"]?
  // - Our source code is only in src/
  // - Don't include node_modules, dist, etc.
  // - Explicit is better than implicit
  //
  // Multiple patterns:
  //   "include": ["src", "scripts"]  // Include both directories

  "exclude": ["node_modules", "dist", "src/test"]
  // Directories/files to exclude from compilation
  //
  // Like: Rails .gitignore or RuboCop exclude
  //
  // "node_modules": Dependencies (don't compile these)
  // "dist": Output directory (don't compile output)
  // "src/test": Test files (compiled separately with tsconfig.test.json)
  //
  // Rails equivalent:
  //   Like: RuboCop AllCops: Exclude: ['vendor/**/*']
  //
  // WHY EXCLUDE THESE?
  //
  // node_modules:
  // - Already compiled JavaScript
  // - Huge (thousands of files)
  // - Slows down type checking
  //
  // dist:
  // - Output directory
  // - Would create circular issues
  // - Not source code
  //
  // src/test:
  // - Tests have different tsconfig (tsconfig.test.json)
  // - Tests need different compiler options
  // - Tests include Mocha types
  //
  // Default excludes (even if not specified):
  // - node_modules
  // - bower_components
  // - jspm_packages
  //
  // When to add more excludes:
  // - Large generated files
  // - Third-party code
  // - Build artifacts
}
```

---

## Common Compiler Options Reference

Here are other options you might see in TypeScript projects:

### Strict Type Checking (Our project uses all of these via "strict": true)

```json
{
  "strictNullChecks": true,
  // Can't use null/undefined without explicit checks
  // ✗ let x: string = null
  // ✓ let x: string | null = null

  "noImplicitAny": true,
  // Must specify types, can't infer 'any'
  // ✗ function add(a, b) { }
  // ✓ function add(a: number, b: number) { }

  "strictFunctionTypes": true,
  // Stricter checking of function parameters
  // Prevents parameter type mismatches

  "noImplicitThis": true,
  // 'this' must have explicit type in functions
  // Prevents common 'this' binding errors
}
```

### Additional Type Checking (Not in our project, but useful)

```json
{
  "noUnusedLocals": true,
  // Error on unused local variables
  // Like: RuboCop Lint/UselessAssignment

  "noUnusedParameters": true,
  // Error on unused function parameters
  // Like: RuboCop Lint/UnusedMethodArgument

  "noImplicitReturns": true,
  // All code paths must return a value
  // Prevents accidental undefined returns

  "noFallthroughCasesInSwitch": true,
  // Prevent fallthrough in switch statements
  // Like: Ruby case without explicit next
}
```

### Module Resolution

```json
{
  "moduleResolution": "node",
  // How to resolve module imports
  // "node": Use Node.js resolution algorithm
  // "classic": Legacy TypeScript resolution

  "esModuleInterop": true,
  // Better compatibility with CommonJS modules
  // Allows: import express from "express"
  // Instead of: import * as express from "express"

  "resolveJsonModule": true,
  // Allow importing .json files
  // Useful for: import config from "./config.json"
}
```

---

## Rails Equivalent Concepts

| TypeScript | Rails | Purpose |
|------------|-------|---------|
| `strict: true` | RuboCop strict mode | Enforce best practices |
| `target: ES2022` | `.ruby-version` | Language version |
| `lib: ["ES2022"]` | Ruby stdlib | Available APIs |
| `include: ["src"]` | `autoload_paths` | Files to process |
| `exclude: ["node_modules"]` | RuboCop `Exclude` | Files to skip |
| `sourceMap: true` | Rails stack traces | Debugging info |
| `noEmit: true` | `ruby -c` | Check without running |
| `module: Node16` | `require` vs `load` | Import system |

---

## Multiple tsconfig Files

This project has TWO tsconfig files:

### 1. `tsconfig.json` (Main Config)
- Used for: Source code compilation
- Excludes: Tests
- Purpose: Type checking and compilation

### 2. `tsconfig.test.json` (Test Config)
- Used for: Test compilation
- Includes: Tests
- Extends: tsconfig.json
- Additional: Mocha types

Rails equivalent:
```ruby
# Like having different RuboCop configs
.rubocop.yml              # Main config
.rubocop_spec.yml         # Spec-specific config
```

### Example tsconfig.test.json:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "out",
    "noEmit": false,
    "types": ["mocha"]
  },
  "include": ["src/test"]
}
```

---

## Common Issues and Solutions

### Issue: "Cannot find module 'vscode'"

**Solution**: Install types:
```bash
npm install --save-dev @types/vscode
```

Rails equivalent: Missing gem in Gemfile

### Issue: "Implicit any type"

**Solution**: Add type annotations:
```typescript
// ✗ Bad
function greet(name) { }

// ✓ Good
function greet(name: string) { }
```

Rails equivalent: RuboCop requiring types with Sorbet/RBS

### Issue: "Property might be undefined"

**Solution**: Check for undefined:
```typescript
// ✗ Bad
const user = getUser()
console.log(user.name)

// ✓ Good
const user = getUser()
if (user) {
  console.log(user.name)
}
```

Rails equivalent: RuboCop Lint/SafeNavigationChain

---

## Commands Using tsconfig.json

```bash
# Type check using tsconfig.json
npm run check-types
# Runs: tsc --noEmit

# Watch mode (auto type-check on changes)
npm run watch
# Runs: tsc --noEmit --watch

# Type check tests using tsconfig.test.json
npm run compile-tests
# Runs: tsc -p tsconfig.test.json
```

---

## When to Modify tsconfig.json

**Add to lib:**
```json
"lib": ["ES5", "ES2022", "DOM"]
```
If you need browser APIs (window, document, etc.)

**Change target:**
```json
"target": "ES2020"
```
If targeting older Node.js versions

**Add paths:**
```json
"paths": {
  "@/*": ["src/*"]
}
```
For import aliases (e.g., `import { Foo } from "@/foo"`)

**Disable source maps:**
```json
"sourceMap": false
```
For smaller production builds

---

## Key Takeaways

1. **tsconfig.json = TypeScript compiler configuration**
   - Like: .ruby-version + rubocop.yml combined
   - Controls type checking and compilation

2. **strict: true = Recommended**
   - Catches more bugs
   - Better type safety
   - Slight learning curve

3. **noEmit: true + esbuild = Fast builds**
   - tsc for type checking
   - esbuild for compilation
   - Best of both worlds

4. **sourceMap: true = Better debugging**
   - Debug TypeScript (not JavaScript)
   - See original code in stack traces

5. **Multiple configs = Different contexts**
   - tsconfig.json: Main code
   - tsconfig.test.json: Tests
   - Separation of concerns

---

**Next Steps:**
1. Run `npm run check-types` to see TypeScript in action
2. Try adding a type error to see strict mode catch it
3. Read the TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
