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

const isTaskcluster = process.env.TASKCLUSTER_ROOT_URL
const isBuildkite = process.env.BUILDKITE
export let isGHA = !!isTaskcluster

// Ensure we get the proper types from the implementations
let selectedBuilder: typeof import("./gha-builder")

if (isBuildkite) {
  selectedBuilder = require("./bk-builder")
} else if (isTaskcluster) {
  selectedBuilder = require("./gha-builder")
} else {
  selectedBuilder = require("./local-builder")
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
  secrets,
  tempDir,
} = selectedBuilder

// Re-export types
export type {
  Context,
  CopyOptions,
  ExecListeners,
  ExecOptions,
  GlobOptions,
  Globber,
  InputOptions,
}
