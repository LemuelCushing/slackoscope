---
id: task-15
title: 'Investigate possibility of silent background tests, i.e. headlessly'
status: Done
assignee: []
created_date: '2026-01-21 10:26'
updated_date: '2026-01-21 15:19'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate possibility of silent background tests, i.e. headlessly
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Investigation Results: NOT FEASIBLE ON MACOS

Investigated running `@vscode/test-electron` tests in true headless mode (no visible window, no focus stealing) on macOS.

### Finding: Impossible on macOS

**Root Cause**: 
- `@vscode/test-electron` uses Electron, which requires a real window
- Electron hardcodes `activateIgnoringOtherApps:YES` on macOS (see [Electron issue #30904](https://github.com/electron/electron/issues/30904))
- macOS has no equivalent to Linux's `xvfb-run` virtual framebuffer
- This is a framework limitation, not a configuration issue

### Workarounds Investigated

1. **Mocha reporter options** - Only affects console output verbosity, not window behavior
2. **Electron launch arguments** - No flags exist to suppress window creation or focus stealing
3. **macOS LSUIElement** - Would require modifying VS Code's Info.plist, not feasible
4. **CHROME_HEADLESS env var** - Only affects Chromium, not Electron
5. **Docker with Linux + xvfb-run** - Possible but changes test environment from macOS to Linux

### Documentation

- [VS Code CI Testing Guide](https://code.visualstudio.com/api/working-with-extensions/continuous-integration) - Confirms xvfb required on Linux, no macOS solution
- [Electron Testing on Headless CI](https://electronjs.org/docs/tutorial/testing-on-headless-ci) - Notes Electron requires display driver
- [Electron Feature Request #29164](https://github.com/electron/electron/issues/29164) - Native headless mode doesn't exist

### Conclusion

Tests will always open a visible VS Code window and steal focus on macOS. This is a fundamental Electron limitation. Use alternatives like Docker+Linux if true headless testing is required.
<!-- SECTION:NOTES:END -->
