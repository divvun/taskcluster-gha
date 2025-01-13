// Re-export types
import type {
  Context,
  CopyOptions,
  ExecListeners,
  ExecOptions,
  GlobOptions,
  Globber,
  InputOptions,
} from "./gha-builder"

const isDivvunCI = process.env.DIVVUN_CI
export let isGHA = false

// Ensure we get the proper types from the implementations
let selectedBuilder: typeof import("./gha-builder")

if (isDivvunCI) {
  selectedBuilder = require("./bk-builder")
} else {
  isGHA = true
  selectedBuilder = require("./gha-builder")
}

// Re-export everything with proper typing
export const {
  debug,
  setFailed,
  error,
  exec,
  addPath,
  downloadTool,
  extractZip,
  extractTar,
  cp,
  globber,
  setSecret,
  getInput,
  setOutput,
  startGroup,
  endGroup,
  warning,
  exportVariable,
  context,
} = selectedBuilder

// Re-export types
export type {
  Context, CopyOptions, ExecListeners,
  ExecOptions, GlobOptions,
  Globber,
  InputOptions
}

