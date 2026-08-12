/**
 * Points `require("vscode")` at the in-memory stub.
 *
 * There is no `vscode` package on disk — the extension host injects it at runtime,
 * which is why importing it outside VS Code normally throws. Intercepting the module
 * loader is the same trick `proxyquire` and friends use, and it is what lets the unit
 * suite exercise `src/vscode/**` in plain mocha.
 *
 * Loaded via mocha's `--require`, so it is in place before any test file is read.
 */

import * as nodeModule from "module"
import * as vscodeStub from "./vscode"

type ModuleLoader = (request: string, parent: unknown, isMain: boolean) => unknown

const loader = nodeModule.Module as unknown as {_load: ModuleLoader}
const loadFromDisk = loader._load

loader._load = function (request, parent, isMain) {
  if (request === "vscode") return vscodeStub
  return loadFromDisk.call(this, request, parent, isMain)
}
