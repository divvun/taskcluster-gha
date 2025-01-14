// Re-export types
import type {
  Context,
  CopyOptions,
  ExecListeners,
  ExecOptions,
  GlobOptions,
  Globber,
  InputOptions,
} from "./builder/gha"

const isTaskcluster = process.env.TASKCLUSTER_ROOT_URL
const isBuildkite = process.env.BUILDKITE
export let isGHA = !!isTaskcluster

// Ensure we get the proper types from the implementations
let selectedBuilder: typeof import("./builder/gha")
export let mode: string

if (isBuildkite) {
  selectedBuilder = require("./builder/buildkite")
  mode = "buildkite"
} else if (isTaskcluster) {
  selectedBuilder = require("./builder/gha")
  mode = "taskcluster"
} else {
  selectedBuilder = require("./builder/local")
  mode = "local"
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
  createArtifact,
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
